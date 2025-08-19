import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { generateStoryOnly, generateActivityWithFallback } from '../lib/openai.js';
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

// POST /api/plans/generate
router.post('/generate', authenticate, modelOverrideMiddleware(), async (req, res) => {
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

export default router; 