/**
 * Feature flag system for gradual rollout of enhanced activities
 * This system allows for:
 * - Gradual rollout to specific users/students
 * - A/B testing between old and new activity systems
 * - Easy rollback if issues are detected
 * - Environment-specific feature toggles
 */

export interface FeatureFlags {
  enhancedActivities: {
    enabled: boolean;
    rolloutPercentage: number;
    allowedStudentIds: string[];
    allowedPlanIds: string[];
    abTestEnabled: boolean;
    abTestPercentage: number;
  };
  enhancedProgressTracking: {
    enabled: boolean;
    rolloutPercentage: number;
  };
  enhancedAnalytics: {
    enabled: boolean;
    rolloutPercentage: number;
  };
}

// Default feature flags
const defaultFlags: FeatureFlags = {
  enhancedActivities: {
    enabled: true,
    rolloutPercentage: 100, // 100% rollout
    allowedStudentIds: [],
    allowedPlanIds: [],
    abTestEnabled: false,
    abTestPercentage: 50,
  },
  enhancedProgressTracking: {
    enabled: true,
    rolloutPercentage: 100,
  },
  enhancedAnalytics: {
    enabled: true,
    rolloutPercentage: 100,
  },
};

// Cache for feature flags
let cachedFlags: FeatureFlags | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch feature flags from the server
 */
async function fetchFeatureFlags(): Promise<FeatureFlags> {
  try {
    const response = await fetch('/api/feature-flags', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      console.warn('Failed to fetch feature flags, using defaults');
      return defaultFlags;
    }

    const flags = await response.json();
    return { ...defaultFlags, ...flags };
  } catch (error) {
    console.warn('Error fetching feature flags:', error);
    return defaultFlags;
  }
}

/**
 * Get feature flags with caching
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const now = Date.now();
  
  if (cachedFlags && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedFlags;
  }

  cachedFlags = await fetchFeatureFlags();
  lastFetchTime = now;
  
  return cachedFlags;
}

/**
 * Check if enhanced activities are enabled for a specific student and plan
 */
export async function isEnhancedActivitiesEnabled(
  studentId: string,
  planId?: string
): Promise<boolean> {
  const flags = await getFeatureFlags();
  const { enhancedActivities } = flags;

  if (!enhancedActivities.enabled) {
    return false;
  }

  // Check if student is in allowed list
  if (enhancedActivities.allowedStudentIds.length > 0) {
    if (!enhancedActivities.allowedStudentIds.includes(studentId)) {
      return false;
    }
  }

  // Check if plan is in allowed list
  if (planId && enhancedActivities.allowedPlanIds.length > 0) {
    if (!enhancedActivities.allowedPlanIds.includes(planId)) {
      return false;
    }
  }

  // Check rollout percentage
  const studentHash = hashString(studentId);
  const percentage = studentHash % 100;
  
  return percentage < enhancedActivities.rolloutPercentage;
}

/**
 * Check if A/B testing is enabled for a specific student
 */
export async function isABTestEnabled(studentId: string): Promise<boolean> {
  const flags = await getFeatureFlags();
  const { enhancedActivities } = flags;

  if (!enhancedActivities.abTestEnabled) {
    return false;
  }

  const studentHash = hashString(studentId);
  const percentage = studentHash % 100;
  
  return percentage < enhancedActivities.abTestPercentage;
}

/**
 * Check if enhanced progress tracking is enabled
 */
export async function isEnhancedProgressTrackingEnabled(): Promise<boolean> {
  const flags = await getFeatureFlags();
  const { enhancedProgressTracking } = flags;

  if (!enhancedProgressTracking.enabled) {
    return false;
  }

  // For progress tracking, we'll use a random percentage check
  const randomPercentage = Math.random() * 100;
  return randomPercentage < enhancedProgressTracking.rolloutPercentage;
}

/**
 * Check if enhanced analytics is enabled
 */
export async function isEnhancedAnalyticsEnabled(): Promise<boolean> {
  const flags = await getFeatureFlags();
  const { enhancedAnalytics } = flags;

  if (!enhancedAnalytics.enabled) {
    return false;
  }

  const randomPercentage = Math.random() * 100;
  return randomPercentage < enhancedAnalytics.rolloutPercentage;
}

/**
 * Simple hash function for consistent student assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Clear feature flag cache (useful for testing or manual refresh)
 */
export function clearFeatureFlagCache(): void {
  cachedFlags = null;
  lastFetchTime = 0;
}

/**
 * Get feature flag status for debugging
 */
export async function getFeatureFlagStatus(studentId: string, planId?: string): Promise<{
  enhancedActivities: boolean;
  abTest: boolean;
  enhancedProgressTracking: boolean;
  enhancedAnalytics: boolean;
  flags: FeatureFlags;
}> {
  const flags = await getFeatureFlags();
  
  return {
    enhancedActivities: await isEnhancedActivitiesEnabled(studentId, planId),
    abTest: await isABTestEnabled(studentId),
    enhancedProgressTracking: await isEnhancedProgressTrackingEnabled(),
    enhancedAnalytics: await isEnhancedAnalyticsEnabled(),
    flags,
  };
}
