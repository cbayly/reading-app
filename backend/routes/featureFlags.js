const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/feature-flags
 * Get current feature flags configuration
 */
router.get('/', async (req, res) => {
  try {
    // For now, return a static configuration
    // In a real implementation, this would be stored in the database
    const featureFlags = {
      enhancedActivities: {
        enabled: process.env.ENHANCED_ACTIVITIES_ENABLED === 'true' || true,
        rolloutPercentage: parseInt(process.env.ENHANCED_ACTIVITIES_ROLLOUT_PERCENTAGE) || 100,
        allowedStudentIds: process.env.ENHANCED_ACTIVITIES_ALLOWED_STUDENT_IDS?.split(',') || [],
        allowedPlanIds: process.env.ENHANCED_ACTIVITIES_ALLOWED_PLAN_IDS?.split(',') || [],
        abTestEnabled: process.env.ENHANCED_ACTIVITIES_AB_TEST_ENABLED === 'true' || false,
        abTestPercentage: parseInt(process.env.ENHANCED_ACTIVITIES_AB_TEST_PERCENTAGE) || 50,
      },
      enhancedProgressTracking: {
        enabled: process.env.ENHANCED_PROGRESS_TRACKING_ENABLED === 'true' || true,
        rolloutPercentage: parseInt(process.env.ENHANCED_PROGRESS_TRACKING_ROLLOUT_PERCENTAGE) || 100,
      },
      enhancedAnalytics: {
        enabled: process.env.ENHANCED_ANALYTICS_ENABLED === 'true' || true,
        rolloutPercentage: parseInt(process.env.ENHANCED_ANALYTICS_ROLLOUT_PERCENTAGE) || 100,
      },
    };

    res.json(featureFlags);
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

/**
 * POST /api/feature-flags
 * Update feature flags configuration (admin only)
 */
router.post('/', async (req, res) => {
  try {
    // In a real implementation, this would require admin authentication
    const { enhancedActivities, enhancedProgressTracking, enhancedAnalytics } = req.body;

    // Validate the feature flags structure
    if (!enhancedActivities || !enhancedProgressTracking || !enhancedAnalytics) {
      return res.status(400).json({ error: 'Invalid feature flags structure' });
    }

    // Store the updated feature flags
    // For now, we'll just log them. In a real implementation, this would be stored in the database
    console.log('Feature flags updated:', {
      enhancedActivities,
      enhancedProgressTracking,
      enhancedAnalytics,
    });

    res.json({ message: 'Feature flags updated successfully' });
  } catch (error) {
    console.error('Error updating feature flags:', error);
    res.status(500).json({ error: 'Failed to update feature flags' });
  }
});

/**
 * GET /api/feature-flags/status/:studentId
 * Get feature flag status for a specific student
 */
router.get('/status/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { planId } = req.query;

    // Simple hash function for consistent student assignment
    function hashString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    }

    // Get feature flags
    const featureFlags = {
      enhancedActivities: {
        enabled: process.env.ENHANCED_ACTIVITIES_ENABLED === 'true' || true,
        rolloutPercentage: parseInt(process.env.ENHANCED_ACTIVITIES_ROLLOUT_PERCENTAGE) || 100,
        allowedStudentIds: process.env.ENHANCED_ACTIVITIES_ALLOWED_STUDENT_IDS?.split(',') || [],
        allowedPlanIds: process.env.ENHANCED_ACTIVITIES_ALLOWED_PLAN_IDS?.split(',') || [],
        abTestEnabled: process.env.ENHANCED_ACTIVITIES_AB_TEST_ENABLED === 'true' || false,
        abTestPercentage: parseInt(process.env.ENHANCED_ACTIVITIES_AB_TEST_PERCENTAGE) || 50,
      },
      enhancedProgressTracking: {
        enabled: process.env.ENHANCED_PROGRESS_TRACKING_ENABLED === 'true' || true,
        rolloutPercentage: parseInt(process.env.ENHANCED_PROGRESS_TRACKING_ROLLOUT_PERCENTAGE) || 100,
      },
      enhancedAnalytics: {
        enabled: process.env.ENHANCED_ANALYTICS_ENABLED === 'true' || true,
        rolloutPercentage: parseInt(process.env.ENHANCED_ANALYTICS_ROLLOUT_PERCENTAGE) || 100,
      },
    };

    // Check if enhanced activities are enabled for this student
    let enhancedActivitiesEnabled = featureFlags.enhancedActivities.enabled;

    if (enhancedActivitiesEnabled) {
      // Check if student is in allowed list
      if (featureFlags.enhancedActivities.allowedStudentIds.length > 0) {
        enhancedActivitiesEnabled = featureFlags.enhancedActivities.allowedStudentIds.includes(studentId);
      }

      // Check if plan is in allowed list
      if (planId && featureFlags.enhancedActivities.allowedPlanIds.length > 0) {
        enhancedActivitiesEnabled = enhancedActivitiesEnabled && 
          featureFlags.enhancedActivities.allowedPlanIds.includes(planId);
      }

      // Check rollout percentage
      if (enhancedActivitiesEnabled) {
        const studentHash = hashString(studentId);
        const percentage = studentHash % 100;
        enhancedActivitiesEnabled = percentage < featureFlags.enhancedActivities.rolloutPercentage;
      }
    }

    // Check A/B testing
    let abTestEnabled = featureFlags.enhancedActivities.abTestEnabled;
    if (abTestEnabled) {
      const studentHash = hashString(studentId);
      const percentage = studentHash % 100;
      abTestEnabled = percentage < featureFlags.enhancedActivities.abTestPercentage;
    }

    // Check other features
    const enhancedProgressTrackingEnabled = featureFlags.enhancedProgressTracking.enabled && 
      (Math.random() * 100) < featureFlags.enhancedProgressTracking.rolloutPercentage;

    const enhancedAnalyticsEnabled = featureFlags.enhancedAnalytics.enabled && 
      (Math.random() * 100) < featureFlags.enhancedAnalytics.rolloutPercentage;

    res.json({
      studentId,
      planId,
      enhancedActivities: enhancedActivitiesEnabled,
      abTest: abTestEnabled,
      enhancedProgressTracking: enhancedProgressTrackingEnabled,
      enhancedAnalytics: enhancedAnalyticsEnabled,
      flags: featureFlags,
    });
  } catch (error) {
    console.error('Error getting feature flag status:', error);
    res.status(500).json({ error: 'Failed to get feature flag status' });
  }
});

module.exports = router;
