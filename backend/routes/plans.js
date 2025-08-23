import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { generateStory, generateStoryOnly, generateActivityWithFallback } from '../lib/openai.js';
import { modelOverrideMiddleware, getModelConfigWithOverride } from '../middleware/modelOverride.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Middleware to validate sequential day completion
 * Ensures students can only access activities in proper order
 */
const validateSequentialAccess = async (req, res, next) => {
  const { planId, dayOfWeek } = req.body;
  const parentId = req.user.id;

  if (!planId || !dayOfWeek) {
    return res.status(400).json({ 
      message: 'Plan ID and day of week are required for sequential validation' 
    });
  }

  try {
    // Day 1 is always accessible
    if (dayOfWeek === 1) {
      return next();
    }

    // Check if previous day's activity exists and is completed
    const previousActivity = await prisma.dailyActivity.findFirst({
      where: {
        planId: parseInt(planId),
        dayOfWeek: dayOfWeek - 1
      },
      include: {
        plan: {
          where: {
            student: {
              parentId
            }
          }
        }
      }
    });

    if (!previousActivity) {
      return res.status(400).json({
        message: `Day ${dayOfWeek - 1} must be completed before accessing day ${dayOfWeek}`,
        error: 'SEQUENTIAL_ACCESS_REQUIRED',
        requiredDay: dayOfWeek - 1,
        requestedDay: dayOfWeek
      });
    }

    if (!previousActivity.completed) {
      return res.status(400).json({
        message: `Day ${dayOfWeek - 1} must be completed before accessing day ${dayOfWeek}`,
        error: 'PREVIOUS_DAY_INCOMPLETE',
        requiredDay: dayOfWeek - 1,
        requestedDay: dayOfWeek,
        previousDayStatus: 'incomplete'
      });
    }

    // All checks passed
    next();
  } catch (error) {
    console.error('Sequential access validation error:', error);
    res.status(500).json({ 
      message: 'An error occurred while validating sequential access',
      error: 'VALIDATION_ERROR'
    });
  }
};

/**
 * Middleware to validate activity access permissions
 * Ensures the activity belongs to the authenticated parent's student
 */
const validateActivityAccess = async (req, res, next) => {
  const { activityId } = req.params;
  const parentId = req.user.id;

  if (!activityId) {
    return res.status(400).json({ message: 'Activity ID is required' });
  }

  try {
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
      return res.status(404).json({ 
        message: 'Activity not found or access denied',
        error: 'ACTIVITY_NOT_FOUND'
      });
    }

    // Add activity to request for use in route handlers
    req.activity = activity;
    next();
  } catch (error) {
    console.error('Activity access validation error:', error);
    res.status(500).json({ 
      message: 'An error occurred while validating activity access',
      error: 'VALIDATION_ERROR'
    });
  }
};

/**
 * Middleware to validate plan access permissions
 * Ensures the plan belongs to the authenticated parent's student
 */
const validatePlanAccess = async (req, res, next) => {
  const planId = req.body.planId || req.params.planId;
  const parentId = req.user.id;

  if (!planId) {
    return res.status(400).json({ message: 'Plan ID is required' });
  }

  try {
    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        id: parseInt(planId),
        student: {
          parentId
        }
      },
      include: {
        student: true,
        chapters: {
          orderBy: { chapterNumber: 'asc' }
        },
        dailyActivities: {
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ 
        message: 'Plan not found or access denied',
        error: 'PLAN_NOT_FOUND'
      });
    }

    // Add plan to request for use in route handlers
    req.plan = plan;
    next();
  } catch (error) {
    console.error('Plan access validation error:', error);
    res.status(500).json({ 
      message: 'An error occurred while validating plan access',
      error: 'VALIDATION_ERROR'
    });
  }
};

/**
 * Caching and response optimization utilities
 */
const CACHE_UTILS = {
  /**
   * Generates ETag for plan data
   * @param {object} plan - The plan data
   * @returns {string} - ETag hash
   */
  generateETag(plan) {
    const planString = JSON.stringify({
      id: plan.id,
      updatedAt: plan.updatedAt,
      chapters: plan.chapters?.map(c => ({ id: c.id, updatedAt: c.updatedAt })),
      dailyActivities: plan.dailyActivities?.map(a => ({ id: a.id, updatedAt: a.updatedAt, completed: a.completed }))
    });
    
    // Simple hash function for ETag generation
    let hash = 0;
    for (let i = 0; i < planString.length; i++) {
      const char = planString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
  },

  /**
   * Sets appropriate caching headers for plan responses
   * @param {object} res - Express response object
   * @param {object} plan - The plan data
   * @param {string} operation - The operation type
   */
  setCacheHeaders(res, plan, operation = 'plan') {
    const etag = this.generateETag(plan);
    const lastModified = plan.updatedAt || plan.createdAt;
    
    // Set ETag for conditional requests
    res.set('ETag', etag);
    
    // Set Last-Modified header
    if (lastModified) {
      res.set('Last-Modified', new Date(lastModified).toUTCString());
    }
    
    // Set cache control headers based on operation
    switch (operation) {
      case 'plan':
        // Plan data can be cached for 5 minutes, but must revalidate
        res.set('Cache-Control', 'public, max-age=300, must-revalidate');
        break;
      case 'activity':
        // Activity data can be cached for 2 minutes
        res.set('Cache-Control', 'public, max-age=120, must-revalidate');
        break;
      case 'story':
        // Story content can be cached for 1 hour
        res.set('Cache-Control', 'public, max-age=3600, must-revalidate');
        break;
      default:
        // Default cache for 5 minutes
        res.set('Cache-Control', 'public, max-age=300, must-revalidate');
    }
    
    // Set Vary header to indicate response varies by user
    res.set('Vary', 'Authorization');
  },

  /**
   * Checks if the request can be served from cache
   * @param {object} req - Express request object
   * @param {object} plan - The plan data
   * @returns {boolean} - True if request can be served from cache
   */
  checkCacheCondition(req, plan) {
    const etag = this.generateETag(plan);
    const ifNoneMatch = req.get('If-None-Match');
    const ifModifiedSince = req.get('If-Modified-Since');
    
    // Check ETag match
    if (ifNoneMatch && ifNoneMatch === etag) {
      return true;
    }
    
    // Check Last-Modified
    if (ifModifiedSince && plan.updatedAt) {
      const lastModified = new Date(plan.updatedAt);
      const ifModifiedSinceDate = new Date(ifModifiedSince);
      if (lastModified <= ifModifiedSinceDate) {
        return true;
      }
    }
    
    return false;
  },

  /**
   * Optimizes plan response by removing unnecessary data
   * @param {object} plan - The full plan data
   * @param {object} options - Optimization options
   * @returns {object} - Optimized plan data
   */
  optimizePlanResponse(plan, options = {}) {
    const {
      includeChapters = true,
      includeActivities = true,
      includeStatus = true,
      includeMetadata = true
    } = options;

    const optimized = {
      id: plan.id,
      studentId: plan.studentId,
      interestTheme: plan.interestTheme
    };

    // Add chapters if requested
    if (includeChapters && plan.chapters) {
      optimized.chapters = plan.chapters.map(chapter => ({
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        content: chapter.content,
        summary: chapter.summary,
        createdAt: chapter.createdAt
      }));
    }

    // Add activities if requested
    if (includeActivities && plan.dailyActivities) {
      optimized.dailyActivities = plan.dailyActivities.map(activity => ({
        id: activity.id,
        dayOfWeek: activity.dayOfWeek,
        activityType: activity.activityType,
        content: activity.content,
        completed: activity.completed,
        completedAt: activity.completedAt,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt
      }));
    }

    // Add plan status if requested
    if (includeStatus && plan.planStatus) {
      optimized.planStatus = plan.planStatus;
    }

    // Add metadata if requested
    if (includeMetadata) {
      optimized.createdAt = plan.createdAt;
      optimized.updatedAt = plan.updatedAt;
    }

    return optimized;
  }
};

/**
 * Error handling and logging utilities
 */
const ERROR_HANDLERS = {
  /**
   * Logs generation failures with detailed context
   * @param {string} operation - The operation being performed
   * @param {object} context - Context information (student, plan, etc.)
   * @param {Error} error - The error that occurred
   * @param {object} additionalData - Additional data for debugging
   */
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
        dayOfWeek: context.dayOfWeek,
        parentId: context.parentId
      },
      additionalData,
      severity: 'ERROR'
    };

    console.error('🚨 Generation Failure:', JSON.stringify(errorLog, null, 2));
    
    // In production, you might want to send this to a logging service
    // await sendToLoggingService(errorLog);
  },

  /**
   * Creates standardized error responses
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error that occurred
   * @param {object} context - Context information
   * @returns {object} - Standardized error response
   */
  createErrorResponse(operation, error, context = {}) {
    const errorTypes = {
      'OPENAI_API_ERROR': {
        status: 503,
        message: 'AI service temporarily unavailable. Please try again in a few minutes.',
        userFriendly: true
      },
      'VALIDATION_ERROR': {
        status: 400,
        message: 'Invalid request data. Please check your input and try again.',
        userFriendly: true
      },
      'DATABASE_ERROR': {
        status: 500,
        message: 'Database operation failed. Please try again.',
        userFriendly: true
      },
      'SEQUENTIAL_ACCESS_ERROR': {
        status: 400,
        message: 'Please complete the previous day\'s activity first.',
        userFriendly: true
      },
      'RATE_LIMIT_ERROR': {
        status: 429,
        message: 'Too many requests. Please wait a moment before trying again.',
        userFriendly: true
      }
    };

    // Determine error type based on error message or name
    let errorType = 'GENERAL_ERROR';
    if (error.message.includes('OpenAI') || error.message.includes('API')) {
      errorType = 'OPENAI_API_ERROR';
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      errorType = 'VALIDATION_ERROR';
    } else if (error.message.includes('database') || error.message.includes('prisma')) {
      errorType = 'DATABASE_ERROR';
    } else if (error.message.includes('sequential') || error.message.includes('previous day')) {
      errorType = 'SEQUENTIAL_ACCESS_ERROR';
    } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
      errorType = 'RATE_LIMIT_ERROR';
    }

    const errorConfig = errorTypes[errorType] || {
      status: 500,
      message: 'An unexpected error occurred. Please try again.',
      userFriendly: true
    };

    return {
      status: errorConfig.status,
      body: {
        message: errorConfig.message,
        error: errorType,
        operation,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            originalMessage: error.message,
            stack: error.stack
          }
        })
      }
    };
  },

  /**
   * Handles errors in route handlers with proper logging and response
   * @param {Error} error - The error that occurred
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {string} operation - The operation being performed
   * @param {object} context - Context information
   */
  handleRouteError(error, req, res, operation, context = {}) {
    // Log the error with context
    this.logGenerationFailure(operation, {
      studentId: context.studentId,
      studentName: context.studentName,
      planId: context.planId,
      dayOfWeek: context.dayOfWeek,
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
  },

  /**
   * Wraps async route handlers with error handling
   * @param {Function} handler - The route handler function
   * @param {string} operation - The operation name for logging
   * @returns {Function} - Wrapped handler with error handling
   */
  wrapWithErrorHandling(handler, operation) {
    return async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        this.handleRouteError(error, req, res, operation, {
          studentId: req.body.studentId || req.params.studentId,
          planId: req.body.planId || req.params.planId,
          dayOfWeek: req.body.dayOfWeek
        });
      }
    };
  }
};

