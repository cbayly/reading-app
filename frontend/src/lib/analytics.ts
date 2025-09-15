/**
 * Analytics system for enhanced activity usage and performance monitoring
 * This system tracks:
 * - Activity completion rates and times
 * - User engagement metrics
 * - Performance metrics (load times, errors)
 * - Feature flag usage
 * - A/B test results
 */

export interface ActivityEvent {
  eventType: 'activity_started' | 'activity_completed' | 'activity_error' | 'activity_abandoned';
  activityType: string;
  planId: string;
  dayIndex: number;
  studentId: string;
  timestamp: number;
  duration?: number;
  attempts?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceEvent {
  eventType: 'page_load' | 'activity_load' | 'content_generation' | 'api_call';
  component: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface UserEngagementEvent {
  eventType: 'session_start' | 'session_end' | 'feature_used' | 'interaction';
  feature: string;
  studentId: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ABTestEvent {
  eventType: 'ab_test_assigned' | 'ab_test_completed';
  testName: string;
  variant: 'control' | 'treatment';
  studentId: string;
  timestamp: number;
  success?: boolean;
  metadata?: Record<string, any>;
}

// Analytics queue for batching events
let eventQueue: (ActivityEvent | PerformanceEvent | UserEngagementEvent | ABTestEvent)[] = [];
let isProcessing = false;
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 5000; // 5 seconds

/**
 * Send analytics events to the server
 */
async function sendAnalyticsEvents(events: any[]): Promise<void> {
  try {
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      console.warn('Failed to send analytics events:', response.statusText);
    }
  } catch (error) {
    console.warn('Error sending analytics events:', error);
  }
}

/**
 * Process the analytics event queue
 */
async function processEventQueue(): Promise<void> {
  if (isProcessing || eventQueue.length === 0) {
    return;
  }

  isProcessing = true;

  try {
    const eventsToSend = eventQueue.splice(0, BATCH_SIZE);
    await sendAnalyticsEvents(eventsToSend);
  } catch (error) {
    console.error('Error processing analytics queue:', error);
    // Put events back in queue for retry
    eventQueue.unshift(...eventQueue.splice(0, BATCH_SIZE));
  } finally {
    isProcessing = false;

    // Process remaining events if any
    if (eventQueue.length > 0) {
      setTimeout(processEventQueue, 100);
    }
  }
}

/**
 * Add event to analytics queue
 */
function queueEvent(event: ActivityEvent | PerformanceEvent | UserEngagementEvent | ABTestEvent): void {
  eventQueue.push(event);

  // Process queue if it reaches batch size
  if (eventQueue.length >= BATCH_SIZE) {
    processEventQueue();
  }
}

/**
 * Track activity events
 */
export function trackActivityEvent(
  eventType: ActivityEvent['eventType'],
  activityType: string,
  planId: string,
  dayIndex: number,
  studentId: string,
  metadata?: Record<string, any>
): void {
  const event: ActivityEvent = {
    eventType,
    activityType,
    planId,
    dayIndex,
    studentId,
    timestamp: Date.now(),
    metadata,
  };

  queueEvent(event);
}

/**
 * Track performance events
 */
export function trackPerformanceEvent(
  eventType: PerformanceEvent['eventType'],
  component: string,
  duration: number,
  success: boolean,
  error?: string,
  metadata?: Record<string, any>
): void {
  const event: PerformanceEvent = {
    eventType,
    component,
    duration,
    timestamp: Date.now(),
    success,
    error,
    metadata,
  };

  queueEvent(event);
}

/**
 * Track user engagement events
 */
export function trackUserEngagementEvent(
  eventType: UserEngagementEvent['eventType'],
  feature: string,
  studentId: string,
  duration?: number,
  metadata?: Record<string, any>
): void {
  const event: UserEngagementEvent = {
    eventType,
    feature,
    studentId,
    timestamp: Date.now(),
    duration,
    metadata,
  };

  queueEvent(event);
}

/**
 * Track A/B test events
 */
export function trackABTestEvent(
  eventType: ABTestEvent['eventType'],
  testName: string,
  variant: 'control' | 'treatment',
  studentId: string,
  success?: boolean,
  metadata?: Record<string, any>
): void {
  const event: ABTestEvent = {
    eventType,
    testName,
    variant,
    studentId,
    timestamp: Date.now(),
    success,
    metadata,
  };

  queueEvent(event);
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private startTime: number;
  private component: string;

  constructor(component: string) {
    this.startTime = performance.now();
    this.component = component;
  }

  end(success: boolean = true, error?: string, metadata?: Record<string, any>): void {
    const duration = performance.now() - this.startTime;
    
    trackPerformanceEvent(
      'activity_load',
      this.component,
      duration,
      success,
      error,
      metadata
    );
  }
}

/**
 * Activity completion tracker
 */
export class ActivityTracker {
  private startTime: number;
  private activityType: string;
  private planId: string;
  private dayIndex: number;
  private studentId: string;
  private attempts: number = 0;

  constructor(
    activityType: string,
    planId: string,
    dayIndex: number,
    studentId: string
  ) {
    this.startTime = Date.now();
    this.activityType = activityType;
    this.planId = planId;
    this.dayIndex = dayIndex;
    this.studentId = studentId;

    trackActivityEvent(
      'activity_started',
      activityType,
      planId,
      dayIndex,
      studentId
    );
  }

  recordAttempt(): void {
    this.attempts++;
  }

  complete(success: boolean = true, error?: string, metadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    
    trackActivityEvent(
      success ? 'activity_completed' : 'activity_error',
      this.activityType,
      this.planId,
      this.dayIndex,
      this.studentId,
      {
        duration,
        attempts: this.attempts,
        error,
        ...metadata,
      }
    );
  }

  abandon(reason?: string): void {
    const duration = Date.now() - this.startTime;
    
    trackActivityEvent(
      'activity_abandoned',
      this.activityType,
      this.planId,
      this.dayIndex,
      this.studentId,
      {
        duration,
        attempts: this.attempts,
        reason,
      }
    );
  }
}

/**
 * Session tracker
 */
export class SessionTracker {
  private startTime: number;
  private studentId: string;
  private features: Set<string> = new Set();

  constructor(studentId: string) {
    this.startTime = Date.now();
    this.studentId = studentId;

    trackUserEngagementEvent(
      'session_start',
      'enhanced_activities',
      studentId
    );

    // Track session end when page is unloaded
    window.addEventListener('beforeunload', () => {
      this.end();
    });
  }

  trackFeature(feature: string): void {
    if (!this.features.has(feature)) {
      this.features.add(feature);
      trackUserEngagementEvent(
        'feature_used',
        feature,
        this.studentId
      );
    }
  }

  trackInteraction(interaction: string, metadata?: Record<string, any>): void {
    trackUserEngagementEvent(
      'interaction',
      interaction,
      this.studentId,
      undefined,
      metadata
    );
  }

  end(): void {
    const duration = Date.now() - this.startTime;
    
    trackUserEngagementEvent(
      'session_end',
      'enhanced_activities',
      this.studentId,
      duration,
      {
        featuresUsed: Array.from(this.features),
      }
    );
  }
}

/**
 * Initialize analytics system
 */
export function initializeAnalytics(): void {
  // Set up periodic processing of event queue
  setInterval(() => {
    if (eventQueue.length > 0) {
      processEventQueue();
    }
  }, BATCH_TIMEOUT);

  // Process any remaining events when page is unloaded
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Use sendBeacon for reliable delivery during page unload
      const events = eventQueue.splice(0);
      navigator.sendBeacon('/api/analytics/events', JSON.stringify({ events }));
    }
  });
}

/**
 * Get analytics summary for debugging
 */
export function getAnalyticsSummary(): {
  queueLength: number;
  isProcessing: boolean;
} {
  return {
    queueLength: eventQueue.length,
    isProcessing,
  };
}
