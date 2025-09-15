# Enhanced Activities Developer Guide

This guide provides comprehensive documentation for the enhanced activities system, including architecture, implementation details, and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [API Reference](#api-reference)
6. [Feature Flags](#feature-flags)
7. [Analytics and Monitoring](#analytics-and-monitoring)
8. [Testing](#testing)
9. [Migration Guide](#migration-guide)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Overview

The enhanced activities system provides a comprehensive solution for creating, managing, and tracking educational activities with advanced features including:

- **AI-Powered Content Generation**: Automatic generation of story-specific activities
- **Cross-Device Synchronization**: Seamless progress tracking across devices
- **Offline Support**: Local storage fallback with sync on reconnection
- **Performance Monitoring**: Built-in analytics and performance tracking
- **Feature Flags**: Gradual rollout and A/B testing capabilities
- **Session Management**: Automatic session recovery and data protection

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Enhanced     │ │◄──►│ │Content      │ │◄──►│ │Activity     │ │
│ │ActivityPane │ │    │ │Generation   │ │    │ │Content      │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Progress     │ │◄──►│ │Progress     │ │◄──►│ │Activity     │ │
│ │Management   │ │    │ │API          │ │    │ │Progress     │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Analytics    │ │◄──►│ │Analytics    │ │◄──►│ │Analytics    │ │
│ │System       │ │    │ │API          │ │    │ │Events       │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Content Generation**: AI generates story-specific activities
2. **Caching**: Generated content is cached in the database
3. **Delivery**: Content is served to the frontend via API
4. **Progress Tracking**: User interactions are tracked and synchronized
5. **Analytics**: Performance and engagement data is collected

## Backend Implementation

### Content Generation

The content generation system uses AI to create story-specific activities:

```javascript
// Example: Generating enhanced activities
const enhancedContent = await generateEnhancedActivities({
  storyTitle: 'The Space Explorer',
  storyParts: [part1, part2, part3],
  themes: ['space', 'adventure', 'friendship'],
  gradeLevel: 3,
  interests: 'space, dinosaurs, robots'
});
```

### Key Files

- `backend/lib/enhancedActivityGeneration.js` - Core content generation logic
- `backend/routes/enhancedActivities.js` - API endpoints
- `backend/routes/analytics.js` - Analytics collection
- `backend/routes/featureFlags.js` - Feature flag management

### Database Schema

```sql
-- Activity content caching
CREATE TABLE ActivityContent (
  id SERIAL PRIMARY KEY,
  planId VARCHAR(255) NOT NULL,
  dayIndex INTEGER NOT NULL,
  content JSONB NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(planId, dayIndex)
);

-- Progress tracking
CREATE TABLE ActivityProgress (
  id SERIAL PRIMARY KEY,
  studentId VARCHAR(255) NOT NULL,
  planId VARCHAR(255) NOT NULL,
  dayIndex INTEGER NOT NULL,
  activityType VARCHAR(50) NOT NULL,
  progress JSONB NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(studentId, planId, dayIndex, activityType)
);

-- Analytics events
CREATE TABLE AnalyticsEvent (
  id SERIAL PRIMARY KEY,
  eventType VARCHAR(100) NOT NULL,
  eventData JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  studentId VARCHAR(255),
  planId VARCHAR(255),
  activityType VARCHAR(50),
  component VARCHAR(100),
  success BOOLEAN,
  duration INTEGER,
  metadata JSONB
);
```

## Frontend Implementation

### Core Components

#### EnhancedActivityPane

The main orchestrator component that manages the activity flow:

```typescript
interface EnhancedActivityPaneProps {
  planId: string;
  dayIndex: number;
  studentId: string;
  activities: EnhancedActivityContent[];
  onJumpToContext?: (anchorId: string) => void;
  className?: string;
}
```

#### useActivityProgress Hook

Manages progress state, synchronization, and persistence:

```typescript
const {
  progress,
  isLoading,
  updateProgress,
  saveResponse,
  completeActivity,
  isOnline,
  connectionQuality,
  forceSync,
  sessionInterrupted,
  recoverSession,
  // ... other properties
} = useActivityProgress({
  studentId,
  planId,
  dayIndex,
  activityType
});
```

### Key Files

- `frontend/src/components/activities/EnhancedActivityPane.tsx` - Main orchestrator
- `frontend/src/hooks/useActivityProgress.ts` - Progress management
- `frontend/src/lib/analytics.ts` - Analytics system
- `frontend/src/lib/featureFlags.ts` - Feature flag system
- `frontend/src/types/enhancedActivities.ts` - TypeScript interfaces

## API Reference

### Content Endpoints

#### GET `/api/enhanced-activities/:planId/:dayIndex`

Retrieves enhanced activities for a specific plan and day.

**Response:**
```json
{
  "activities": {
    "who": {
      "realCharacters": [...],
      "decoyCharacters": [...],
      "question": "Who is the main character?",
      "instructions": "Select the main character from the story."
    },
    "where": { ... },
    "sequence": { ... },
    "main-idea": { ... },
    "vocabulary": { ... },
    "predict": { ... }
  }
}
```

#### POST `/api/enhanced-activities/progress`

Saves activity progress.

**Request:**
```json
{
  "studentId": "123",
  "planId": "plan456",
  "dayIndex": 1,
  "activityType": "who",
  "progress": {
    "status": "completed",
    "attempts": 1,
    "responses": [...],
    "timeSpent": 120
  }
}
```

### Analytics Endpoints

#### POST `/api/analytics/events`

Collects analytics events.

#### GET `/api/analytics/summary`

Retrieves analytics summary.

### Feature Flag Endpoints

#### GET `/api/feature-flags`

Retrieves current feature flag configuration.

#### GET `/api/feature-flags/status/:studentId`

Gets feature flag status for a specific student.

## Feature Flags

The feature flag system allows for gradual rollout and A/B testing:

```typescript
// Check if enhanced activities are enabled
const enabled = await isEnhancedActivitiesEnabled(studentId, planId);

// Check A/B test assignment
const abTestEnabled = await isABTestEnabled(studentId);

// Get feature flag status
const status = await getFeatureFlagStatus(studentId, planId);
```

### Environment Variables

```bash
ENHANCED_ACTIVITIES_ENABLED=true
ENHANCED_ACTIVITIES_ROLLOUT_PERCENTAGE=100
ENHANCED_ACTIVITIES_ALLOWED_STUDENT_IDS=123,456,789
ENHANCED_ACTIVITIES_AB_TEST_ENABLED=false
ENHANCED_ACTIVITIES_AB_TEST_PERCENTAGE=50
```

## Analytics and Monitoring

### Event Types

- **Activity Events**: `activity_started`, `activity_completed`, `activity_error`, `activity_abandoned`
- **Performance Events**: `page_load`, `activity_load`, `content_generation`, `api_call`
- **User Engagement Events**: `session_start`, `session_end`, `feature_used`, `interaction`
- **A/B Test Events**: `ab_test_assigned`, `ab_test_completed`

### Performance Monitoring

```typescript
// Track performance metrics
const monitor = new PerformanceMonitor('EnhancedActivityPane');
// ... component logic ...
monitor.end(true, undefined, { activityCount: 5 });

// Track activity completion
const tracker = new ActivityTracker('who', planId, dayIndex, studentId);
tracker.recordAttempt();
tracker.complete(true, undefined, { correctAnswers: 3 });
```

## Testing

### Unit Tests

Run unit tests for specific components:

```bash
# Frontend tests
npm test -- --testPathPattern=useActivityProgress.test.ts
npm test -- --testPathPattern=EnhancedActivityPane.test.tsx

# Backend tests
npm test -- --testPathPattern=enhancedActivityGeneration.test.js
```

### Integration Tests

Run end-to-end integration tests:

```bash
npm test -- --testPathPattern=enhanced-activities.integration.test.js
```

### Test Coverage

The enhanced activities system includes comprehensive test coverage:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: End-to-end workflow testing
- **Performance Tests**: Load and stress testing
- **Accessibility Tests**: ARIA compliance and keyboard navigation

## Migration Guide

### From Legacy Components

1. **Update Imports**:
   ```typescript
   // Old
   import ActivityPane from '@/components/activities/ActivityPane';
   
   // New
   import EnhancedActivityPane from '@/components/activities/EnhancedActivityPane';
   ```

2. **Update Props**:
   ```typescript
   // Old
   <ActivityPane
     activities={activities}
     onActivityUpdate={handleUpdate}
   />
   
   // New
   <EnhancedActivityPane
     planId={planId}
     dayIndex={dayIndex}
     studentId={studentId}
     activities={activities}
   />
   ```

3. **Use Feature Flags**:
   ```typescript
   const useEnhanced = await isEnhancedActivitiesEnabled(studentId, planId);
   
   return useEnhanced ? (
     <EnhancedActivityPane {...props} />
   ) : (
     <LegacyActivityPane {...props} />
   );
   ```

### Database Migration

Run the migration script to generate enhanced content for existing plans:

```bash
cd backend
node scripts/migrate-to-enhanced-activities.js migrate
```

## Best Practices

### Performance

1. **Content Caching**: Always cache generated content to avoid regeneration
2. **Lazy Loading**: Load activities on demand
3. **Optimistic Updates**: Update UI immediately, sync in background
4. **Batch Operations**: Group API calls when possible

### Error Handling

1. **Graceful Degradation**: Provide fallbacks for failed operations
2. **User Feedback**: Show clear error messages and recovery options
3. **Retry Logic**: Implement exponential backoff for failed requests
4. **Offline Support**: Ensure functionality works without internet

### Accessibility

1. **ARIA Labels**: Provide proper labels for screen readers
2. **Keyboard Navigation**: Support full keyboard navigation
3. **Focus Management**: Maintain logical focus order
4. **Color Contrast**: Ensure sufficient color contrast ratios

### Security

1. **Input Validation**: Validate all user inputs
2. **Authentication**: Verify user permissions for all operations
3. **Data Sanitization**: Sanitize data before storage
4. **Rate Limiting**: Implement rate limiting for API endpoints

## Troubleshooting

### Common Issues

#### Content Generation Fails

**Symptoms**: Activities don't load, 500 errors
**Solutions**:
1. Check AI service connectivity
2. Verify story content format
3. Check rate limits
4. Review error logs

#### Progress Not Syncing

**Symptoms**: Progress lost, sync errors
**Solutions**:
1. Check network connectivity
2. Verify API endpoints
3. Check localStorage permissions
4. Review sync queue status

#### Performance Issues

**Symptoms**: Slow loading, timeouts
**Solutions**:
1. Check content caching
2. Review API response times
3. Monitor client-side performance
4. Check database query optimization

### Debug Tools

#### Frontend Debugging

```typescript
// Enable debug logging
localStorage.setItem('debug', 'enhanced-activities:*');

// Check analytics status
console.log(getAnalyticsSummary());

// Check feature flag status
console.log(await getFeatureFlagStatus(studentId, planId));
```

#### Backend Debugging

```bash
# Check migration status
node scripts/migrate-to-enhanced-activities.js status

# View analytics data
curl -X GET "http://localhost:3001/api/analytics/summary"

# Check feature flags
curl -X GET "http://localhost:3001/api/feature-flags/status/123"
```

### Logs and Monitoring

- **Application Logs**: Check server logs for errors
- **Analytics Dashboard**: Monitor user engagement and performance
- **Performance Metrics**: Track response times and error rates
- **Feature Flag Dashboard**: Monitor feature rollout status

## Support

For additional support:

1. **Documentation**: Check this guide and inline code comments
2. **Tests**: Review test files for usage examples
3. **Issues**: Report bugs through the project issue tracker
4. **Discussions**: Use project discussion forums for questions

---

*This documentation is maintained as part of the enhanced activities system. For updates and corrections, please submit a pull request.*