// POST /api/plans - Create a new 5-day plan with story generation
router.post('/', authenticate, async (req, res) => {
  const { studentId, name, theme, genreCombination } = req.body;
  const parentId = req.user.id;

  if (!studentId) {
    return res.status(400).json({ message: 'Student ID is required' });
  }

  if (!name || !theme) {
    return res.status(400).json({ message: 'Plan name and theme are required' });
  }

  try {
    // Verify the student belongs to the authenticated parent
    const student = await prisma.student.findFirst({
      where: { id: parseInt(studentId), parentId }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Generate the story using the updated story generation logic
    console.log(`Generating story for student ${student.name} with theme: ${theme}${genreCombination ? `, genre: ${genreCombination}` : ''}`);
    
    const storyData = await generateStory(student, theme, genreCombination);
    
    console.log('Story generated successfully:', {
      title: storyData.title,
      themes: storyData.themes,
      vocabularyCount: storyData.vocabulary?.length || 0
    });

    // Create the new plan structure
    const plan = await prisma.plan.create({
      data: {
        studentId: parseInt(studentId),
        name,
        theme,
        status: 'active'
      }
    });

    // Create the story record linked to the plan
    const story = await prisma.story.create({
      data: {
        planId: plan.id,
        title: storyData.title,
        themes: storyData.themes,
        part1: storyData.part1,
        part2: storyData.part2,
        part3: storyData.part3,
        vocabulary: storyData.vocabulary
      }
    });

    // Create the 5 days for the plan
    const days = await Promise.all(
      Array.from({ length: 5 }, (_, index) => 
        prisma.day.create({
          data: {
            planId: plan.id,
            dayIndex: index + 1,
            state: index === 0 ? 'available' : 'locked' // Day 1 is available, rest are locked
          }
        })
      )
    );

    // Scaffold initial activities for each day based on the PRD
    const dayActivities = [];

    // Day 1: Vocabulary Matching (6 pairs from story vocabulary)
    const day1Activities = [{
      dayId: days[0].id,
      type: 'matching',
      prompt: 'Match each vocabulary word with its correct definition from Chapter 1.',
      data: {
        pairs: storyData.vocabulary.map(vocab => ({
          word: vocab.word,
          definition: vocab.definition
        })),
        instructions: 'Match all 6 vocabulary words with their correct definitions. All pairs must be correct to complete this activity.'
      },
      response: null,
      isValid: null
    }];
    dayActivities.push(...day1Activities);

    // Day 2: Comprehension Matching (5-6 items)
    const day2Activities = [{
      dayId: days[1].id,
      type: 'matching',
      prompt: 'Match the prompts with their correct answers based on Chapter 2.',
      data: {
        pairs: [
          { prompt: 'What was the main challenge in Chapter 2?', answer: 'To be generated based on story content' },
          { prompt: 'How did the character respond to the challenge?', answer: 'To be generated based on story content' },
          { prompt: 'What was the setting of Chapter 2?', answer: 'To be generated based on story content' },
          { prompt: 'What was the outcome of the main event?', answer: 'To be generated based on story content' },
          { prompt: 'What lesson did the character learn?', answer: 'To be generated based on story content' }
        ],
        instructions: 'Match all 5 comprehension questions with their correct answers. All pairs must be correct to complete this activity.'
      },
      response: null,
      isValid: null
    }];
    dayActivities.push(...day2Activities);

    // Day 3: Choice-based Reflection
    const day3Activities = [{
      dayId: days[2].id,
      type: 'reflection',
      prompt: 'Choose your reflection style and complete the activity.',
      data: {
        choice: null, // Will be set by user: 'oneGoodTwoBad' or 'twoGoodOneBad'
        options: {
          oneGoodTwoBad: {
            label: 'Option A: 1 good thing, 2 things to improve',
            fields: [
              { label: 'One good thing about the story', required: true },
              { label: 'First thing that could be improved', required: true },
              { label: 'Second thing that could be improved', required: true }
            ]
          },
          twoGoodOneBad: {
            label: 'Option B: 2 good things, 1 thing to improve',
            fields: [
              { label: 'First good thing about the story', required: true },
              { label: 'Second good thing about the story', required: true },
              { label: 'One thing that could be improved', required: true }
            ]
          }
        },
        instructions: 'Choose your reflection style and provide thoughtful responses for all three fields.'
      },
      response: null,
      isValid: null
    }];
    dayActivities.push(...day3Activities);

    // Day 4: Conditional Writing + Optional Upload
    const day4Activities = [{
      dayId: days[3].id,
      type: 'writing',
      prompt: 'Write based on your Day 3 choice.',
      data: {
        conditionalPrompt: {
          oneGoodTwoBad: 'Write what you would change to make the story better. (1-3 paragraphs)',
          twoGoodOneBad: 'Write what you think will happen on the next adventure in the series. (1-3 paragraphs)'
        },
        instructions: 'Write 1-3 paragraphs based on your Day 3 reflection choice. Uploading a drawing is optional.',
        requiresDay3Choice: true
      },
      response: null,
      isValid: null
    }, {
      dayId: days[3].id,
      type: 'upload',
      prompt: 'Optional: Draw what you described and upload it.',
      data: {
        acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
        maxSize: 10485760, // 10MB
        instructions: 'Upload an image file (PNG, JPEG, or WebP) up to 10MB. This is optional.',
        isOptional: true
      },
      response: null,
      isValid: null
    }];
    dayActivities.push(...day4Activities);

    // Day 5: Activity Ideas (user must pick at least 2)
    const day5Activities = [{
      dayId: days[4].id,
      type: 'multi-select',
      prompt: 'Select and complete at least 2 activities from the list below.',
      data: {
        activities: [
          {
            id: 'sequence-builder',
            type: 'sequence',
            label: 'Sequence Builder',
            description: 'Reorder 8-10 story beats in the correct sequence.',
            required: false
          },
          {
            id: 'alternate-ending',
            type: 'writing',
            label: 'Alternate Ending',
            description: 'Write a short alternate ending (1-2 paragraphs).',
            required: false
          },
          {
            id: 'character-journal',
            type: 'writing',
            label: 'Character Journal',
            description: 'Write a journal entry from a character\'s point of view.',
            required: false
          },
          {
            id: 'dialogue-rewrite',
            type: 'writing',
            label: 'Dialogue Rewrite',
            description: 'Rewrite a scene as dialogue only (script format).',
            required: false
          },
          {
            id: 'poster-slogan',
            type: 'writing',
            label: 'Poster/Slogan',
            description: 'Create a tagline and short blurb for a poster.',
            required: false
          },
          {
            id: 'vocabulary-author',
            type: 'writing',
            label: 'Vocabulary Author',
            description: 'Create 4 new vocabulary words with definitions and example sentences.',
            required: false
          }
        ],
        instructions: 'You must select and complete at least 2 activities. No activities are pre-selected.',
        minRequired: 2
      },
      response: null,
      isValid: null
    }];
    dayActivities.push(...day5Activities);

    // Create all activities in the database
    const createdActivities = await Promise.all(
      dayActivities.map(activity => 
        prisma.activity.create({
          data: activity
        })
      )
    );

    console.log(`Created ${createdActivities.length} activities across 5 days`);

    // Fetch the complete plan with story and days
    const completePlan = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: {
        student: true,
        story: true,
        days: {
          orderBy: { dayIndex: 'asc' },
          include: {
            activities: {
              orderBy: { id: 'asc' }
            }
          }
        }
      }
    });

    console.log(`Plan created successfully with story: ${story.title}`);

    res.status(201).json({
      message: 'Plan created successfully with story',
      plan: completePlan
    });

  } catch (error) {
    console.error('Error creating plan with story:', error);
    
    // Enhanced error handling for story generation failures
    if (error.message.includes('OpenAI') || error.message.includes('story')) {
      return res.status(500).json({
        message: 'Failed to generate story content. Please try again.',
        error: 'STORY_GENERATION_FAILED',
        details: error.message
      });
    }
    
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN_CREATION', {
      studentId: parseInt(studentId)
    });
  }
});

