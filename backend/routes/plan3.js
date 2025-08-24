import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { generateStory, generateStoryActivityContent } from '../lib/openai.js';

// Concurrency limiting - prevent multiple generations for same student
const generatingPlans = new Map();
import { modelOverrideMiddleware, getModelConfigWithOverride } from '../middleware/modelOverride.js';

const router = express.Router();
const prisma = new PrismaClient();

// Error handling utilities (imported from plans.js pattern)
const ERROR_HANDLERS = {
  logGenerationFailure(operation, context, error, additionalData = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      operation,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context: {
        studentId: context.studentId,
        studentName: context.studentName,
        planId: context.planId,
        dayIndex: context.dayIndex,
        parentId: context.parentId
      },
      additionalData,
      severity: 'ERROR'
    };

    console.error('🚨 Plan3 Operation Failure:', JSON.stringify(errorLog, null, 2));
  },

  createErrorResponse(operation, error, context = {}) {
    const errorTypes = {
      'OPENAI_API_ERROR': {
        status: 503,
        message: 'AI service temporarily unavailable. Please try again in a few minutes.',
        userFriendly: true
      },
      'VALIDATION_ERROR': {
        status: 400,
        message: 'Invalid request data provided.',
        userFriendly: true
      },
      'PLAN3_NOT_FOUND': {
        status: 404,
        message: 'Plan not found or access denied.',
        userFriendly: true
      },
      'DAY_NOT_FOUND': {
        status: 404,
        message: 'Day not found.',
        userFriendly: true
      },
      'DAY_LOCKED': {
        status: 400,
        message: 'Day is locked. Complete previous days first.',
        userFriendly: true
      },
      'ACTIVITIES_INCOMPLETE': {
        status: 400,
        message: 'All activities must be completed before marking day as complete.',
        userFriendly: true
      }
    };

    // Determine error type
    let errorType = 'UNKNOWN_ERROR';
    if (error.message.includes('OpenAI') || error.message.includes('story')) {
      errorType = 'OPENAI_API_ERROR';
    } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
      errorType = 'VALIDATION_ERROR';
    }
    
    // For debugging, log the actual error
    console.error('Actual error in generateStory:', error.message);
    console.error('Error stack:', error.stack);

    const errorConfig = errorTypes[errorType] || {
      status: 500,
      message: 'An unexpected error occurred. Please try again.',
      userFriendly: false
    };

    return {
      status: errorConfig.status,
      body: {
        message: errorConfig.message,
        error: operation,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          stack: error.stack
        })
      }
    };
  },

  handleRouteError(error, req, res, operation, context = {}) {
    // Log the error with context
    this.logGenerationFailure(operation, {
      studentId: context.studentId,
      studentName: context.studentName,
      planId: context.planId,
      dayIndex: context.dayIndex,
      parentId: req.user?.id
    }, error, {
      method: req.method,
      url: req.url,
      body: req.body,
      params: req.params
    });

    // Create standardized error response
    const errorResponse = this.createErrorResponse(operation, error, context);

    // Send response
    res.status(errorResponse.status).json(errorResponse.body);
  }
};

