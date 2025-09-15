import express from 'express';
import { PrismaClient } from '@prisma/client';
import { generateActivityContent, generateFallbackContent } from '../lib/enhancedActivityGeneration.js';
import { authenticate } from '../middleware/auth.js';

/**
 * Handles Day 1 completion - marks Day 1 as completed and unlocks Day 2
 * @param {string} planId - The plan ID
 * @param {number} dayIndex - The day index (should be 1)
 */
async function handleDay1Completion(planId, dayIndex) {
  try {
    console.log('🎉 Handling Day 1 completion:', { planId, dayIndex });

    // Mark Day 1 as completed
    await prisma.plan3Day.updateMany({
      where: {
        plan3Id: planId,
        index: 1
      },
      data: {
        state: 'complete',
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Unlock Day 2
    await prisma.plan3Day.updateMany({
      where: {
        plan3Id: planId,
        index: 2
      },
      data: {
        state: 'available',
        updatedAt: new Date()
      }
    });

    console.log('✅ Day 1 marked as completed and Day 2 unlocked');

  } catch (error) {
    console.error('❌ Error handling Day 1 completion:', error);
    // Don't throw - this is a completion operation that shouldn't break the main flow
  }
}

/**
 * Handles Day 2 completion - marks Day 2 as completed and unlocks Day 3
 * @param {string} planId - The plan ID
 * @param {number} dayIndex - The day index (should be 2)
 */
async function handleDay2Completion(planId, dayIndex) {
  try {
    console.log('🎉 Handling Day 2 completion:', { planId, dayIndex });

    // Mark Day 2 as completed
    await prisma.plan3Day.updateMany({
      where: {
        plan3Id: planId,
        index: 2
      },
      data: {
        state: 'complete',
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Unlock Day 3
    await prisma.plan3Day.updateMany({
      where: {
        plan3Id: planId,
        index: 3
      },
      data: {
        state: 'available',
        updatedAt: new Date()
      }
    });

    console.log('✅ Day 2 marked as completed and Day 3 unlocked');

  } catch (error) {
    console.error('❌ Error handling Day 2 completion:', error);
    // Don't throw - this is a completion operation that shouldn't break the main flow
  }
}

async function handleDay3Completion(planId, dayIndex) {
  try {
    console.log('🎉 Handling Day 3 completion:', { planId, dayIndex });
    
    // Mark Day 3 as completed
    await prisma.plan3Day.updateMany({
      where: {
        plan3Id: planId,
        index: 3
      },
      data: {
        state: 'complete',
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Day 3 marked as completed');
  } catch (error) {
    console.error('❌ Error handling Day 3 completion:', error);
    // Don't throw - this is a completion operation that shouldn't break the main flow
  }
}

/**
 * Syncs enhanced activity completion with legacy Plan3Day.answers field
 * @param {string} planId - The plan ID
 * @param {number} dayIndex - The day index (1-3)
 * @param {string} activityType - The activity type
 * @param {number} studentId - The student ID
 */
async function syncActivityCompletionWithLegacy(planId, dayIndex, activityType, studentId) {
  try {
    console.log('🔄 Syncing activity completion with legacy system:', {
      planId,
      dayIndex,
      activityType,
      studentId
    });

    // Get the current day
    const day = await prisma.plan3Day.findFirst({
      where: {
        plan3Id: planId,
        index: dayIndex
      }
    });

    if (!day) {
      console.warn('Day not found for sync:', { planId, dayIndex });
      return;
    }

    // Get the current answers or initialize empty object
    const currentAnswers = day.answers || {};

    // Get the latest response for this activity to extract the answer
    const latestResponse = await prisma.activityResponse.findFirst({
      where: {
        progress: {
          studentId: studentId,
          plan3Id: planId,
          dayIndex: dayIndex,
          activityType: activityType
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        progress: true
      }
    });

    if (!latestResponse) {
      console.warn('No response found for activity sync:', { activityType, studentId, planId, dayIndex });
      return;
    }

    // Transform the response to the legacy format based on activity type
    let legacyAnswer;
    switch (activityType) {
      case 'who':
        // For who activities, the answer should be an array of character names
        legacyAnswer = Array.isArray(latestResponse.answer) ? latestResponse.answer : [latestResponse.answer];
        break;
      case 'where':
        // For where activities, the answer should be a string
        legacyAnswer = latestResponse.answer;
        break;
      case 'sequence':
        // For sequence activities, the answer should be an array of ordered events
        legacyAnswer = Array.isArray(latestResponse.answer) ? latestResponse.answer : [latestResponse.answer];
        break;
      case 'main-idea':
        // For main-idea activities, the answer should be a string
        legacyAnswer = latestResponse.answer;
        break;
      case 'vocabulary':
        // For vocabulary activities, the answer should be an array of matches
        legacyAnswer = Array.isArray(latestResponse.answer) ? latestResponse.answer : [latestResponse.answer];
        break;
      case 'predict':
        // For predict activities, the answer should be the selected option index
        legacyAnswer = latestResponse.answer;
        break;
      default:
        console.warn('Unknown activity type for sync:', activityType);
        return;
    }

    // Update the answers object
    const updatedAnswers = {
      ...currentAnswers,
      [activityType]: legacyAnswer
    };

    // Update the day with the new answers
    await prisma.plan3Day.update({
      where: { id: day.id },
      data: {
        answers: updatedAnswers,
        updatedAt: new Date()
      }
    });

    console.log('✅ Successfully synced activity completion with legacy system:', {
      activityType,
      legacyAnswer,
      updatedAnswers
    });

    // If this is the Predict activity completion on Day 1, mark Day 1 as completed and unlock Day 2
    if (activityType === 'predict' && dayIndex === 1) {
      await handleDay1Completion(planId, dayIndex);
    }
    
    // If this is the Predict activity completion on Day 2, mark Day 2 as completed and unlock Day 3
    if (activityType === 'predict' && dayIndex === 2) {
      await handleDay2Completion(planId, dayIndex);
    }
    
    // If this is the Predict activity completion on Day 3, mark Day 3 as completed
    if (activityType === 'predict' && dayIndex === 3) {
      await handleDay3Completion(planId, dayIndex);
    }

  } catch (error) {
    console.error('❌ Error syncing activity completion with legacy system:', error);
    // Don't throw - this is a sync operation that shouldn't break the main flow
  }
}

/**
 * Transforms activity content to match frontend expectations
 * @param {string} activityType - The type of activity
 * @param {object} content - The raw content from AI generation
 * @returns {object} - Transformed content for frontend
 */
function transformActivityContent(activityType, content) {
  if (activityType === 'predict') {
    return {
      question: content.question,
      instructions: "Select the prediction that best fits the story events and character goals.",
      options: content.predictions.map(prediction => ({
        text: prediction.text,
        plausibilityScore: prediction.plausibilityScore,
        feedback: prediction.feedback
      }))
    };
  }
  
  // Return other activities as-is
  return content;
}

const router = express.Router();
const prisma = new PrismaClient();

// Health check endpoint for connection quality testing
router.head('/health', (req, res) => {
  res.status(200).end();
});

// Shared handler for fetching activity content for a specific plan and day
async function handleGetActivitiesByPlanDay(req, res) {
  try {
    const { planId, dayIndex } = req.params;
    const auth = req.user;

    // Validate parameters
    if (!planId || !dayIndex) {
      return res.status(400).json({ error: 'Plan ID and day index are required' });
    }

    const dayIndexNum = parseInt(dayIndex);
    if (isNaN(dayIndexNum) || dayIndexNum < 1 || dayIndexNum > 3) {
      return res.status(400).json({ error: 'Day index must be 1, 2, or 3' });
    }

    // Get the plan and verify access: allow if student token matches or parent owns the student
    const plan = await prisma.plan3.findFirst({
      where: {
        id: planId
      },
      include: {
        student: true,
        story: true
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found or access denied' });
    }

    const isStudent = auth?.studentId && Number(auth.studentId) === Number(plan.studentId);
    const isParent = auth?.id && Number(plan.student?.parentId) === Number(auth.id);
    if (!isStudent && !isParent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const studentId = plan.studentId;

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
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
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

    // Transform activities to match frontend expectations
    const transformedActivities = {};
    for (const [activityType, content] of Object.entries(activities)) {
      transformedActivities[activityType] = transformActivityContent(activityType, content);
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
      activities: transformedActivities,
      progress: progressMap,
      studentAge
    });

  } catch (error) {
    console.error('Error fetching enhanced activities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// New explicit route to avoid path conflicts with /progress/*
// GET /api/enhanced-activities/by-plan/:planId/:dayIndex
router.get('/by-plan/:planId/:dayIndex', authenticate, handleGetActivitiesByPlanDay);

// Backward-compatible route (keep, but prefer /by-plan/* from frontend)
// GET /api/enhanced-activities/:planId/:dayIndex
router.get('/:planId/:dayIndex', authenticate, handleGetActivitiesByPlanDay);

// POST /api/enhanced-activities/progress
// Save student progress for activities
router.post('/progress', authenticate, async (req, res) => {
  try {
    const { planId, dayIndex, activityType, status, timeSpent, answers } = req.body;
    const auth = req.user;

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

    // Verify plan access (allow student token or parent of the student)
    const plan = await prisma.plan3.findFirst({
      where: { id: planId },
      include: { student: true }
    });

    if (!plan) {
      console.warn('POST /progress - plan not found', { planId, auth });
      return res.status(404).json({ error: 'Plan not found or access denied' });
    }

    const isStudent = auth?.studentId && Number(auth.studentId) === Number(plan.studentId);
    const isParent = auth?.id && Number(plan.student?.parentId) === Number(auth.id);
    if (!isStudent && !isParent) {
      console.warn('POST /progress - access denied', {
        planId,
        dayIndex,
        activityType,
        status,
        auth,
        planStudentId: plan.studentId,
        planParentId: plan.student?.parentId,
        isStudent,
        isParent
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    const studentId = plan.studentId;

    console.log('🔍 About to upsert ActivityProgress:', {
      studentId,
      plan3Id: planId,
      dayIndex: dayIndexNum,
      activityType,
      status,
      timeSpent
    });

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
        completedAt: status === 'completed' ? new Date() : undefined
      }
    });

    console.log('✅ ActivityProgress upsert successful:', {
      progressId: progress.id,
      status: progress.status
    });

    // Sync with legacy Plan3Day.answers when activity is completed
    if (status === 'completed') {
      await syncActivityCompletionWithLegacy(planId, dayIndexNum, activityType, studentId);
    }

    // If answers are provided, save them as responses
    if (answers && Array.isArray(answers)) {
      console.log('🔍 About to create ActivityResponse records:', {
        answersCount: answers.length,
        progressId: progress.id
      });
      
      const responses = [];
      
      for (const answer of answers) {
        if (answer.question && answer.answer !== undefined) {
          console.log('🔍 Creating response for:', {
            question: answer.question,
            answer: answer.answer,
            isCorrect: answer.isCorrect
          });
          
          // Validate and sanitize the data before sending to Prisma
          const responseData = {
            progressId: progress.id,
            question: String(answer.question || ''),
            answer: answer.answer,
            isCorrect: answer.isCorrect === true ? true : answer.isCorrect === false ? false : null,
            feedback: answer.feedback ? String(answer.feedback) : null,
            score: typeof answer.score === 'number' ? answer.score : null,
            timeSpent: typeof answer.timeSpent === 'number' ? answer.timeSpent : null
          };
          
          console.log('🔍 Sanitized response data:', responseData);
          
          const response = await prisma.activityResponse.create({
            data: responseData
          });
          
          console.log('🔍 Prisma create data that was sent:', {
            progressId: progress.id,
            question: answer.question,
            answer: answer.answer,
            isCorrect: answer.isCorrect || null,
            feedback: answer.feedback || null,
            score: answer.score || null,
            timeSpent: answer.timeSpent || null
          });
          
          responses.push(response);
          console.log('✅ ActivityResponse created:', response.id);
        }
      }
      
      console.log('✅ All ActivityResponse records created successfully');
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
    console.error('Error saving activity progress:', {
      message: error?.message,
      stack: error?.stack,
      requestBody: req.body,
      errorName: error?.name,
      errorCode: error?.code,
      fullError: error
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/enhanced-activities/progress/:studentId/:planId/:dayIndex
// Get progress for a specific student, plan, and day
router.get('/progress/:studentId/:planId/:dayIndex', authenticate, async (req, res) => {
  try {
    const { studentId, planId, dayIndex } = req.params;
    const auth = req.user;

    // Validate parameters
    if (!studentId || !planId || !dayIndex) {
      return res.status(400).json({ error: 'Student ID, plan ID, and day index are required' });
    }

    const dayIndexNum = parseInt(dayIndex);
    const requestedStudentId = parseInt(studentId);
    if (isNaN(dayIndexNum) || dayIndexNum < 1 || dayIndexNum > 3) {
      return res.status(400).json({ error: 'Day index must be 1, 2, or 3' });
    }

    // Verify access: allow if student token matches OR parent owns the student
    const plan = await prisma.plan3.findFirst({
      where: { id: planId },
      include: { student: true }
    });
    if (!plan) {
      console.warn('GET /progress - plan not found', { planId, auth });
      return res.status(404).json({ error: 'Plan not found' });
    }
    if (Number(plan.studentId) !== Number(requestedStudentId)) {
      console.warn('GET /progress - student mismatch', {
        planId,
        requestedStudentId,
        planStudentId: plan.studentId
      });
      return res.status(400).json({ error: 'Student does not match plan' });
    }
    const isStudent = auth?.studentId && Number(auth.studentId) === Number(plan.studentId);
    const isParent = auth?.id && Number(plan.student?.parentId) === Number(auth.id);
    if (!isStudent && !isParent) {
      console.warn('GET /progress - access denied', {
        planId,
        requestedStudentId,
        auth,
        planStudentId: plan.studentId,
        planParentId: plan.student?.parentId,
        isStudent,
        isParent
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get progress for all activity types
    const progress = await prisma.activityProgress.findMany({
      where: {
        studentId: requestedStudentId,
        plan3Id: planId,
        dayIndex: dayIndexNum
      },
      include: {
        responses: { orderBy: { createdAt: 'asc' } }
      }
    });

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
      studentId: requestedStudentId,
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Transform the content to match frontend expectations
    const transformedContent = transformActivityContent(activityType, generatedContent);

    res.json({
      success: true,
      activityType,
      content: transformedContent,
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