// POST /api/plans/generate
router.post('/generate', authenticate, modelOverrideMiddleware(), async (req, res) => {
  const { studentId } = req.body;
  const parentId = req.user.id;

  if (!studentId) {
    return res.status(400).json({ message: 'Student ID is required' });
  }

  // Verify the student belongs to the authenticated parent (moved outside try block)
  console.log('Generating weekly plan for:', { studentId, parentId });
  
  const student = await prisma.student.findFirst({
    where: { id: studentId, parentId }
  });

  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  try {

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

    // If a recent plan exists and force regeneration was requested, remove it first
    if (existingPlan && req.body?.force === true) {
      console.log('⚠️  Force regenerate requested. Deleting existing plan before creating a new one.', {
        studentId,
        existingPlanId: existingPlan.id
      });

      await prisma.$transaction(async (tx) => {
        await tx.dailyActivity.deleteMany({ where: { planId: existingPlan.id } });
        await tx.chapter.deleteMany({ where: { planId: existingPlan.id } });
        await tx.weeklyPlan.delete({ where: { id: existingPlan.id } });
      });
    } else if (existingPlan) {
      // Return existing plan
      return res.status(200).json({
        plan: existingPlan,
        resumed: true
      });
    }

    // Generate story-only weekly plan content with model override if provided
    console.log('Generating story-only weekly plan for student:', student.name);
    const modelOverride = req.modelOverride ? req.applyModelOverride('story_creation', getModelConfigWithOverride(req, 'story_creation')) : null;
    const weeklyPlanData = await generateStoryOnly(student, modelOverride);

    // Create new weekly plan in the database (without activities)
    const weeklyPlan = await prisma.weeklyPlan.create({
      data: {
        studentId,
        interestTheme: weeklyPlanData.interestTheme,
        genreCombination: weeklyPlanData.genreCombination,
      }
    });

    // Create chapters only (no activities)
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

    // Record the genre combination in student's history
    if (weeklyPlanData.genreCombination) {
      const { recordGenreCombination } = await import('../lib/genreSelector.js');
      await recordGenreCombination(studentId, weeklyPlanData.genreCombination);
      console.log(`Recorded genre combination "${weeklyPlanData.genreCombination}" for student ${studentId}`);
    }

    // Fetch the complete plan with chapters only (no activities yet)
    const completePlan = await prisma.weeklyPlan.findUnique({
      where: { id: weeklyPlan.id },
      select: {
        id: true,
        studentId: true,
        interestTheme: true,
        genreCombination: true,
        cachedPrompt: true,
        cachedOutput: true,
        createdAt: true,
        student: true,
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
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN_GENERATION', {
      studentId: parseInt(studentId),
      studentName: student?.name
    });
  }
});

// GET /api/plans/:id - Fetch a single plan with its associated story, days, and activities
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const parentId = req.user.id;

  try {
    // Fetch the plan and verify it belongs to the authenticated parent
    const plan = await prisma.plan.findFirst({
      where: {
        id: parseInt(id),
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
          orderBy: { dayIndex: 'asc' },
          include: {
            activities: {
              orderBy: { id: 'asc' }
            }
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ 
        message: 'Plan not found or access denied',
        error: 'PLAN_NOT_FOUND'
      });
    }

    // Calculate plan status and progress
    const totalDays = plan.days.length;
    const completedDays = plan.days.filter(day => day.state === 'complete').length;
    const availableDays = plan.days.filter(day => day.state === 'available').length;
    const lockedDays = plan.days.filter(day => day.state === 'locked').length;
    const progress = Math.round((completedDays / totalDays) * 100);

    // Find the next available day
    const nextAvailableDay = plan.days.find(day => day.state === 'available');

    // Enhanced plan response with status
    const enhancedPlan = {
      ...plan,
      planStatus: {
        totalDays,
        completedDays,
        availableDays,
        lockedDays,
        progress,
        nextAvailableDay: nextAvailableDay ? nextAvailableDay.dayIndex : null,
        isComplete: completedDays === totalDays
      }
    };

    // Debug logging
    console.log('GET /api/plans/:id - Plan data being returned:', {
      planId: plan.id,
      days: plan.days.map(day => ({
        dayIndex: day.dayIndex,
        state: day.state,
        completedAt: day.completedAt,
        activitiesCount: day.activities.length
      }))
    });

    // Check if request can be served from cache
    // Temporarily disabled for debugging
    // if (CACHE_UTILS.checkCacheCondition(req, enhancedPlan)) {
    //   return res.status(304).end(); // Not Modified
    // }

    // Set caching headers
    // CACHE_UTILS.setCacheHeaders(res, enhancedPlan, 'plan');

    res.json(enhancedPlan);

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN_FETCH', {
      planId: parseInt(id)
    });
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
      select: {
        id: true,
        studentId: true,
        interestTheme: true,
        genreCombination: true,
        cachedPrompt: true,
        cachedOutput: true,
        createdAt: true,
        student: true,
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

    // Calculate plan status and activity availability
    const existingActivities = weeklyPlan.dailyActivities || [];
    const completedActivities = existingActivities.filter(activity => activity.completed);
    const availableDays = [];
    const nextAvailableDay = [];

    // Determine which days are available for generation
    for (let day = 1; day <= 7; day++) {
      const existingActivity = existingActivities.find(activity => activity.dayOfWeek === day);
      
      if (existingActivity) {
        // Activity exists
        if (existingActivity.completed) {
          availableDays.push({
            day: day,
            status: 'completed',
            activity: existingActivity
          });
        } else {
          availableDays.push({
            day: day,
            status: 'available',
            activity: existingActivity
          });
        }
      } else {
        // Activity doesn't exist - check if it can be generated
        if (day === 1) {
          // Day 1 can always be generated
          availableDays.push({
            day: day,
            status: 'can_generate',
            activity: null
          });
          if (nextAvailableDay.length === 0) {
            nextAvailableDay.push(day);
          }
        } else {
          // Check if previous day is completed
          const previousDay = availableDays.find(d => d.day === day - 1);
          if (previousDay && previousDay.status === 'completed') {
            availableDays.push({
              day: day,
              status: 'can_generate',
              activity: null
            });
            if (nextAvailableDay.length === 0) {
              nextAvailableDay.push(day);
            }
          } else {
            availableDays.push({
              day: day,
              status: 'locked',
              activity: null
            });
          }
        }
      }
    }

    // Enhanced response with plan status
    const enhancedPlan = {
      ...weeklyPlan,
      planStatus: {
        totalDays: 7,
        completedDays: completedActivities.length,
        availableDays: availableDays.filter(d => d.status === 'available' || d.status === 'can_generate').length,
        lockedDays: availableDays.filter(d => d.status === 'locked').length,
        progress: Math.round((completedActivities.length / 7) * 100),
        nextAvailableDay: nextAvailableDay[0] || null
      },
      dailyActivityStatus: availableDays
    };

    // Check if request can be served from cache
    if (CACHE_UTILS.checkCacheCondition(req, enhancedPlan)) {
      return res.status(304).end(); // Not Modified
    }

    // Set caching headers
    CACHE_UTILS.setCacheHeaders(res, enhancedPlan, 'plan');

    // Optimize response based on query parameters
    const optimizeOptions = {
      includeChapters: !req.query.excludeChapters,
      includeActivities: !req.query.excludeActivities,
      includeStatus: !req.query.excludeStatus,
      includeMetadata: !req.query.excludeMetadata
    };

    const optimizedPlan = CACHE_UTILS.optimizePlanResponse(enhancedPlan, optimizeOptions);

    res.json(optimizedPlan);
  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN_FETCH', {
      studentId: parseInt(studentId)
    });
  }
});

