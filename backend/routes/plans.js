import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { generateFullWeeklyPlan } from '../lib/openai.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/plans/generate
router.post('/generate', authenticate, async (req, res) => {
  const { studentId } = req.body;
  const parentId = req.user.id;

  if (!studentId) {
    return res.status(400).json({ message: 'Student ID is required' });
  }

  try {
    // Verify the student belongs to the authenticated parent
    console.log('Generating weekly plan for:', { studentId, parentId });
    
    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check for existing weekly plan (not older than 2 weeks)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const existingPlan = await prisma.weeklyPlan.findFirst({
      where: {
        studentId,
        createdAt: { gte: twoWeeksAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingPlan) {
      // Return existing plan
      return res.status(200).json({
        plan: existingPlan,
        resumed: true
      });
    }

    // Generate new weekly plan content
    console.log('Generating new weekly plan for student:', student.name);
    const weeklyPlanData = await generateFullWeeklyPlan(student);

    // Create new weekly plan in the database
    const weeklyPlan = await prisma.weeklyPlan.create({
      data: {
        studentId,
        interestTheme: weeklyPlanData.interestTheme,
      }
    });

    // Create chapters
    const chapters = await Promise.all(
      weeklyPlanData.chapters.map(chapter => 
        prisma.chapter.create({
          data: {
            planId: weeklyPlan.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            content: chapter.content,
            summary: chapter.summary
          }
        })
      )
    );

    // Create daily activities
    const dailyActivities = await Promise.all(
      weeklyPlanData.dailyActivities.map(activity =>
        prisma.dailyActivity.create({
          data: {
            planId: weeklyPlan.id,
            dayOfWeek: activity.dayOfWeek,
            activityType: activity.activityType,
            content: activity.content
          }
        })
      )
    );

    // Fetch the complete plan with relations
    const completePlan = await prisma.weeklyPlan.findUnique({
      where: { id: weeklyPlan.id },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' }
        },
        dailyActivities: {
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });

    res.status(201).json({
      plan: completePlan,
      resumed: false
    });
  } catch (error) {
    console.error('Weekly plan generation error:', error);
    res.status(500).json({ message: error.message || 'An error occurred while generating the weekly plan' });
  }
});

// GET /api/plans/:studentId
router.get('/:studentId', authenticate, async (req, res) => {
  const { studentId } = req.params;
  const parentId = req.user.id;

  try {
    // Verify the student belongs to the authenticated parent
    const student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), parentId }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get the most recent weekly plan
    const weeklyPlan = await prisma.weeklyPlan.findFirst({
      where: { studentId: parseInt(studentId) },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' }
        },
        dailyActivities: {
          orderBy: { dayOfWeek: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!weeklyPlan) {
      return res.status(404).json({ message: 'No weekly plan found for this student' });
    }

    res.json(weeklyPlan);
  } catch (error) {
    console.error('Weekly plan fetch error:', error);
    res.status(500).json({ message: 'An error occurred while fetching the weekly plan' });
  }
});

// PUT /api/plans/activity/:activityId
router.put('/activity/:activityId', authenticate, async (req, res) => {
  const { activityId } = req.params;
  const { studentResponse } = req.body;
  const parentId = req.user.id;

  if (!studentResponse) {
    return res.status(400).json({ message: 'Student response is required' });
  }

  try {
    // Verify the activity belongs to a student of the authenticated parent
    const activity = await prisma.dailyActivity.findFirst({
      where: {
        id: parseInt(activityId),
        plan: {
          student: {
            parentId
          }
        }
      },
      include: {
        plan: {
          include: {
            student: true
          }
        }
      }
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    // Update the activity with the student's response
    const updatedActivity = await prisma.dailyActivity.update({
      where: { id: parseInt(activityId) },
      data: { studentResponse }
    });

    res.json(updatedActivity);
  } catch (error) {
    console.error('Activity response update error:', error);
    res.status(500).json({ message: 'An error occurred while updating the activity response' });
  }
});

export default router; 