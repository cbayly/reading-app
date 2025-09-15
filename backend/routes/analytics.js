const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/analytics/events
 * Collect analytics events from the frontend
 */
router.post('/events', async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }

    // Process and store events
    const processedEvents = events.map(event => ({
      eventType: event.eventType,
      eventData: event,
      timestamp: new Date(event.timestamp),
      studentId: event.studentId || null,
      planId: event.planId || null,
      activityType: event.activityType || null,
      component: event.component || null,
      success: event.success !== undefined ? event.success : null,
      duration: event.duration || null,
      metadata: event.metadata || {},
    }));

    // Store events in database
    await prisma.analyticsEvent.createMany({
      data: processedEvents,
    });

    res.json({ message: 'Events recorded successfully', count: events.length });
  } catch (error) {
    console.error('Error recording analytics events:', error);
    res.status(500).json({ error: 'Failed to record events' });
  }
});

/**
 * GET /api/analytics/summary
 * Get analytics summary for dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate, studentId } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (studentId) {
      whereClause.studentId = studentId;
    }

    // Get activity completion metrics
    const activityMetrics = await prisma.analyticsEvent.groupBy({
      by: ['eventType', 'activityType'],
      where: {
        ...whereClause,
        eventType: {
          in: ['activity_started', 'activity_completed', 'activity_error', 'activity_abandoned'],
        },
      },
      _count: {
        id: true,
      },
    });

    // Get performance metrics
    const performanceMetrics = await prisma.analyticsEvent.groupBy({
      by: ['component', 'success'],
      where: {
        ...whereClause,
        eventType: {
          in: ['page_load', 'activity_load', 'content_generation', 'api_call'],
        },
      },
      _avg: {
        duration: true,
      },
      _count: {
        id: true,
      },
    });

    // Get user engagement metrics
    const engagementMetrics = await prisma.analyticsEvent.groupBy({
      by: ['eventType', 'feature'],
      where: {
        ...whereClause,
        eventType: {
          in: ['session_start', 'session_end', 'feature_used', 'interaction'],
        },
      },
      _count: {
        id: true,
      },
      _avg: {
        duration: true,
      },
    });

    // Calculate completion rates
    const completionRates = {};
    activityMetrics.forEach(metric => {
      if (!completionRates[metric.activityType]) {
        completionRates[metric.activityType] = {
          started: 0,
          completed: 0,
          errors: 0,
          abandoned: 0,
        };
      }
      completionRates[metric.activityType][metric.eventType.replace('activity_', '')] = metric._count.id;
    });

    // Calculate completion percentages
    Object.keys(completionRates).forEach(activityType => {
      const rates = completionRates[activityType];
      const totalStarted = rates.started;
      if (totalStarted > 0) {
        rates.completionRate = (rates.completed / totalStarted) * 100;
        rates.errorRate = (rates.errors / totalStarted) * 100;
        rates.abandonmentRate = (rates.abandoned / totalStarted) * 100;
      }
    });

    res.json({
      activityMetrics: completionRates,
      performanceMetrics,
      engagementMetrics,
      summary: {
        totalEvents: await prisma.analyticsEvent.count({ where: whereClause }),
        uniqueStudents: await prisma.analyticsEvent.groupBy({
          by: ['studentId'],
          where: whereClause,
          _count: { studentId: true },
        }).then(result => result.length),
      },
    });
  } catch (error) {
    console.error('Error generating analytics summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * GET /api/analytics/performance
 * Get detailed performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const { component, startDate, endDate } = req.query;

    const whereClause = {
      eventType: {
        in: ['page_load', 'activity_load', 'content_generation', 'api_call'],
      },
    };

    if (component) {
      whereClause.component = component;
    }
    if (startDate && endDate) {
      whereClause.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const performanceData = await prisma.analyticsEvent.findMany({
      where: whereClause,
      select: {
        component: true,
        duration: true,
        success: true,
        timestamp: true,
        metadata: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 1000, // Limit to recent events
    });

    // Calculate performance statistics
    const stats = performanceData.reduce((acc, event) => {
      if (!acc[event.component]) {
        acc[event.component] = {
          total: 0,
          successful: 0,
          failed: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
        };
      }

      const componentStats = acc[event.component];
      componentStats.total++;
      componentStats.totalDuration += event.duration || 0;

      if (event.success) {
        componentStats.successful++;
      } else {
        componentStats.failed++;
      }

      if (event.duration) {
        componentStats.minDuration = Math.min(componentStats.minDuration, event.duration);
        componentStats.maxDuration = Math.max(componentStats.maxDuration, event.duration);
      }

      return acc;
    }, {});

    // Calculate averages
    Object.keys(stats).forEach(component => {
      const componentStats = stats[component];
      componentStats.avgDuration = componentStats.total > 0 ? componentStats.totalDuration / componentStats.total : 0;
      componentStats.successRate = componentStats.total > 0 ? (componentStats.successful / componentStats.total) * 100 : 0;
      componentStats.minDuration = componentStats.minDuration === Infinity ? 0 : componentStats.minDuration;
    });

    res.json({
      performanceStats: stats,
      recentEvents: performanceData.slice(0, 100), // Return recent events for debugging
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

/**
 * GET /api/analytics/ab-tests
 * Get A/B test results
 */
router.get('/ab-tests', async (req, res) => {
  try {
    const { testName, startDate, endDate } = req.query;

    const whereClause = {
      eventType: {
        in: ['ab_test_assigned', 'ab_test_completed'],
      },
    };

    if (testName) {
      whereClause.metadata = {
        path: ['testName'],
        equals: testName,
      };
    }
    if (startDate && endDate) {
      whereClause.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const abTestData = await prisma.analyticsEvent.findMany({
      where: whereClause,
      select: {
        eventType: true,
        metadata: true,
        timestamp: true,
        studentId: true,
      },
    });

    // Process A/B test data
    const testResults = {};
    abTestData.forEach(event => {
      const testName = event.metadata.testName;
      const variant = event.metadata.variant;

      if (!testResults[testName]) {
        testResults[testName] = {
          control: { assigned: 0, completed: 0, successful: 0 },
          treatment: { assigned: 0, completed: 0, successful: 0 },
        };
      }

      if (event.eventType === 'ab_test_assigned') {
        testResults[testName][variant].assigned++;
      } else if (event.eventType === 'ab_test_completed') {
        testResults[testName][variant].completed++;
        if (event.metadata.success) {
          testResults[testName][variant].successful++;
        }
      }
    });

    // Calculate conversion rates
    Object.keys(testResults).forEach(testName => {
      const test = testResults[testName];
      ['control', 'treatment'].forEach(variant => {
        const variantData = test[variant];
        variantData.conversionRate = variantData.assigned > 0 ? (variantData.completed / variantData.assigned) * 100 : 0;
        variantData.successRate = variantData.completed > 0 ? (variantData.successful / variantData.completed) * 100 : 0;
      });
    });

    res.json({
      abTestResults: testResults,
    });
  } catch (error) {
    console.error('Error fetching A/B test results:', error);
    res.status(500).json({ error: 'Failed to fetch A/B test results' });
  }
});

module.exports = router;