// POST /api/plans/:id/complete - Mark a plan as complete
router.post('/:id/complete', authenticate, async (req, res) => {
  const { id } = req.params;
  const parentId = req.user.id;

  try {
    // Fetch the plan and verify it belongs to the authenticated parent
    const plan = await prisma.plan.findFirst({
      where: {
        id: parseInt(id),
        student: {
          parentId
        }
      },
      include: {
        student: true,
        days: {
          orderBy: { dayIndex: 'asc' },
          include: {
            activities: true
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ 
        message: 'Plan not found or access denied',
        error: 'PLAN_NOT_FOUND'
      });
    }

    // Check if all 5 days are complete
    const allDaysComplete = plan.days.every(day => day.state === 'complete');
    
    if (!allDaysComplete) {
      const incompleteDays = plan.days
        .filter(day => day.state !== 'complete')
        .map(day => day.dayIndex);
      
      return res.status(400).json({ 
        message: 'Cannot complete plan. All days must be finished first.',
        error: 'INCOMPLETE_DAYS',
        incompleteDays
      });
    }

    // Check if plan is already completed
    if (plan.status === 'completed') {
      return res.status(400).json({ 
        message: 'Plan is already marked as complete.',
        error: 'PLAN_ALREADY_COMPLETE'
      });
    }

    // Mark the plan as completed
    const updatedPlan = await prisma.plan.update({
      where: { id: parseInt(id) },
      data: {
        status: 'completed',
        updatedAt: new Date()
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
          orderBy: { dayIndex: 'asc' },
          include: {
            activities: {
              orderBy: { id: 'asc' }
            }
          }
        }
      }
    });

    // Calculate completion statistics
    const totalActivities = plan.days.reduce((sum, day) => sum + day.activities.length, 0);
    const completedActivities = plan.days.reduce((sum, day) => 
      sum + day.activities.filter(activity => activity.isValid).length, 0
    );

    const completionStats = {
      totalDays: plan.days.length,
      completedDays: plan.days.filter(day => day.state === 'complete').length,
      totalActivities,
      completedActivities,
      completionRate: Math.round((completedActivities / totalActivities) * 100),
      completedAt: updatedPlan.updatedAt
    };

    // Generate a new plan for the student after completing the current plan
    console.log(`Generating new plan for student ${plan.student.name} after completing plan ${id}`);
    
    try {
      // Generate a new story for the new plan
      const newStoryData = await generateStory(plan.student, plan.theme);
      
      // Create the new plan structure
      const newPlan = await prisma.plan.create({
        data: {
          studentId: plan.student.id,
          name: newStoryData.title,
          theme: newStoryData.themes[0], // Use the first theme
          status: 'active'
        }
      });

      // Create the story record linked to the new plan
      const newStory = await prisma.story.create({
        data: {
          planId: newPlan.id,
          title: newStoryData.title,
          themes: newStoryData.themes,
          part1: newStoryData.part1,
          part2: newStoryData.part2,
          part3: newStoryData.part3,
          vocabulary: newStoryData.vocabulary
        }
      });

      // Create the 5 days for the new plan
      const newDays = await Promise.all(
        Array.from({ length: 5 }, (_, index) => 
          prisma.day.create({
            data: {
              planId: newPlan.id,
              dayIndex: index + 1,
              state: index === 0 ? 'available' : 'locked'
            }
          })
        )
      );

      // Scaffold initial activities for the new plan (reuse the same logic from POST /api/plans)
      const newDayActivities = [];

      // Day 1: Vocabulary Matching
      const newDay1Activities = [{
        dayId: newDays[0].id,
        type: 'matching',
        prompt: 'Match each vocabulary word with its correct definition from Chapter 1.',
        data: {
          pairs: newStoryData.vocabulary.map(vocab => ({
            word: vocab.word,
            definition: vocab.definition
          })),
          instructions: 'Match all 6 vocabulary words with their correct definitions. All pairs must be correct to complete this activity.'
        },
        response: null,
        isValid: null
      }];
      newDayActivities.push(...newDay1Activities);

      // Day 2: Comprehension Matching
      const newDay2Activities = [{
        dayId: newDays[1].id,
        type: 'matching',
        prompt: 'Match the prompts with their correct answers based on Chapter 2.',
        data: {
          pairs: [
            { prompt: 'What was the main challenge in Chapter 2?', answer: 'To be generated based on story content' },
            { prompt: 'How did the character respond to the challenge?', answer: 'To be generated based on story content' },
            { prompt: 'What was the setting of Chapter 2?', answer: 'To be generated based on story content' },
            { prompt: 'What was the outcome of the main event?', answer: 'To be generated based on story content' },
            { prompt: 'What lesson did the character learn?', answer: 'To be generated based on story content' }
          ],
          instructions: 'Match all 5 comprehension questions with their correct answers. All pairs must be correct to complete this activity.'
        },
        response: null,
        isValid: null
      }];
      newDayActivities.push(...newDay2Activities);

      // Day 3: Choice-based Reflection
      const newDay3Activities = [{
        dayId: newDays[2].id,
        type: 'reflection',
        prompt: 'Choose your reflection style and complete the activity.',
        data: {
          choice: null,
          options: {
            oneGoodTwoBad: {
              label: 'Option A: 1 good thing, 2 things to improve',
              fields: [
                { label: 'One good thing about the story', required: true },
                { label: 'First thing that could be improved', required: true },
                { label: 'Second thing that could be improved', required: true }
              ]
            },
            twoGoodOneBad: {
              label: 'Option B: 2 good things, 1 thing to improve',
              fields: [
                { label: 'First good thing about the story', required: true },
                { label: 'Second good thing about the story', required: true },
                { label: 'One thing that could be improved', required: true }
              ]
            }
          },
          instructions: 'Choose your reflection style and provide thoughtful responses for all three fields.'
        },
        response: null,
        isValid: null
      }];
      newDayActivities.push(...newDay3Activities);

      // Day 4: Conditional Writing + Optional Upload
      const newDay4Activities = [{
        dayId: newDays[3].id,
        type: 'writing',
        prompt: 'Write based on your Day 3 choice.',
        data: {
          conditionalPrompt: {
            oneGoodTwoBad: 'Write what you would change to make the story better. (1-3 paragraphs)',
            twoGoodOneBad: 'Write what you think will happen on the next adventure in the series. (1-3 paragraphs)'
          },
          instructions: 'Write 1-3 paragraphs based on your Day 3 reflection choice. Uploading a drawing is optional.',
          requiresDay3Choice: true
        },
        response: null,
        isValid: null
      }, {
        dayId: newDays[3].id,
        type: 'upload',
        prompt: 'Optional: Draw what you described and upload it.',
        data: {
          acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
          maxSize: 10485760,
          instructions: 'Upload an image file (PNG, JPEG, or WebP) up to 10MB. This is optional.',
          isOptional: true
        },
        response: null,
        isValid: null
      }];
      newDayActivities.push(...newDay4Activities);

      // Day 5: Activity Ideas
      const newDay5Activities = [{
        dayId: newDays[4].id,
        type: 'multi-select',
        prompt: 'Select and complete at least 2 activities from the list below.',
        data: {
          activities: [
            {
              id: 'sequence-builder',
              type: 'sequence',
              label: 'Sequence Builder',
              description: 'Reorder 8-10 story beats in the correct sequence.',
              required: false
            },
            {
              id: 'alternate-ending',
              type: 'writing',
              label: 'Alternate Ending',
              description: 'Write a short alternate ending (1-2 paragraphs).',
              required: false
            },
            {
              id: 'character-journal',
              type: 'writing',
              label: 'Character Journal',
              description: 'Write a journal entry from a character\'s point of view.',
              required: false
            },
            {
              id: 'dialogue-rewrite',
              type: 'writing',
              label: 'Dialogue Rewrite',
              description: 'Rewrite a scene as dialogue only (script format).',
              required: false
            },
            {
              id: 'poster-slogan',
              type: 'writing',
              label: 'Poster/Slogan',
              description: 'Create a tagline and short blurb for a poster.',
              required: false
            },
            {
              id: 'vocabulary-author',
              type: 'writing',
              label: 'Vocabulary Author',
              description: 'Create 4 new vocabulary words with definitions and example sentences.',
              required: false
            }
          ],
          instructions: 'You must select and complete at least 2 activities. No activities are pre-selected.',
          minRequired: 2
        },
        response: null,
        isValid: null
      }];
      newDayActivities.push(...newDay5Activities);

      // Create all activities for the new plan
      await Promise.all(
        newDayActivities.map(activity => 
          prisma.activity.create({
            data: activity
          })
        )
      );

      console.log(`Successfully generated new plan ${newPlan.id} with story: ${newStory.title}`);

      res.json({
        message: 'Plan completed successfully! A new plan has been generated.',
        plan: updatedPlan,
        completionStats,
        newPlan: {
          id: newPlan.id,
          name: newPlan.name,
          theme: newPlan.theme,
          storyTitle: newStory.title
        },
        nextSteps: 'You can now start the new plan with fresh content.'
      });

    } catch (newPlanError) {
      console.error('Error generating new plan:', newPlanError);
      
      // If new plan generation fails, still return the completion response
      res.json({
        message: 'Plan completed successfully! New plan generation failed.',
        plan: updatedPlan,
        completionStats,
        error: 'NEW_PLAN_GENERATION_FAILED',
        errorDetails: newPlanError.message,
        nextSteps: 'You can manually generate a new plan when ready.'
      });
    }

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN_COMPLETION', {
      planId: parseInt(id)
    });
  }
});

