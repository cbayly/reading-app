## Relevant Files

- `backend/prisma/schema.prisma` - Add new Plan3 and Plan3Day models for 3-day plan structure (COMPLETED)
- `backend/prisma/migrations/20250823230952_add_plan3_models/migration.sql` - Initial Plan3 database migration (COMPLETED)
- `backend/prisma/migrations/20250823231232_update_story3_field_names/migration.sql` - Updated Story3 field names to match existing generateStory function (COMPLETED)
- `backend/routes/plan3.js` - New API routes for 3-day plan CRUD operations (COMPLETED)
- `backend/src/index.js` - Register Plan3 routes in Express app (COMPLETED)
- `backend/lib/openai.js` - Modify story generation to create 3-chapter stories with proper structure
- `frontend/src/app/plan3/[planId]/day/[index]/page.tsx` - New day view page with layout modes
- `frontend/src/components/layout/LayoutBar.tsx` - Segmented control for Reading/Split/Activity modes
- `frontend/src/components/layout/ResizableSplit.tsx` - Draggable divider component for split view
- `frontend/src/components/reading/EnhancedReadingPane.tsx` - Reading pane with anchor highlighting
- `frontend/src/components/activities/ActivityPane.tsx` - Container for 5 sequential activities
- `frontend/src/components/activities/WhoActivity.tsx` - Interactive character matching activity
- `frontend/src/components/activities/WhereActivity.tsx` - Location identification text input
- `frontend/src/components/activities/SequenceActivity.tsx` - Drag-and-drop event ordering
- `frontend/src/components/activities/MainIdeaActivity.tsx` - Theme identification text input
- `frontend/src/components/activities/PredictActivity.tsx` - Next chapter prediction text input
- `frontend/src/hooks/useReadingUiPrefs.ts` - Layout preferences persistence hook
- `frontend/src/hooks/useAutoSave.ts` - Debounced auto-save for activity responses
- `frontend/src/lib/api.ts` - API client functions for Plan3 endpoints
- `frontend/src/types/plan3.ts` - TypeScript types for 3-day plan structure
- `backend/prisma/migrations/[timestamp]_add_plan3_models/migration.sql` - Database migration for new schema

### Notes

- Unit tests should be placed alongside components (e.g., `LayoutBar.tsx` and `LayoutBar.test.tsx`)
- Use `npx jest [optional/path/to/test/file]` to run tests
- The existing 5-day plan system will remain untouched during development
- localStorage keys follow format: `rb-v2:plan3:<planId>:day:<index>:ui`

## Tasks

- [x] 1.0 Database Schema and API Foundation
  - [x] 1.1 Add Plan3 and Plan3Day models to Prisma schema with proper relationships
  - [x] 1.2 Create database migration for new Plan3 tables
  - [x] 1.3 Update OpenAI story generation to create 3-chapter stories (350-500 words each)
  - [x] 1.4 Create POST /api/plan3 endpoint for plan creation with student and story validation
  - [x] 1.5 Create GET /api/plan3/:planId endpoint for plan summary retrieval
  - [x] 1.6 Create GET /api/plan3/:planId/day/:index endpoint for day details with chapter and activities
  - [x] 1.7 Create POST /api/plan3/:planId/day/:index/answers endpoint for activity response saving
  - [x] 1.8 Add authentication middleware to all Plan3 routes
  - [x] 1.9 Implement proper error handling and validation for all Plan3 endpoints

- [ ] 2.0 Core Layout System Implementation
  - [ ] 2.1 Create LayoutBar component with segmented control for Reading/Split/Activity modes
  - [ ] 2.2 Implement ResizableSplit component with draggable divider and minimum width constraints
  - [ ] 2.3 Create useReadingUiPrefs hook for localStorage persistence of layout preferences
  - [ ] 2.4 Build main Plan3 day page with three layout modes and proper routing
  - [ ] 2.5 Add keyboard shortcuts (r/s/a) for layout mode switching
  - [ ] 2.6 Implement responsive design for mobile with tab-based navigation
  - [ ] 2.7 Add smooth transitions and animations for layout mode changes
  - [ ] 2.8 Ensure proper focus management and accessibility for layout controls

- [ ] 3.0 Enhanced Reading Experience
  - [ ] 3.1 Create EnhancedReadingPane component with chapter content display
  - [ ] 3.2 Add unique anchor IDs to each paragraph for jump-to-context functionality
  - [ ] 3.3 Implement scrollToAnchor function with smooth scrolling and highlighting
  - [ ] 3.4 Add chapter navigation and progress indicators within reading pane
  - [ ] 3.5 Implement proper typography and spacing for optimal reading experience
  - [ ] 3.6 Add support for hiding/showing reading pane based on layout mode
  - [ ] 3.7 Ensure reading content is properly structured with headings and semantic HTML
  - [ ] 3.8 Add accessibility features like proper heading hierarchy and ARIA labels

- [ ] 4.0 Interactive Activity Components
  - [ ] 4.1 Create ActivityPane container with stepper interface for 5 sequential activities
  - [ ] 4.2 Build WhoActivity component with drag-and-drop character name to description matching
  - [ ] 4.3 Build WhereActivity component with text input and validation for location identification
  - [ ] 4.4 Build SequenceActivity component with draggable event cards and proper ordering logic
  - [ ] 4.5 Build MainIdeaActivity component with text input for theme identification
  - [ ] 4.6 Build PredictActivity component with text input for next chapter predictions
  - [ ] 4.7 Implement jump-to-context functionality from activities to reading pane paragraphs
  - [ ] 4.8 Add proper validation and feedback for each activity type
  - [ ] 4.9 Ensure all activities are keyboard accessible with proper ARIA support
  - [ ] 4.10 Add activity completion indicators and progress tracking

- [ ] 5.0 State Management and Persistence
  - [ ] 5.1 Create useAutoSave hook with 400ms debounce for activity responses
  - [ ] 5.2 Implement activity response state management with proper TypeScript types
  - [ ] 5.3 Add "Saved" indicator with subtle UI feedback after successful saves
  - [ ] 5.4 Create Plan3 TypeScript types and interfaces for frontend components
  - [ ] 5.5 Update API client functions in lib/api.ts for Plan3 endpoints
  - [ ] 5.6 Implement day completion logic requiring all activities + manual completion
  - [ ] 5.7 Add plan completion flow with summary/celebration page and auto-generation
  - [ ] 5.8 Ensure proper error handling and retry logic for failed saves
  - [ ] 5.9 Add loading states and optimistic updates for better user experience
  - [ ] 5.10 Implement proper cleanup and memory management for component unmounting
