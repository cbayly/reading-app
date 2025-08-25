# Tasks: Enhanced Daily Activities System

## Relevant Files

- `frontend/src/components/activities/EnhancedActivityPane.tsx` - Main orchestrator component replacing ActivityPane.tsx
- `frontend/src/components/activities/EnhancedActivityPane.test.tsx` - Unit tests for EnhancedActivityPane component
- `frontend/src/components/activities/enhanced/WhoActivityEnhanced.tsx` - Enhanced character identification activity with immediate feedback
- `frontend/src/components/activities/enhanced/WhoActivityEnhanced.test.tsx` - Unit tests for WhoActivityEnhanced component
- `frontend/src/components/activities/enhanced/WhereActivityEnhanced.tsx` - Enhanced setting identification activity 
- `frontend/src/components/activities/enhanced/WhereActivityEnhanced.test.tsx` - Unit tests for WhereActivityEnhanced component
- `frontend/src/components/activities/enhanced/SequenceActivityEnhanced.tsx` - Enhanced event ordering with drag-drop and mobile alternatives
- `frontend/src/components/activities/enhanced/SequenceActivityEnhanced.test.tsx` - Unit tests for SequenceActivityEnhanced component
- `frontend/src/components/activities/enhanced/MainIdeaActivityEnhanced.tsx` - Enhanced comprehension activity with explanatory feedback
- `frontend/src/components/activities/enhanced/MainIdeaActivityEnhanced.test.tsx` - Unit tests for MainIdeaActivityEnhanced component
- `frontend/src/components/activities/enhanced/VocabularyActivityEnhanced.tsx` - Enhanced vocabulary matching with word bank and progressive feedback
- `frontend/src/components/activities/enhanced/VocabularyActivityEnhanced.test.tsx` - Unit tests for VocabularyActivityEnhanced component
- `frontend/src/components/activities/enhanced/PredictActivityEnhanced.tsx` - Enhanced prediction activity with plausibility feedback
- `frontend/src/components/activities/enhanced/PredictActivityEnhanced.test.tsx` - Unit tests for PredictActivityEnhanced component
- `frontend/src/components/activities/shared/ActivityStepper.tsx` - Reusable stepper component for showing progress
- `frontend/src/components/activities/shared/ActivityStepper.test.tsx` - Unit tests for ActivityStepper component
- `frontend/src/components/activities/shared/DeviceDetector.tsx` - Utility for detecting mobile vs desktop interactions
- `frontend/src/components/activities/shared/DeviceDetector.test.tsx` - Unit tests for DeviceDetector component
- `frontend/src/lib/activities/activityContentGenerator.ts` - Frontend utilities for processing AI-generated content
- `frontend/src/lib/activities/activityContentGenerator.test.ts` - Unit tests for content generator utilities
- `backend/lib/enhancedActivityGeneration.js` - Enhanced AI content generation for story-specific activities
- `backend/lib/enhancedActivityGeneration.test.js` - Unit tests for enhanced activity generation
- `backend/routes/enhancedActivities.js` - API routes for enhanced activity content and progress tracking
- `backend/routes/enhancedActivities.test.js` - Unit tests for enhanced activities API routes
- `backend/prisma/migrations/add_enhanced_activities.sql` - Database migration for enhanced activity data storage
- `frontend/src/types/enhancedActivities.ts` - TypeScript interfaces for enhanced activity data structures
- `frontend/src/hooks/useActivityProgress.ts` - Custom hook for managing activity progress and persistence
- `frontend/src/hooks/useActivityProgress.test.ts` - Unit tests for activity progress hook

### Notes

- Unit tests should be placed alongside the code files they are testing
- Use `npx jest [optional/path/to/test/file]` to run tests in the frontend directory
- Use `npm test` or `node --test` to run backend tests
- The enhanced activities system will completely replace the existing activity components
- All new components should follow the existing Tailwind CSS design patterns used in the app

## Tasks