// POST /api/plans/activity/generate
router.post('/activity/generate', authenticate, validateSequentialAccess, modelOverrideMiddleware(), async (req, res) => {
  const { planId, dayOfWeek } = req.body;
  const parentId = req.user.id;

  if (dayOfWeek < 1 || dayOfWeek > 7) {
    return res.status(400).json({ message: 'Day of week must be between 1 and 7' });
  }

  try {
    // Verify the plan belongs to a student of the authenticated parent
    const plan = await prisma.weeklyPlan.findFirst({
      where: {
        id: parseInt(planId),
        student: {
          parentId
        }
      },
      include: {
        student: true,
        chapters: {
          orderBy: { chapterNumber: 'asc' }
        },
        dailyActivities: {
          where: { dayOfWeek: parseInt(dayOfWeek) },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Check if activity for this day already exists
    const existingActivity = plan.dailyActivities.find(activity => activity.dayOfWeek === parseInt(dayOfWeek));
    if (existingActivity) {
      return res.status(409).json({ 
        message: `Activity for day ${dayOfWeek} already exists`,
        activity: existingActivity
      });
    }

    // Sequential access validation is handled by middleware

    console.log(`Generating on-demand activity for plan ${planId}, day ${dayOfWeek}`);
    
    // Generate the activity using the fallback system with model override if provided
    const modelOverride = req.modelOverride ? req.applyModelOverride('daily_task_generation', getModelConfigWithOverride(req, 'daily_task_generation')) : null;
    const activityData = await generateActivityWithFallback(plan.student, plan, parseInt(dayOfWeek), modelOverride);

    // Save the generated activity to the database
    const newActivity = await prisma.dailyActivity.create({
      data: {
        planId: parseInt(planId),
        dayOfWeek: parseInt(dayOfWeek),
        activityType: activityData.activityType,
        content: activityData.content,
        completed: false
      }
    });

    console.log(`✅ Successfully generated and saved activity for day ${dayOfWeek}`);

    // Set caching headers for activity
    CACHE_UTILS.setCacheHeaders(res, newActivity, 'activity');

    res.status(201).json({
      message: `Activity for day ${dayOfWeek} generated successfully`,
      activity: newActivity
    });

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'ACTIVITY_GENERATION', {
      studentId: plan.student.id,
      studentName: plan.student.name,
      planId: parseInt(planId),
      dayOfWeek: parseInt(dayOfWeek)
    });
  }
});

// PUT /api/plans/:id/days/:index - Save and validate day activities
router.put('/:id/days/:index', authenticate, async (req, res) => {
  const { id, index } = req.params;
  const { activities } = req.body;
  const parentId = req.user.id;

  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ message: 'Activities array is required' });
  }

  try {
    // Fetch the plan and verify it belongs to the authenticated parent
    const plan = await prisma.plan.findFirst({
      where: {
        id: parseInt(id),
        student: {
          parentId
        }
      },
      include: {
        student: true,
        days: {
          where: { dayIndex: parseInt(index) },
          include: {
            activities: true
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ 
        message: 'Plan not found or access denied',
        error: 'PLAN_NOT_FOUND'
      });
    }

    const day = plan.days[0];
    if (!day) {
      return res.status(404).json({ 
        message: `Day ${index} not found`,
        error: 'DAY_NOT_FOUND'
      });
    }

    // Check if day is available for completion
    if (day.state === 'locked') {
      return res.status(400).json({ 
        message: `Day ${index} is locked. Complete previous days first.`,
        error: 'DAY_LOCKED'
      });
    }

    if (day.state === 'complete') {
      return res.status(400).json({ 
        message: `Day ${index} is already complete.`,
        error: 'DAY_ALREADY_COMPLETE'
      });
    }

    // Validate activities based on their types
    const validationResults = [];
    let allValid = true;

    for (const activity of activities) {
      const isValid = validateActivityResponse(activity, day.dayIndex);
      validationResults.push({
        activityId: activity.id,
        type: activity.type,
        isValid
      });
      
      if (!isValid) {
        allValid = false;
      }
    }

    // Update activities with responses and validation status
    const updatedActivities = await Promise.all(
      activities.map(async (activity) => {
        const validationResult = validationResults.find(r => r.activityId === activity.id);
        
        return await prisma.activity.update({
          where: { id: activity.id },
          data: {
            response: activity.response,
            isValid: validationResult.isValid,
            updatedAt: new Date()
          }
        });
      })
    );

    // If all activities are valid, mark the day as complete
    if (allValid) {
      await prisma.day.update({
        where: { id: day.id },
        data: {
          state: 'complete',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Check if this was the last day and update plan status if needed
      const allDays = await prisma.day.findMany({
        where: { planId: parseInt(id) },
        orderBy: { dayIndex: 'asc' }
      });

      const allComplete = allDays.every(d => d.state === 'complete');
      
      if (allComplete) {
        await prisma.plan.update({
          where: { id: parseInt(id) },
          data: {
            status: 'completed',
            updatedAt: new Date()
          }
        });
      } else {
        // Unlock the next day if it exists
        const nextDay = allDays.find(d => d.dayIndex === parseInt(index) + 1);
        if (nextDay && nextDay.state === 'locked') {
          await prisma.day.update({
            where: { id: nextDay.id },
            data: {
              state: 'available',
              updatedAt: new Date()
            }
          });
        }
      }
    }

    // Fetch updated plan for response
    const updatedPlan = await prisma.plan.findUnique({
      where: { id: parseInt(id) },
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
          orderBy: { dayIndex: 'asc' },
          include: {
            activities: {
              orderBy: { id: 'asc' }
            }
          }
        }
      }
    });

    res.json({
      message: allValid 
        ? `Day ${index} completed successfully!` 
        : `Day ${index} activities saved. Some activities need correction.`,
      activities: updatedActivities,
      validationResults,
      dayComplete: allValid,
      plan: updatedPlan
    });

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'DAY_ACTIVITY_UPDATE', {
      planId: parseInt(id),
      dayIndex: parseInt(index)
    });
  }
});

// PUT /api/plans/activity/:activityId
router.put('/activity/:activityId', authenticate, validateActivityAccess, async (req, res) => {
  const { studentResponse, markCompleted = true } = req.body;

  if (!studentResponse) {
    return res.status(400).json({ message: 'Student response is required' });
  }

  try {
    // Activity validation is handled by middleware
    const activity = req.activity;

    // Prepare update data
    const updateData = { 
      studentResponse,
      updatedAt: new Date()
    };

    // Mark as completed if requested and response is substantial
    if (markCompleted && studentResponse) {
      const hasSubstantialResponse = validateStudentResponse(studentResponse, activity.activityType);
      
      if (hasSubstantialResponse) {
        updateData.completed = true;
        updateData.completedAt = new Date();
        console.log(`✅ Marking activity ${activityId} as completed`);
      } else {
        console.log(`⚠️ Activity ${activityId} response insufficient, not marking as completed`);
      }
    }

    // Update the activity with the student's response and completion status
    const updatedActivity = await prisma.dailyActivity.update({
      where: { id: parseInt(activityId) },
      data: updateData
    });

    // Get updated plan status for response
    const planStatus = await getPlanStatus(activity.plan.id, prisma);

    // Set caching headers for activity response
    CACHE_UTILS.setCacheHeaders(res, updatedActivity, 'activity');

    res.json({
      activity: updatedActivity,
      planStatus: planStatus,
      message: updatedActivity.completed 
        ? `Activity completed successfully! Day ${activity.dayOfWeek} is now finished.`
        : 'Activity response saved successfully.'
    });

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'ACTIVITY_RESPONSE_UPDATE', {
      studentId: activity.plan.student.id,
      studentName: activity.plan.student.name,
      planId: activity.planId,
      dayOfWeek: activity.dayOfWeek
    });
  }
});

/**
 * Validates activity responses for the new 5-day plan structure
 * @param {object} activity - The activity with response data
 * @param {number} dayIndex - The day index (1-5)
 * @returns {boolean} - True if response is valid
 */
function validateActivityResponse(activity, dayIndex) {
  if (!activity.response) return false;

  switch (activity.type) {
    case 'matching':
      return validateMatchingActivity(activity.response, dayIndex);
    case 'reflection':
      return validateReflectionActivity(activity.response, dayIndex);
    case 'writing':
      return validateWritingActivity(activity.response, dayIndex);
    case 'multi-select':
      return validateMultiSelectActivity(activity.response, dayIndex);
    case 'upload':
      return validateUploadActivity(activity.response);
    default:
      return validateGenericActivity(activity.response);
  }
}

/**
 * Validates matching activities (Day 1 & 2)
 * Day 1: Vocabulary matching - all 6 pairs must be correct
 * Day 2: Comprehension matching - all 5 pairs must be correct
 */
function validateMatchingActivity(response, dayIndex) {
  if (!response.matches || !Array.isArray(response.matches)) return false;
  
  // Day 1 requires exactly 6 vocabulary pairs
  if (dayIndex === 1) {
    if (response.matches.length !== 6) return false;
  }
  
  // Day 2 requires exactly 4 comprehension pairs
  if (dayIndex === 2) {
    if (response.matches.length !== 4) return false;
  }
  
  // Check that all pairs are correctly matched
  const allCorrect = response.matches.every(match => 
    match.isCorrect === true && 
    match.word && 
    match.definition && 
    match.word.trim() !== '' && 
    match.definition.trim() !== ''
  );
  
  return allCorrect;
}

/**
 * Validates reflection activities (Day 3)
 * User must choose between Option A (1 good, 2 bad) or Option B (2 good, 1 bad)
 * All three text fields must be filled with meaningful responses
 */
function validateReflectionActivity(response, dayIndex) {
  if (!response.choice || !response.responses) return false;
  
  // Must choose either 'oneGoodTwoBad' or 'twoGoodOneBad'
  if (!['oneGoodTwoBad', 'twoGoodOneBad'].includes(response.choice)) return false;
  
  // Must have exactly 3 responses
  if (!Array.isArray(response.responses) || response.responses.length !== 3) return false;
  
  // All three responses must be non-empty and meaningful (at least 10 characters)
  const allResponsesValid = response.responses.every(response => 
    response && 
    typeof response === 'string' && 
    response.trim().length >= 10
  );
  
  return allResponsesValid;
}

/**
 * Validates writing activities (Day 4)
 * Day 4 requires 1-3 paragraphs based on Day 3 choice
 * Minimum 50 words for meaningful response (matches frontend)
 */
function validateWritingActivity(response, dayIndex) {
  console.log(`Validating writing activity for Day ${dayIndex}:`, {
    response,
    hasWriting: !!response.writing,
    hasText: !!response.text,
    writingLength: response.writing?.length,
    textLength: response.text?.length
  });

  // Check for both response.writing (old format) and response.text (new format)
  const writing = response.writing || response.text;
  if (!writing || typeof writing !== 'string') {
    console.log('Writing validation failed: no valid writing content');
    return false;
  }
  
  const writingText = writing.trim();
  const wordCount = writingText.split(/\s+/).length;
  
  // Day 4 requires substantial writing (1-3 paragraphs, minimum 50 words to match frontend)
  if (dayIndex === 4) {
    const isValid = wordCount >= 50 && writingText.length >= 150;
    console.log(`Day 4 writing validation:`, {
      wordCount,
      textLength: writingText.length,
      isValid,
      requirements: { minWords: 50, minChars: 150 }
    });
    return isValid;
  }
  
  // Other writing activities require at least 50 words
  const isValid = wordCount >= 50 && writingText.length >= 150;
  console.log(`Writing validation for Day ${dayIndex}:`, {
    wordCount,
    textLength: writingText.length,
    isValid,
    requirements: { minWords: 50, minChars: 150 }
  });
  return isValid;
}

/**
 * Validates multi-select activities (Day 5)
 * User must select at least 2 activities from the available options
 * Each selected activity must have a valid response
 */
function validateMultiSelectActivity(response, dayIndex) {
  if (!response.selectedActivities || !Array.isArray(response.selectedActivities)) return false;
  
  // Must select at least 2 activities
  if (response.selectedActivities.length < 2) return false;
  
  // Each selected activity must have a valid response
  const allActivitiesValid = response.selectedActivities.every(activity => {
    if (!activity.id || !activity.response) return false;
    
    // Validate based on activity type
    switch (activity.type) {
      case 'sequence':
        // Sequence must be at least 80% correct
        return validateSequenceActivity(activity.response);
      case 'writing':
        // Writing must be substantial
        return validateWritingResponse(activity.response);
      case 'upload':
        // Upload is optional, so always valid if present
        return true;
      default:
        return validateGenericActivity(activity.response);
    }
  });
  
  return allActivitiesValid;
}

/**
 * Validates sequence builder activities (Day 5)
 * Requires at least 80% correct ordering
 */
function validateSequenceActivity(response) {
  if (!response.sequence || !Array.isArray(response.sequence)) return false;
  
  // For now, accept any sequence with at least 6 items
  // In a full implementation, this would compare against the correct sequence
  return response.sequence.length >= 6;
}

/**
 * Validates writing responses in multi-select activities
 */
function validateWritingResponse(response) {
  if (!response || typeof response !== 'string') return false;
  
  const writing = response.trim();
  const wordCount = writing.split(/\s+/).length;
  
  // Require at least 30 words for writing activities
  return wordCount >= 30 && writing.length >= 100;
}

/**
 * Validates upload activities (Day 4 optional upload)
 * Upload is optional, so always valid if present
 */
function validateUploadActivity(response) {
  // Upload is optional, so if no response, it's still valid
  if (!response) return true;
  
  // If response exists, validate it has required fields
  if (typeof response === 'object' && response !== null) {
    return response.url && response.filename;
  }
  
  return false;
}

/**
 * Validates generic activity responses
 */
function validateGenericActivity(response) {
  if (typeof response === 'string') {
    return response.trim().length >= 10;
  } else if (typeof response === 'object' && response !== null) {
    return Object.keys(response).length > 0;
  }
  return false;
}

/**
 * Validates if a student response is substantial enough to mark activity as completed
 * @param {object} studentResponse - The student's response data
 * @param {string} activityType - The type of activity
 * @returns {boolean} - True if response is substantial enough
 */
function validateStudentResponse(studentResponse, activityType) {
  if (!studentResponse) return false;

  // Check for different activity types
  switch (activityType) {
    case 'Story Kickoff':
      return validateStoryKickoffResponse(studentResponse);
    case 'Building Connections':
      return validateBuildingConnectionsResponse(studentResponse);
    case 'Story Climax':
      return validateStoryClimaxResponse(studentResponse);
    case 'Story Review & Game':
    case 'Topic Exploration':
    case 'Creative Expression':
    case 'Visual & Reflective':
      return validateCreativeActivityResponse(studentResponse);
    default:
      return validateGenericResponse(studentResponse);
  }
}

/**
 * Validates Story Kickoff activity response
 */
function validateStoryKickoffResponse(response) {
  const hasPrediction = response.predictionWarmUp && response.predictionWarmUp.trim().length > 10;
  const hasVocabulary = response.vocabularyInContext && Array.isArray(response.vocabularyInContext) && response.vocabularyInContext.length > 0;
  const hasComprehension = response.comprehensionQuestions && Array.isArray(response.comprehensionQuestions) && response.comprehensionQuestions.length > 0;
  const hasReflection = response.reflectionPrompt && response.reflectionPrompt.trim().length > 10;
  
  return hasPrediction && hasVocabulary && hasComprehension && hasReflection;
}

/**
 * Validates Building Connections activity response
 */
function validateBuildingConnectionsResponse(response) {
  const hasReview = response.chapter1Review && Array.isArray(response.chapter1Review) && response.chapter1Review.length > 0;
  const hasVocabulary = response.vocabularyWordMap && Array.isArray(response.vocabularyWordMap) && response.vocabularyWordMap.length > 0;
  const hasComprehension = response.comprehensionQuestions && Array.isArray(response.comprehensionQuestions) && response.comprehensionQuestions.length > 0;
  const hasCharacterSpotlight = response.characterSpotlight && response.characterSpotlight.trim().length > 10;
  
  return hasReview && hasVocabulary && hasComprehension && hasCharacterSpotlight;
}

/**
 * Validates Story Climax activity response
 */
function validateStoryClimaxResponse(response) {
  const hasReview = response.chapter2Review && Array.isArray(response.chapter2Review) && response.chapter2Review.length > 0;
  const hasVocabulary = response.vocabularyChallenge && Array.isArray(response.vocabularyChallenge) && response.vocabularyChallenge.length > 0;
  const hasComprehension = response.comprehensionQuestions && Array.isArray(response.comprehensionQuestions) && response.comprehensionQuestions.length > 0;
  const hasQuickRetell = response.quickRetell && response.quickRetell.trim().length > 20;
  
  return hasReview && hasVocabulary && hasComprehension && hasQuickRetell;
}

/**
 * Validates creative activity response
 */
function validateCreativeActivityResponse(response) {
  // For creative activities, check if there's any substantial response
  const responseKeys = Object.keys(response);
  return responseKeys.length > 0 && responseKeys.some(key => {
    const value = response[key];
    if (typeof value === 'string') {
      return value.trim().length > 10;
    } else if (Array.isArray(value)) {
      return value.length > 0;
    } else if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length > 0;
    }
    return false;
  });
}