// POST /api/plan3 - Create a new 3-day plan with story generation
router.post('/', authenticate, async (req, res) => {
  const { studentId, name, theme, genreCombination } = req.body;
  const parentId = req.user.id;

  // Enhanced input validation
  if (!studentId || isNaN(parseInt(studentId))) {
    return res.status(400).json({ 
      message: 'Valid Student ID is required',
      error: 'INVALID_STUDENT_ID'
    });
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ 
      message: 'Plan name is required and must be a non-empty string',
      error: 'INVALID_PLAN_NAME'
    });
  }

  if (!theme || typeof theme !== 'string' || theme.trim().length === 0) {
    return res.status(400).json({ 
      message: 'Theme is required and must be a non-empty string',
      error: 'INVALID_THEME'
    });
  }

  // Validate name and theme length
  if (name.trim().length > 100) {
    return res.status(400).json({ 
      message: 'Plan name must be 100 characters or less',
      error: 'PLAN_NAME_TOO_LONG'
    });
  }

  if (theme.trim().length > 50) {
    return res.status(400).json({ 
      message: 'Theme must be 50 characters or less',
      error: 'THEME_TOO_LONG'
    });
  }

  let student;
  try {
    // Verify the student belongs to the authenticated parent
    student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), parentId }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if there's already a generating plan for this student (idempotency)
    const existingPlan = await prisma.plan3.findFirst({
      where: { 
        studentId: parseInt(studentId),
        status: 'generating',
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      }
    });

    if (existingPlan) {
      return res.status(201).json({
        message: 'Plan generation already in progress',
        plan: { id: existingPlan.id, status: existingPlan.status }
      });
    }

    // Check if there's an in-flight generation for this student
    if (generatingPlans.has(parseInt(studentId))) {
      return res.status(201).json({
        message: 'Plan generation already in progress',
        plan: { id: 'in-progress', status: 'generating' }
      });
    }

    // Create a stub plan immediately
    const plan3 = await prisma.plan3.create({
      data: {
        studentId: parseInt(studentId),
        name,
        theme,
        status: 'generating'
      }
    });

    console.log(`Created Plan3 stub (ID: ${plan3.id}) for student ${student.name}`);

    // Respond immediately with the stub
    res.status(201).json({
      message: '3-day plan generation started',
      plan: { id: plan3.id, status: plan3.status }
    });

    // Generate story and complete plan in background
    setImmediate(async () => {
      // Track this generation to prevent duplicates
      generatingPlans.set(parseInt(studentId), true);
      
      try {
        console.log(`Starting background generation for Plan3 ${plan3.id}`);
        
        // Generate the story using the existing story generation logic
        console.log(`Generating 3-day plan story for student ${student.name} with theme: ${theme}${genreCombination ? `, genre: ${genreCombination}` : ''}`);
        
        const storyData = await generateStory(student, theme, genreCombination);
        
        console.log('Story generated successfully for 3-day plan:', {
          title: storyData.title,
          themes: storyData.themes,
          vocabularyCount: storyData.vocabulary?.length || 0
        });

        // Create the Story3 record linked to the Plan3
        const story3 = await prisma.story3.create({
          data: {
            plan3Id: plan3.id,
            title: storyData.title,
            themes: storyData.themes,
            part1: storyData.part1,
            part2: storyData.part2,
            part3: storyData.part3
          }
        });

        // Create the 3 days for the Plan3
        const days = await Promise.all(
          Array.from({ length: 3 }, (_, index) => 
            prisma.plan3Day.create({
              data: {
                plan3Id: plan3.id,
                index: index + 1,
                state: index === 0 ? 'available' : 'locked' // Day 1 is available, rest are locked
              }
            })
          )
        );

        // Update plan status to ready
        await prisma.plan3.update({
          where: { id: plan3.id },
          data: { status: 'active' }
        });

        console.log(`✅ Plan3 ${plan3.id} ready for student ${student.name} with ${days.length} days`);

      } catch (error) {
        console.error(`❌ Background generation failed for Plan3 ${plan3.id}:`, error);
        
        // Update plan status to failed
        await prisma.plan3.update({
          where: { id: plan3.id },
          data: { 
            status: 'failed',
            theme: `${theme} (Generation Failed: ${error.message})`
          }
        });
      } finally {
        // Always clean up the tracking
        generatingPlans.delete(parseInt(studentId));
      }
    });

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN3_CREATION', {
      studentId: parseInt(studentId),
      studentName: student?.name || 'Unknown'
    });
  }
});

// GET /api/plan3/:planId - Fetch a single Plan3 with its associated story and days
router.get('/:planId', authenticate, async (req, res) => {
  const { planId } = req.params;
  const parentId = req.user.id;

  // Validate planId format (should be CUID)
  if (!planId || typeof planId !== 'string' || planId.trim().length === 0) {
    return res.status(400).json({ 
      message: 'Valid Plan ID is required',
      error: 'INVALID_PLAN_ID'
    });
  }

  try {
    // Fetch the Plan3 and verify it belongs to the authenticated parent
    const plan3 = await prisma.plan3.findFirst({
      where: {
        id: planId,
        student: {
          parentId
        }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            gradeLevel: true
          }
        },
        story: true,
        days: {
          orderBy: { index: 'asc' }
        }
      }
    });

    if (!plan3) {
      return res.status(404).json({ 
        message: 'Plan3 not found or access denied',
        error: 'PLAN3_NOT_FOUND'
      });
    }

    // Calculate plan status and progress
    const totalDays = plan3.days.length;
    const completedDays = plan3.days.filter(day => day.state === 'complete').length;
    const availableDays = plan3.days.filter(day => day.state === 'available').length;
    const lockedDays = plan3.days.filter(day => day.state === 'locked').length;
    const progress = Math.round((completedDays / totalDays) * 100);

    // Find the next available day
    const nextAvailableDay = plan3.days.find(day => day.state === 'available');

    // Enhanced Plan3 response with status
    const enhancedPlan3 = {
      ...plan3,
      planStatus: {
        totalDays,
        completedDays,
        availableDays,
        lockedDays,
        progress,
        nextAvailableDay: nextAvailableDay ? nextAvailableDay.index : null,
        isComplete: completedDays === totalDays
      }
    };

    // Debug logging
    console.log('GET /api/plan3/:planId - Plan3 data being returned:', {
      planId: plan3.id,
      days: plan3.days.map(day => ({
        index: day.index,
        state: day.state,
        completedAt: day.completedAt
      }))
    });

    res.json(enhancedPlan3);

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN3_FETCH', {
      planId: planId
    });
  }
});

