# Deprecated Activity Components

This directory contains legacy activity components that have been deprecated in favor of the enhanced activity system.

## Deprecated Components

The following components have been deprecated and moved to this directory:

### Core Activity Components
- `ActivityPane.tsx` - Replaced by `EnhancedActivityPane.tsx`
- `ChoiceReflectionActivity.tsx` - Enhanced version available in main directory
- `ConditionalWritingActivity.tsx` - Enhanced version available in main directory
- `MatchingActivity.tsx` - Enhanced version available in main directory
- `MultiSelectActivity.tsx` - Enhanced version available in main directory
- `ReflectionActivity.tsx` - Enhanced version available in main directory
- `UploadActivity.tsx` - Enhanced version available in main directory

### Test Files
- `ConditionalWritingActivity.test.tsx`
- `MatchingActivity.test.tsx`
- `MultiSelectActivity.test.tsx`
- `ReflectionActivity.test.tsx`

## Migration Guide

### For New Implementations
Use the enhanced activity components located in the main `activities` directory:

- `EnhancedActivityPane.tsx` - Main orchestrator component
- `WhoActivityEnhanced.tsx` - Enhanced Who activity
- `WhereActivityEnhanced.tsx` - Enhanced Where activity
- `SequenceActivityEnhanced.tsx` - Enhanced Sequence activity
- `MainIdeaActivityEnhanced.tsx` - Enhanced Main Idea activity
- `VocabularyActivityEnhanced.tsx` - Enhanced Vocabulary activity
- `PredictActivityEnhanced.tsx` - Enhanced Predict activity

### For Existing Code
If you have existing code using the deprecated components:

1. **Immediate Action**: Update imports to use enhanced components
2. **Gradual Migration**: Use the feature flag system to gradually roll out enhanced activities
3. **Testing**: Update tests to use enhanced component test files

### Feature Flag Integration
The enhanced activities can be controlled via feature flags:

```typescript
import { isEnhancedActivitiesEnabled } from '@/lib/featureFlags';

const useEnhancedActivities = await isEnhancedActivitiesEnabled(studentId, planId);
```

## Removal Timeline

- **Phase 1** (Current): Components moved to deprecated folder with warnings
- **Phase 2** (Next Release): Components will show deprecation warnings in console
- **Phase 3** (Future Release): Components will be removed entirely

## Enhanced Features

The enhanced activity system provides:

- **Better Performance**: Optimized rendering and state management
- **Offline Support**: Local storage fallback and sync capabilities
- **Progress Tracking**: Comprehensive progress management across devices
- **Analytics**: Built-in performance monitoring and user engagement tracking
- **Accessibility**: Improved ARIA labels and keyboard navigation
- **Responsive Design**: Better mobile and tablet support
- **Error Handling**: Graceful error handling and recovery
- **Session Management**: Automatic session recovery and data protection

## Support

If you need help migrating from deprecated components to enhanced components, please refer to:

1. The enhanced component documentation
2. Integration tests in `backend/integration/enhanced-activities.integration.test.js`
3. TypeScript interfaces in `frontend/src/types/enhancedActivities.ts`