/**
 * Validates generic response
 */
function validateGenericResponse(response) {
  if (typeof response === 'string') {
    return response.trim().length > 10;
  } else if (typeof response === 'object' && response !== null) {
    return Object.keys(response).length > 0;
  }
  return false;
}

/**
 * Gets updated plan status after activity completion
 * @param {number} planId - The plan ID
 * @param {object} prisma - Prisma client
 * @returns {Promise<object>} - Plan status
 */
async function getPlanStatus(planId, prisma) {
  try {
    const activities = await prisma.dailyActivity.findMany({
      where: { planId },
      orderBy: { dayOfWeek: 'asc' }
    });

    const completedActivities = activities.filter(activity => activity.completed);
    const progress = Math.round((completedActivities.length / 7) * 100);

    return {
      totalDays: 7,
      completedDays: completedActivities.length,
      progress: progress,
      nextAvailableDay: completedActivities.length < 7 ? completedActivities.length + 1 : null
    };
  } catch (error) {
    console.error('Error getting plan status:', error);
    return {
      totalDays: 7,
      completedDays: 0,
      progress: 0,
      nextAvailableDay: 1
    };
  }
}

// GET /api/plans/:studentId/genre-history
router.get('/:studentId/genre-history', authenticate, async (req, res) => {
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

    // Get genre history with analytics
    const { getGenreVarietyStats } = await import('../lib/genreSelector.js');
    
    // Get recent genre history (last 20 entries)
    const genreHistory = await prisma.studentGenreHistory.findMany({
      where: { studentId: parseInt(studentId) },
      orderBy: { usedAt: 'desc' },
      take: 20,
      select: {
        genreCombination: true,
        usedAt: true
      }
    });

    // Get variety statistics
    const varietyStats = await getGenreVarietyStats(parseInt(studentId));

    // Calculate genre frequency
    const genreFrequency = {};
    genreHistory.forEach(entry => {
      genreFrequency[entry.genreCombination] = (genreFrequency[entry.genreCombination] || 0) + 1;
    });

    // Get most and least used genres
    const sortedGenres = Object.entries(genreFrequency)
      .sort(([,a], [,b]) => b - a);
    
    const mostUsedGenres = sortedGenres.slice(0, 3).map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / genreHistory.length) * 100)
    }));

    const leastUsedGenres = sortedGenres.slice(-3).map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / genreHistory.length) * 100)
    }));

    res.status(200).json({
      studentId: parseInt(studentId),
      studentName: student.name,
      genreHistory: genreHistory.map(entry => ({
        ...entry,
        usedAt: entry.usedAt.toISOString()
      })),
      analytics: {
        totalCombinations: varietyStats.totalCombinations,
        uniqueCombinations: varietyStats.uniqueCombinations,
        varietyScore: varietyStats.varietyScore,
        mostUsedGenres,
        leastUsedGenres,
        recentActivity: genreHistory.length > 0 ? {
          lastUsed: genreHistory[0].usedAt.toISOString(),
          lastGenre: genreHistory[0].genreCombination
        } : null
      }
    });

  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'GENRE_HISTORY_RETRIEVAL', {
      studentId: parseInt(studentId),
      studentName: student?.name
    });
  }
});