// GET /api/plan3/:planId/day/:index - Get day details with chapter and activities
router.get('/:planId/day/:index', authenticate, async (req, res) => {
  const { planId, index } = req.params;
  const parentId = req.user.id;

  // Validate planId format
  if (!planId || typeof planId !== 'string' || planId.trim().length === 0) {
    return res.status(400).json({ 
      message: 'Valid Plan ID is required',
      error: 'INVALID_PLAN_ID'
    });
  }

  try {
    // Validate index parameter
    const dayIndex = parseInt(index);
    if (isNaN(dayIndex) || dayIndex < 1 || dayIndex > 3) {
      return res.status(400).json({ 
        message: 'Invalid day index. Must be 1, 2, or 3.',
        error: 'INVALID_DAY_INDEX'
      });
    }

    // Fetch the Plan3 and verify it belongs to the authenticated parent
    const plan3 = await prisma.plan3.findFirst({
      where: {
        id: planId,
        student: {
          parentId
        }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            gradeLevel: true
          }
        },
        story: true,
        days: {
          where: { index: dayIndex },
          orderBy: { index: 'asc' }
        }
      }
    });

    if (!plan3) {
      return res.status(404).json({ 
        message: 'Plan3 not found or access denied',
        error: 'PLAN3_NOT_FOUND'
      });
    }

    if (!plan3.days || plan3.days.length === 0) {
      return res.status(404).json({ 
        message: `Day ${dayIndex} not found`,
        error: 'DAY_NOT_FOUND'
      });
    }

    const day = plan3.days[0];

    // Get the corresponding chapter content
    let chapterContent = '';
    let chapterTitle = '';
    
    switch (dayIndex) {
      case 1:
        chapterContent = plan3.story?.part1 || '';
        chapterTitle = 'Chapter 1';
        break;
      case 2:
        chapterContent = plan3.story?.part2 || '';
        chapterTitle = 'Chapter 2';
        break;
      case 3:
        chapterContent = plan3.story?.part3 || '';
        chapterTitle = 'Chapter 3';
        break;
    }

    // Generate story-specific activity content
    let whoActivityData = { characters: [] };
    let sequenceActivityData = { events: [], correctOrder: [] };
    
    try {
      if (chapterContent) {
        whoActivityData = await generateStoryActivityContent(chapterContent, plan3.student, 'who');
        sequenceActivityData = await generateStoryActivityContent(chapterContent, plan3.student, 'sequence');
      }
    } catch (error) {
      console.error('Error generating story activity content:', error);
      // Continue with fallback data
    }

    // Generate the 5 activities for this day based on the PRD requirements
    const activities = [
      {
        id: 'who',
        type: 'who',
        title: 'Who Activity',
        prompt: `Who are the characters in ${chapterTitle}?`,
        description: 'Drag character names to match their descriptions.',
        data: {
          type: 'character-matching',
          instructions: 'Match each character with their correct description from the chapter.',
          characters: whoActivityData.characters || []
        },
        completed: day.answers?.who ? true : false,
        response: day.answers?.who || null
      },
      {
        id: 'where',
        type: 'where',
        title: 'Where Activity',
        prompt: `Where does ${chapterTitle} take place?`,
        description: 'Identify the location or setting.',
        data: {
          type: 'text-input',
          instructions: 'Describe where the events in this chapter happen.',
          placeholder: 'Enter the location or setting...',
          minLength: 10
        },
        completed: day.answers?.where ? true : false,
        response: day.answers?.where || null
      },
      {
        id: 'sequence',
        type: 'sequence',
        title: 'Sequence Activity',
        prompt: `What happened in ${chapterTitle}? Put the events in order.`,
        description: 'Drag the event cards to arrange them in the correct sequence.',
        data: {
          type: 'event-ordering',
          instructions: 'Drag the events to put them in the correct order from the chapter.',
          events: sequenceActivityData.events || [],
          correctOrder: sequenceActivityData.correctOrder || []
        },
        completed: day.answers?.sequence ? true : false,
        response: day.answers?.sequence || null
      },
      {
        id: 'main_idea',
        type: 'main_idea',
        title: 'Main Idea Activity',
        prompt: `What is the main idea of ${chapterTitle}?`,
        description: 'Explain the central theme or main point.',
        data: {
          type: 'text-input',
          instructions: 'Write about the main idea or central theme of this chapter.',
          placeholder: 'What is the main idea of this chapter?',
          minLength: 20
        },
        completed: day.answers?.mainIdea ? true : false,
        response: day.answers?.mainIdea || null
      },
      {
        id: 'predict',
        type: 'predict',
        title: 'Predict Activity',
        prompt: dayIndex < 3 ? `What do you think will happen in Chapter ${dayIndex + 1}?` : 'What do you think happens after the story ends?',
        description: dayIndex < 3 ? 'Make a prediction about the next chapter.' : 'Predict what might happen next in the story world.',
        data: {
          type: 'text-input',
          instructions: dayIndex < 3 ? 'Based on what happened in this chapter, what do you think will happen next?' : 'What do you think the characters might do after the story ends?',
          placeholder: 'Write your prediction...',
          minLength: 15
        },
        completed: day.answers?.predict ? true : false,
        response: day.answers?.predict || null
      }
    ];

    // Calculate activity completion
    const completedActivities = activities.filter(activity => activity.completed).length;
    const totalActivities = activities.length;
    const activityProgress = Math.round((completedActivities / totalActivities) * 100);

    // Prepare the response
    const dayDetails = {
      plan: {
        id: plan3.id,
        name: plan3.name,
        theme: plan3.theme,
        student: plan3.student
      },
      day: {
        id: day.id,
        index: day.index,
        state: day.state,
        completedAt: day.completedAt,
        progress: activityProgress
      },
      chapter: {
        number: dayIndex,
        title: chapterTitle,
        content: chapterContent,
        // Add paragraph anchors for jump-to-context functionality
        anchors: generateParagraphAnchors(chapterContent, dayIndex)
      },
      activities,
      story: {
        title: plan3.story?.title || '',
        themes: plan3.story?.themes || []
      }
    };

    console.log(`GET /api/plan3/${planId}/day/${index} - Day details returned:`, {
      planId,
      dayIndex,
      dayState: day.state,
      activitiesCount: activities.length,
      completedActivities,
      chapterLength: chapterContent.length
    });

    res.json(dayDetails);

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN3_DAY_FETCH', {
      planId: planId,
      dayIndex: parseInt(index)
    });
  }
});