- [ ] 1.0 Backend Content Generation System
  - [x] 1.1 Create enhanced AI content extraction functions in `backend/lib/enhancedActivityGeneration.js` [AI: GPT-4o]
    - [x] 1.1 Test: `backend/lib/enhancedActivityGeneration.test.js` passing [AI: GPT-4o]
  - [x] 1.2 Implement story-specific character extraction with role identification and decoy generation [AI: GPT-4o]
    - [x] 1.2 Test: `extractCharactersWithDecoys` function with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 1.3 Implement story-specific setting extraction with descriptive text [AI: GPT-4o]
    - [x] 1.3 Test: `extractSettingsWithDescriptions` function with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 1.4 Implement event sequence extraction for ordering activities [AI: GPT-4o]
    - [x] 1.4 Test: `extractEventSequence` function with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 1.5 Implement main idea generation with multiple choice options and explanatory feedback [AI: GPT-4o]
    - [x] 1.5 Test: `extractMainIdeaWithOptions` function with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 1.6 Implement vocabulary extraction with age-appropriate definitions and matching pairs [AI: GPT-4o]
    - [x] 1.6 Test: `extractVocabularyWithDefinitions` function with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 1.7 Implement prediction option generation with plausibility scoring [AI: GPT-4o]
    - [x] 1.7 Test: `extractPredictionOptions` function with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 1.8 Add content validation and fallback mechanisms for inappropriate or failed content [AI: GPT-4o]
    - [x] 1.8 Test: Enhanced validation and fallback mechanisms with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 1.9 Implement content caching to avoid regenerating for the same story [AI: GPT-4o]
    - [x] 1.9 Test: Content caching system with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 1.10 Add comprehensive error handling and timeout protection for AI calls [AI: GPT-4o]
    - [x] 1.10 Test: Enhanced error handling and timeout protection with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 1.11 Write unit tests for all content generation functions [AI: GPT-4o]
    - [x] 1.11 Test: Comprehensive unit tests for all individual content extraction functions passing [AI: GPT-4o]

- [ ] 2.0 Database Schema and API Updates
  - [x] 2.1 Create database migration to add enhanced activity content storage tables [AI: GPT-4o]
    - [x] 2.1 Test: Database migration successfully applied with all tables, constraints, and indexes [AI: GPT-4o]
  - [x] 2.2 Add `ActivityContent` model for caching AI-generated characters, settings, events, vocabulary [AI: GPT-4o]
  - [x] 2.3 Add `ActivityProgress` model for tracking student progress across devices [AI: GPT-4o]
  - [x] 2.4 Add `ActivityResponse` model for storing detailed student answers and feedback [AI: GPT-4o]
  - [x] 2.5 Create API routes in `backend/routes/enhancedActivities.js` for content generation [AI: GPT-4o]
  - [x] 2.6 Implement GET `/api/enhanced-activities/:planId/:dayIndex` endpoint for fetching activity content [AI: GPT-4o]
  - [x] 2.7 Implement POST `/api/enhanced-activities/progress` endpoint for saving student progress [AI: GPT-4o]
  - [x] 2.8 Implement GET `/api/enhanced-activities/progress/:studentId/:planId/:dayIndex` for progress retrieval [AI: GPT-4o]
  - [x] 2.9 Add content regeneration endpoint for manual content refresh [AI: GPT-4o]
  - [x] 2.10 Implement proper authentication and authorization for activity endpoints [AI: GPT-4o]
  - [x] 2.11 Write comprehensive API tests for all enhanced activity endpoints [AI: GPT-4o]
    - [x] 2.11 Test: Comprehensive API tests for all enhanced activity endpoints passing [AI: GPT-4o]