// GET /api/plans/admin/genre-analytics
router.get('/admin/genre-analytics', authenticate, async (req, res) => {
  try {
    // Check if user is admin (you can implement your own admin check logic)
    // For now, we'll allow any authenticated user to access admin endpoints
    // In production, you should implement proper admin role checking
    
    const { 
      getGenreCompletionRates, 
      getOverallGenrePerformance, 
      getGenreEngagementMetrics,
      getGenreSystemPerformance 
    } = await import('../lib/genreAnalytics.js');

    const { daysBack = 30 } = req.query;
    const daysBackNum = parseInt(daysBack);

    // Get overall system performance
    const systemPerformance = await getGenreSystemPerformance();

    // Get overall genre performance across all students
    const overallPerformance = await getOverallGenrePerformance(daysBackNum);

    res.status(200).json({
      timestamp: new Date().toISOString(),
      period: `${daysBackNum} days`,
      systemPerformance,
      overallPerformance,
      summary: {
        totalStudents: systemPerformance.systemMetrics.totalStudents,
        totalPlans: overallPerformance.summary.totalPlans,
        averageCompletionRate: overallPerformance.summary.averagePlanCompletionRate,
        topPerformingGenre: overallPerformance.topGenres[0]?.genre || 'N/A',
        topPerformingStudent: overallPerformance.topStudents[0]?.studentName || 'N/A'
      }
    });

  } catch (error) {
    console.error('Error fetching admin genre analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching admin analytics',
      error: error.message 
    });
  }
});