// Helper function to generate paragraph anchors for jump-to-context
function generateParagraphAnchors(content, chapterNumber) {
  if (!content) return {};
  
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  const anchors = {};
  
  paragraphs.forEach((paragraph, index) => {
    const anchorId = `ch${chapterNumber}p${index + 1}`;
    anchors[`paragraph${index + 1}`] = `#${anchorId}`;
  });
  
  return anchors;
}

// POST /api/plan3/:planId/day/:index/answers - Save activity responses and handle day completion
router.post('/:planId/day/:index/answers', authenticate, async (req, res) => {
  const { planId, index } = req.params;
  const { answers, completeDay } = req.body;
  const parentId = req.user.id;

  // Validate planId format
  if (!planId || typeof planId !== 'string' || planId.trim().length === 0) {
    return res.status(400).json({ 
      message: 'Valid Plan ID is required',
      error: 'INVALID_PLAN_ID'
    });
  }

  // Validate completeDay parameter
  if (completeDay !== undefined && typeof completeDay !== 'boolean') {
    return res.status(400).json({ 
      message: 'completeDay must be a boolean value',
      error: 'INVALID_COMPLETE_DAY'
    });
  }

  try {
    // Validate index parameter
    const dayIndex = parseInt(index);
    if (isNaN(dayIndex) || dayIndex < 1 || dayIndex > 3) {
      return res.status(400).json({ 
        message: 'Invalid day index. Must be 1, 2, or 3.',
        error: 'INVALID_DAY_INDEX'
      });
    }

    // Validate answers structure
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ 
        message: 'Answers must be a valid object',
        error: 'INVALID_ANSWERS'
      });
    }

    // Check for empty answers object
    if (Object.keys(answers).length === 0) {
      return res.status(400).json({ 
        message: 'At least one activity answer is required',
        error: 'EMPTY_ANSWERS'
      });
    }

    // Fetch the Plan3 and verify it belongs to the authenticated parent
    const plan3 = await prisma.plan3.findFirst({
      where: {
        id: planId,
        student: {
          parentId
        }
      },
      include: {
        days: {
          where: { index: dayIndex }
        }
      }
    });

    if (!plan3) {
      return res.status(404).json({ 
        message: 'Plan3 not found or access denied',
        error: 'PLAN3_NOT_FOUND'
      });
    }

    if (!plan3.days || plan3.days.length === 0) {
      return res.status(404).json({ 
        message: `Day ${dayIndex} not found`,
        error: 'DAY_NOT_FOUND'
      });
    }

    const day = plan3.days[0];

    // Check if day is accessible (not locked)
    if (day.state === 'locked') {
      return res.status(400).json({ 
        message: `Day ${dayIndex} is locked. Complete previous days first.`,
        error: 'DAY_LOCKED'
      });
    }

    // Check if day is already complete
    if (day.state === 'complete' && completeDay) {
      return res.status(400).json({ 
        message: `Day ${dayIndex} is already complete`,
        error: 'DAY_ALREADY_COMPLETE'
      });
    }

    // Validate activity answers based on PRD requirements
    const validationResult = validateActivityAnswers(answers, dayIndex);
    if (!validationResult.isValid) {
      return res.status(400).json({ 
        message: 'Invalid activity answers',
        error: 'INVALID_ACTIVITY_ANSWERS',
        details: validationResult.errors
      });
    }

    // Merge new answers with existing answers
    const currentAnswers = day.answers || {};
    const updatedAnswers = { ...currentAnswers, ...answers };

    // Determine new day state
    let newState = day.state;
    let completedAt = day.completedAt;

    if (completeDay) {
      // Check if all required activities are completed
      const allActivitiesComplete = checkAllActivitiesComplete(updatedAnswers);
      
      if (!allActivitiesComplete) {
        return res.status(400).json({ 
          message: 'All activities must be completed before marking day as complete',
          error: 'ACTIVITIES_INCOMPLETE'
        });
      }

      newState = 'complete';
      completedAt = new Date();
    }

    // Update the day with new answers and state
    const updatedDay = await prisma.plan3Day.update({
      where: { id: day.id },
      data: {
        answers: updatedAnswers,
        state: newState,
        completedAt: completedAt
      }
    });

    // If day was completed, unlock the next day
    if (newState === 'complete' && dayIndex < 3) {
      const nextDayIndex = dayIndex + 1;
      await prisma.plan3Day.updateMany({
        where: {
          plan3Id: planId,
          index: nextDayIndex,
          state: 'locked'
        },
        data: {
          state: 'available'
        }
      });
      
      console.log(`Day ${dayIndex} completed, unlocked Day ${nextDayIndex}`);
    }

    // Check if entire plan is complete
    if (newState === 'complete' && dayIndex === 3) {
      await prisma.plan3.update({
        where: { id: planId },
        data: { status: 'completed' }
      });
      
      console.log(`Plan3 ${planId} marked as completed`);
    }

    console.log(`Saved answers for Plan3 ${planId}, Day ${dayIndex}:`, {
      answersKeys: Object.keys(updatedAnswers),
      dayState: newState,
      completed: completeDay
    });

    res.json({
      message: completeDay ? `Day ${dayIndex} completed successfully` : 'Answers saved successfully',
      day: {
        id: updatedDay.id,
        index: updatedDay.index,
        state: updatedDay.state,
        completedAt: updatedDay.completedAt,
        answers: updatedDay.answers
      },
      nextDayUnlocked: newState === 'complete' && dayIndex < 3 ? dayIndex + 1 : null,
      planComplete: newState === 'complete' && dayIndex === 3
    });

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN3_ANSWERS_SAVE', {
      planId: planId,
      dayIndex: parseInt(index)
    });
  }
});