- [ ] 3.0 Enhanced Activity Components
  - [x] 3.1 Create `ActivityStepper` component with visual progress indication and keyboard navigation [AI: GPT-4o]
    - [x] 3.1 Test: ActivityStepper component with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 3.2 Create `DeviceDetector` utility for responsive interaction patterns [AI: GPT-4o]
    - [x] 3.2 Test: DeviceDetector utility with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 3.3 Implement `WhoActivityEnhanced` with character selection, immediate feedback, and story-specific content [AI: GPT-4o]
    - [x] 3.3 Test: WhoActivityEnhanced component with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 3.4 Implement `WhereActivityEnhanced` with setting selection and descriptive text display [AI: GPT-4o]
    - [x] 3.4 Test: WhereActivityEnhanced component with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 3.5 Implement `SequenceActivityEnhanced` with drag-drop for desktop and tap-to-swap for mobile [AI: GPT-4o]
    - [x] 3.5 Test: SequenceActivityEnhanced component with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 3.6 Implement `MainIdeaActivityEnhanced` with multiple choice and explanatory feedback [AI: GPT-4o]
    - [x] 3.6 Test: MainIdeaActivityEnhanced component with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 3.7 Implement `VocabularyActivityEnhanced` with word bank, drag-drop matching, and progressive feedback [AI: GPT-4o]
    - [x] 3.7 Test: VocabularyActivityEnhanced component with comprehensive unit tests passing [AI: GPT-4o]
  - [x] 3.8 Implement `PredictActivityEnhanced` with plausibility scoring and contextual feedback [AI: GPT-4o]
    - [x] 3.8 Test: PredictActivityEnhanced component with targeted unit tests passing [AI: GPT-4o]
  - [x] 3.9 Create `EnhancedActivityPane` orchestrator component to manage activity flow [AI: GPT-4o]
    - [x] 3.9 Test: EnhancedActivityPane component with targeted unit tests passing [AI: GPT-4o]
  - [x] 3.10 Implement accessibility features (ARIA labels, keyboard navigation, screen reader support) [AI: GPT-4o]
  - [x] 3.11 Add responsive design for mobile, tablet, and desktop viewports [AI: GPT-4o]
  - [x] 3.12 Implement loading states and error handling for content generation failures [AI: GPT-4o]
  - [x] 3.13 Write comprehensive unit tests for all enhanced activity components [AI: GPT-4o]

- [ ] 4.0 Activity Progress and Persistence
  - [x] 4.1 Create `useActivityProgress` hook for managing progress state and API calls [AI: GPT-4o]
  - [x] 4.2 Implement cross-device progress synchronization with backend storage [AI: GPT-4o]
  - [x] 4.3 Add automatic progress saving on activity completion and intermediate steps [AI: GPT-4o]
  - [x] 4.4 Implement progress restoration when students return to activities [AI: GPT-4o]
  - [x] 4.5 Add offline resilience with local storage fallback and sync on reconnection [AI: GPT-4o]
  - [x] 4.6 Implement activity state tracking (not_started, in_progress, completed) [AI: GPT-4o]
  - [x] 4.7 Add answer persistence and retrieval for review functionality [AI: GPT-4o]
  - [x] 4.8 Implement progress indicators showing completion status across all activities [AI: GPT-4o]
  - [x] 4.9 Add session management to prevent data loss during interruptions [AI: GPT-4o]
  - [x] 4.10 Write unit tests for progress management and persistence logic [AI: GPT-4o]

- [ ] 5.0 Integration and Migration
  - [ ] 5.1 Update existing activity routes to use enhanced activity system [AI: GPT-4o]
  - [ ] 5.2 Modify `frontend/src/app/plan3/[id]/day/[index]/page.tsx` to use EnhancedActivityPane [AI: GPT-4o]
  - [ ] 5.3 Create migration script to generate enhanced content for existing plans [AI: GPT-4o]
  - [ ] 5.4 Implement feature flag system for gradual rollout of enhanced activities [AI: GPT-4o]
  - [ ] 5.5 Add performance monitoring and analytics for enhanced activity usage [AI: GPT-4o]
  - [ ] 5.6 Create comprehensive integration tests for end-to-end activity flow [AI: GPT-4o]
  - [ ] 5.7 Update TypeScript interfaces in `frontend/src/types/` for enhanced activity data [AI: GPT-4o]
  - [ ] 5.8 Remove or deprecate legacy activity components after successful migration [AI: GPT-4o]
  - [ ] 5.9 Update documentation and add developer guidelines for enhanced activities [AI: GPT-4o-mini]
  - [ ] 5.10 Conduct accessibility testing with actual users and iterate based on feedback [AI: GPT-4o]