// GET /api/plans/admin/student/:studentId/genre-analytics
router.get('/admin/student/:studentId/genre-analytics', authenticate, async (req, res) => {
  const { studentId } = req.params;
  const { daysBack = 30 } = req.query;
  const daysBackNum = parseInt(daysBack);

  try {
    // Verify the student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      select: { id: true, name: true, gradeLevel: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const { 
      getGenreCompletionRates, 
      getGenreEngagementMetrics,
      getGenreVarietyStats 
    } = await import('../lib/genreAnalytics.js');

    // Get various analytics for the student
    const completionRates = await getGenreCompletionRates(parseInt(studentId), daysBackNum);
    const engagementMetrics = await getGenreEngagementMetrics(parseInt(studentId), daysBackNum);
    const varietyStats = await getGenreVarietyStats(parseInt(studentId));

    res.status(200).json({
      timestamp: new Date().toISOString(),
      student: {
        id: student.id,
        name: student.name,
        gradeLevel: student.gradeLevel
      },
      period: `${daysBackNum} days`,
      completionRates,
      engagementMetrics,
      varietyStats,
      summary: {
        totalPlans: completionRates.summary.totalPlans,
        averageCompletionRate: completionRates.summary.averagePlanCompletionRate,
        varietyScore: varietyStats.varietyScore,
        mostEngagedGenre: Object.keys(engagementMetrics.genreEngagement).length > 0 
          ? Object.entries(engagementMetrics.genreEngagement)
              .sort(([,a], [,b]) => b.completionRate - a.completionRate)[0][0]
          : 'N/A'
      }
    });

  } catch (error) {
    console.error('Error fetching student genre analytics:', error);
    res.status(500).json({ 
      message: 'Error fetching student analytics',
      error: error.message 
    });
  }
});

// GET /api/plans/admin/genre-performance
router.get('/admin/genre-performance', authenticate, async (req, res) => {
  const { daysBack = 30, limit = 10 } = req.query;
  const daysBackNum = parseInt(daysBack);
  const limitNum = parseInt(limit);

  try {
    const { getOverallGenrePerformance } = await import('../lib/genreAnalytics.js');
    
    const performance = await getOverallGenrePerformance(daysBackNum);

    // Get top and bottom performing genres
    const sortedGenres = Object.entries(performance.genrePerformance)
      .sort(([,a], [,b]) => b.planCompletionRate - a.planCompletionRate);

    const topGenres = sortedGenres.slice(0, limitNum);
    const bottomGenres = sortedGenres.slice(-limitNum).reverse();

    res.status(200).json({
      timestamp: new Date().toISOString(),
      period: `${daysBackNum} days`,
      topGenres: topGenres.map(([genre, stats]) => ({
        genre,
        planCompletionRate: stats.planCompletionRate,
        activityCompletionRate: stats.activityCompletionRate,
        totalPlans: stats.totalPlans,
        uniqueStudents: stats.uniqueStudents,
        gradeLevels: stats.gradeLevels
      })),
      bottomGenres: bottomGenres.map(([genre, stats]) => ({
        genre,
        planCompletionRate: stats.planCompletionRate,
        activityCompletionRate: stats.activityCompletionRate,
        totalPlans: stats.totalPlans,
        uniqueStudents: stats.uniqueStudents,
        gradeLevels: stats.gradeLevels
      })),
      summary: {
        totalGenres: Object.keys(performance.genrePerformance).length,
        averageCompletionRate: performance.summary.averagePlanCompletionRate,
        bestPerformingGenre: topGenres[0]?.[0] || 'N/A',
        worstPerformingGenre: bottomGenres[0]?.[0] || 'N/A'
      }
    });

  } catch (error) {
    console.error('Error fetching genre performance:', error);
    res.status(500).json({ 
      message: 'Error fetching genre performance',
      error: error.message 
    });
  }
});

// GET /api/plans/student/:studentId - Get the most recent plan for a student
router.get('/student/:studentId', authenticate, async (req, res) => {
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

    // Get the most recent plan for the student
    const plan = await prisma.plan.findFirst({
      where: { studentId: parseInt(studentId) },
      include: {
        student: true,
        story: true,
        days: {
          orderBy: { dayIndex: 'asc' },
          include: {
            activities: {
              orderBy: { id: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!plan) {
      return res.status(404).json({ message: 'No plan found for this student' });
    }

    res.status(200).json({
      plan: plan
    });

  } catch (error) {
    console.error('Error fetching plan for student:', error);
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN_FETCH_BY_STUDENT', {
      studentId: parseInt(studentId)
    });
  }
});

// DELETE /api/plans/student/:studentId - Delete the most recent plan for a student
router.delete('/student/:studentId', authenticate, async (req, res) => {
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

    // Get the most recent plan for the student
    const plan = await prisma.plan.findFirst({
      where: { studentId: parseInt(studentId) },
      orderBy: { createdAt: 'desc' }
    });

    if (!plan) {
      return res.status(404).json({ message: 'No plan found for this student' });
    }

    // Delete plan (cascades via foreign keys to story/days/activities)
    await prisma.plan.delete({ where: { id: plan.id } });

    return res.status(200).json({
      message: `Deleted plan ${plan.id} for student ${student.name}`,
      deletedPlanId: plan.id
    });
  } catch (error) {
    ERROR_HANDLERS.handleRouteError(error, req, res, 'PLAN_DELETE_BY_STUDENT', {
      studentId: parseInt(studentId)
    });
  }
});

export default router; 