// Helper function to validate activity answers
function validateActivityAnswers(answers, dayIndex) {
  const errors = [];
  const requiredActivities = ['who', 'where', 'sequence', 'mainIdea', 'predict'];

  // Check that we have valid answer types
  for (const [activityType, response] of Object.entries(answers)) {
    if (!requiredActivities.includes(activityType)) {
      errors.push(`Unknown activity type: ${activityType}`);
      continue;
    }

    // Validate based on activity type
    switch (activityType) {
      case 'who':
        if (!Array.isArray(response) || response.length === 0) {
          errors.push('Who activity requires an array of character matches');
        }
        break;
      
      case 'where':
        if (typeof response !== 'string' || response.trim().length < 10) {
          errors.push('Where activity requires a text response of at least 10 characters');
        }
        break;
      
      case 'sequence':
        if (!Array.isArray(response) || response.length === 0) {
          errors.push('Sequence activity requires an array of ordered events');
        }
        break;
      
      case 'mainIdea':
        if (typeof response !== 'string' || response.trim().length < 20) {
          errors.push('Main Idea activity requires a text response of at least 20 characters');
        }
        break;
      
      case 'predict':
        if (typeof response !== 'string' || response.trim().length < 15) {
          errors.push('Predict activity requires a text response of at least 15 characters');
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to check if all activities are complete
function checkAllActivitiesComplete(answers) {
  const requiredActivities = ['who', 'where', 'sequence', 'mainIdea', 'predict'];
  
  return requiredActivities.every(activity => {
    const response = answers[activity];
    
    switch (activity) {
      case 'who':
      case 'sequence':
        return Array.isArray(response) && response.length > 0;
      
      case 'where':
        return typeof response === 'string' && response.trim().length >= 10;
      
      case 'mainIdea':
        return typeof response === 'string' && response.trim().length >= 20;
      
      case 'predict':
        return typeof response === 'string' && response.trim().length >= 15;
      
      default:
        return false;
    }
  });
}

// GET /api/plan3/student/:studentId - Get the most recent Plan3 for a student
router.get('/student/:studentId', authenticate, async (req, res) => {
  const { studentId } = req.params;
  const parentId = req.user.id;

  console.log(`🔍 GET /api/plan3/student/${studentId} - Request from parent ${parentId}`);

  try {
    // Verify the student belongs to the authenticated parent
    const student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), parentId }
    });

    if (!student) {
      console.log(`❌ Student ${studentId} not found for parent ${parentId}`);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log(`✅ Found student: ${student.name} (ID: ${student.id})`);
    console.log(`🔍 Attempting to find Plan3 for student ${studentId}...`);

    // Get the most recent Plan3 for the student
    const plan3 = await prisma.plan3.findFirst({
      where: { studentId: parseInt(studentId) },
      include: {
        student: true,
        story: true,
        days: {
          orderBy: { index: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!plan3) {
      console.log(`ℹ️  No Plan3 found for student ${studentId}`);
      return res.status(404).json({ message: 'No 3-day plan found for this student' });
    }

    // If plan is still generating, return it with status
    if (plan3.status === 'generating') {
      console.log(`⏳ Plan3 ${plan3.id} is still generating for student ${studentId}`);
      return res.status(200).json({
        plan: {
          id: plan3.id,
          studentId: plan3.studentId,
          name: plan3.name,
          theme: plan3.theme,
          status: plan3.status,
          createdAt: plan3.createdAt,
          updatedAt: plan3.updatedAt,
          student: plan3.student,
          days: [],
          story: null
        }
      });
    }

    // If plan failed to generate, return error status
    if (plan3.status === 'failed') {
      console.log(`❌ Plan3 ${plan3.id} failed to generate for student ${studentId}`);
      return res.status(500).json({
        message: 'Plan generation failed',
        error: 'PLAN3_GENERATION_FAILED',
        plan: {
          id: plan3.id,
          studentId: plan3.studentId,
          name: plan3.name,
          theme: plan3.theme,
          status: plan3.status,
          createdAt: plan3.createdAt,
          updatedAt: plan3.updatedAt,
          student: plan3.student
        }
      });
    }

    console.log(`✅ Found Plan3: ${plan3.id} for student ${studentId}`);
    res.status(200).json({
      plan: plan3
    });

  } catch (error) {
    console.error('❌ Error fetching Plan3 for student:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN3_FETCH_BY_STUDENT', {
      studentId: parseInt(studentId)
    });
  }
});

export default router;
