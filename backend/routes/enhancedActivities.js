import express from 'express';
import { PrismaClient } from '@prisma/client';
import { generateActivityContent, generateFallbackContent } from '../lib/enhancedActivityGeneration.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/enhanced-activities/:planId/:dayIndex
// Fetch activity content for a specific plan and day
router.get('/:planId/:dayIndex', authenticate, async (req, res) => {
  try {
    const { planId, dayIndex } = req.params;
    const studentId = req.user.studentId;

    // Validate parameters
    if (!planId || !dayIndex) {
      return res.status(400).json({ error: 'Plan ID and day index are required' });
    }

    const dayIndexNum = parseInt(dayIndex);
    if (isNaN(dayIndexNum) || dayIndexNum < 1 || dayIndexNum > 3) {
      return res.status(400).json({ error: 'Day index must be 1, 2, or 3' });
    }

    // Get the plan and verify student access
    const plan = await prisma.plan3.findFirst({
      where: {
        id: planId,
        studentId: studentId
      },
      include: {
        student: true,
        story: true
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found or access denied' });
    }

    // Get student age for content generation
    const studentAge = calculateStudentAge(plan.student.birthday);

    // Get or generate activity content for all activity types
    const activityTypes = ['who', 'where', 'sequence', 'main-idea', 'vocabulary', 'predict'];
    const activities = {};

    for (const activityType of activityTypes) {
      try {
        // Check if content exists in database
        let activityContent = await prisma.activityContent.findUnique({
          where: {
            plan3Id_dayIndex_activityType: {
              plan3Id: planId,
              dayIndex: dayIndexNum,
              activityType: activityType
            }
          }
        });

        // If no content exists or it's expired, generate new content
        if (!activityContent || (activityContent.expiresAt && activityContent.expiresAt < new Date())) {
          // Get the appropriate story part based on day index
          const storyPart = getStoryPart(plan.story, dayIndexNum);
          
          // Generate new content
          const generatedContent = await generateActivityContent(storyPart, studentAge, activityType);
          
          // Save to database
          activityContent = await prisma.activityContent.upsert({
            where: {
              plan3Id_dayIndex_activityType: {
                plan3Id: planId,
                dayIndex: dayIndexNum,
                activityType: activityType
              }
            },
            update: {
              content: generatedContent,
              studentAge: studentAge,
              contentHash: generateContentHash(generatedContent),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
              updatedAt: new Date()
            },
            create: {
              plan3Id: planId,
              dayIndex: dayIndexNum,
              activityType: activityType,
              content: generatedContent,
              studentAge: studentAge,
              contentHash: generateContentHash(generatedContent),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
              id: undefined // Let Prisma generate the ID
            }
          });
        }

        activities[activityType] = activityContent.content;
      } catch (error) {
        console.error(`Error generating content for ${activityType}:`, error);
        // Return fallback content if generation fails
        activities[activityType] = generateFallbackContent(activityType, studentAge);
      }
    }

    // Get existing progress for this day
    const progress = await prisma.activityProgress.findMany({
      where: {
        studentId: studentId,
        plan3Id: planId,
        dayIndex: dayIndexNum
      }
    });

    const progressMap = {};
    progress.forEach(p => {
      progressMap[p.activityType] = {
        status: p.status,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
        timeSpent: p.timeSpent,
        attempts: p.attempts
      };
    });

    res.json({
      planId,
      dayIndex: dayIndexNum,
      activities,
      progress: progressMap,
      studentAge
    });

  } catch (error) {
    console.error('Error fetching enhanced activities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/enhanced-activities/progress
// Save student progress for activities
router.post('/progress', authenticate, async (req, res) => {
  try {
    const { planId, dayIndex, activityType, status, timeSpent, answers } = req.body;
    const studentId = req.user.studentId;

    // Validate required fields
    if (!planId || !dayIndex || !activityType || !status) {
      return res.status(400).json({ error: 'Plan ID, day index, activity type, and status are required' });
    }

    const dayIndexNum = parseInt(dayIndex);
    if (isNaN(dayIndexNum) || dayIndexNum < 1 || dayIndexNum > 3) {
      return res.status(400).json({ error: 'Day index must be 1, 2, or 3' });
    }

    // Validate activity type
    const validActivityTypes = ['who', 'where', 'sequence', 'main-idea', 'vocabulary', 'predict'];
    if (!validActivityTypes.includes(activityType)) {
      return res.status(400).json({ error: 'Invalid activity type' });
    }

    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify plan access
    const plan = await prisma.plan3.findFirst({
      where: {
        id: planId,
        studentId: studentId
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found or access denied' });
    }

    // Update or create progress record
    const progress = await prisma.activityProgress.upsert({
      where: {
        studentId_plan3Id_dayIndex_activityType: {
          studentId: studentId,
          plan3Id: planId,
          dayIndex: dayIndexNum,
          activityType: activityType
        }
      },
      update: {
        status: status,
        timeSpent: timeSpent || undefined,
        attempts: {
          increment: status === 'completed' ? 1 : 0
        },
        startedAt: status === 'in_progress' ? new Date() : undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
        updatedAt: new Date()
      },
      create: {
        studentId: studentId,
        plan3Id: planId,
        dayIndex: dayIndexNum,
        activityType: activityType,
        status: status,
        timeSpent: timeSpent || undefined,
        startedAt: status === 'in_progress' ? new Date() : undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
        id: undefined // Let Prisma generate the ID
      }
    });

    // If answers are provided, save them as responses
    if (answers && Array.isArray(answers)) {
      const responses = [];
      
      for (const answer of answers) {
        if (answer.question && answer.answer !== undefined) {
          const response = await prisma.activityResponse.create({
            data: {
              progressId: progress.id,
              question: answer.question,
              answer: answer.answer,
              isCorrect: answer.isCorrect || null,
              feedback: answer.feedback || null,
              score: answer.score || null,
              timeSpent: answer.timeSpent || null,
              id: undefined // Let Prisma generate the ID
            }
          });
          responses.push(response);
        }
      }
    }

    res.json({
      success: true,
      progress: {
        id: progress.id,
        status: progress.status,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        timeSpent: progress.timeSpent,
        attempts: progress.attempts
      }
    });

  } catch (error) {
    console.error('Error saving activity progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/enhanced-activities/progress/:studentId/:planId/:dayIndex
// Get progress for a specific student, plan, and day
router.get('/progress/:studentId/:planId/:dayIndex', authenticate, async (req, res) => {
  try {
    const { studentId, planId, dayIndex } = req.params;
    const requestingStudentId = req.user.studentId;

    // Validate parameters
    if (!studentId || !planId || !dayIndex) {
      return res.status(400).json({ error: 'Student ID, plan ID, and day index are required' });
    }

    // Verify the requesting user can access this student's data
    if (parseInt(studentId) !== requestingStudentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const dayIndexNum = parseInt(dayIndex);
    if (isNaN(dayIndexNum) || dayIndexNum < 1 || dayIndexNum > 3) {
      return res.status(400).json({ error: 'Day index must be 1, 2, or 3' });
    }

    // Get progress for all activity types
    const progress = await prisma.activityProgress.findMany({
      where: {
        studentId: parseInt(studentId),
        plan3Id: planId,
        dayIndex: dayIndexNum
      },
      include: {
        responses: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    // Format the response
    const progressMap = {};
    progress.forEach(p => {
      progressMap[p.activityType] = {
        status: p.status,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
        timeSpent: p.timeSpent,
        attempts: p.attempts,
        responses: p.responses.map(r => ({
          id: r.id,
          question: r.question,
          answer: r.answer,
          isCorrect: r.isCorrect,
          feedback: r.feedback,
          score: r.score,
          timeSpent: r.timeSpent,
          createdAt: r.createdAt
        }))
      };
    });

    res.json({
      studentId: parseInt(studentId),
      planId,
      dayIndex: dayIndexNum,
      progress: progressMap
    });

  } catch (error) {
    console.error('Error fetching activity progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/enhanced-activities/regenerate/:planId/:dayIndex/:activityType
// Regenerate content for a specific activity type
router.post('/regenerate/:planId/:dayIndex/:activityType', authenticate, async (req, res) => {
  try {
    const { planId, dayIndex, activityType } = req.params;
    const studentId = req.user.studentId;

    // Validate parameters
    if (!planId || !dayIndex || !activityType) {
      return res.status(400).json({ error: 'Plan ID, day index, and activity type are required' });
    }

    const dayIndexNum = parseInt(dayIndex);
    if (isNaN(dayIndexNum) || dayIndexNum < 1 || dayIndexNum > 3) {
      return res.status(400).json({ error: 'Day index must be 1, 2, or 3' });
    }

    // Validate activity type
    const validActivityTypes = ['who', 'where', 'sequence', 'main-idea', 'vocabulary', 'predict'];
    if (!validActivityTypes.includes(activityType)) {
      return res.status(400).json({ error: 'Invalid activity type' });
    }

    // Get the plan and verify student access
    const plan = await prisma.plan3.findFirst({
      where: {
        id: planId,
        studentId: studentId
      },
      include: {
        student: true,
        story: true
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found or access denied' });
    }

    // Get student age
    const studentAge = calculateStudentAge(plan.student.birthday);

    // Get the appropriate story part
    const storyPart = getStoryPart(plan.story, dayIndexNum);

    // Generate new content
    const generatedContent = await generateActivityContent(storyPart, studentAge, activityType);

    // Update the database
    const updatedContent = await prisma.activityContent.upsert({
      where: {
        plan3Id_dayIndex_activityType: {
          plan3Id: planId,
          dayIndex: dayIndexNum,
          activityType: activityType
        }
      },
      update: {
        content: generatedContent,
        contentHash: generateContentHash(generatedContent),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        updatedAt: new Date()
      },
      create: {
        plan3Id: planId,
        dayIndex: dayIndexNum,
        activityType: activityType,
        content: generatedContent,
        studentAge: studentAge,
        contentHash: generateContentHash(generatedContent),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        id: undefined // Let Prisma generate the ID
      }
    });

    res.json({
      success: true,
      activityType,
      content: generatedContent,
      regeneratedAt: updatedContent.updatedAt
    });

  } catch (error) {
    console.error('Error regenerating activity content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function calculateStudentAge(birthday) {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return Math.max(5, Math.min(18, age)); // Clamp between 5 and 18
}

function getStoryPart(story, dayIndex) {
  switch (dayIndex) {
    case 1:
      return story.part1;
    case 2:
      return story.part2;
    case 3:
      return story.part3;
    default:
      return story.part1;
  }
}

function generateContentHash(content) {
  // Simple hash function for content
  const contentStr = JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < contentStr.length; i++) {
    const char = contentStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

export default router;
