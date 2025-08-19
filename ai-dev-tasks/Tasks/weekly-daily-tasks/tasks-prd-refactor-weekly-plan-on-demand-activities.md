## Relevant Files

- `backend/prisma/schema.prisma` - Database schema requiring modifications for caching fields and completion tracking
- `backend/lib/openai.js` - AI generation logic that needs refactoring for story-first, activity-on-demand workflow
- `backend/routes/plans.js` - API routes requiring updates for new on-demand generation endpoints
- `backend/lib/validation.js` - New utility file for story and activity quality validation
- `frontend/src/lib/api.ts` - Frontend API functions needing updates for new endpoints
- `frontend/src/components/WeeklyPlanView.tsx` - Main UI component requiring major refactor for on-demand workflow
- `frontend/src/components/DailyActivityCard.tsx` - New component for individual day activity display
- `frontend/src/components/StoryDisplay.tsx` - New component for story chapter navigation and display
- `frontend/src/types/weekly-plan.ts` - Type definitions for the refactored data structures

### Notes

- The current implementation generates all activities upfront in `generateFullWeeklyPlan()` which needs to be split
- Database schema needs new fields for caching prompts/outputs and tracking completion
- Frontend needs major UI changes to support progressive activity generation
- New API endpoints required for on-demand activity generation

## Tasks

- [x] 1.0 Database Schema & Infrastructure Updates
  - [x] 1.1 Add `cachedPrompt` and `cachedOutput` JSON fields to `WeeklyPlan` model
  - [x] 1.2 Add `completed` boolean field to `DailyActivity` model for completion tracking
  - [x] 1.3 Add `completedAt` DateTime field to `DailyActivity` model
  - [x] 1.4 Create and run Prisma migration for schema changes
  - [x] 1.5 Update TypeScript types to reflect new schema fields

- [x] 2.0 Backend AI Generation Refactor
  - [x] 2.1 Extract story generation logic from `generateFullWeeklyPlan()` into new `generateStoryOnly()` function
  - [x] 2.2 Create new `generateDayActivity()` function for on-demand activity generation
  - [x] 2.3 Implement story quality validation function with 350-400 word count check and dialogue validation
  - [x] 2.4 Implement activity quality validation function for completeness checks
  - [x] 2.5 Add 3-tier fallback logic for failed activity generation (retry → fallback template → error)
  - [x] 2.6 Update story generation prompts to emphasize quality requirements
  - [x] 2.7 Create activity type mapping for different days (comprehension, vocabulary, creative, etc.)
  - [x] 2.8 Add progressive difficulty logic based on day number
  - [x] 2.9 Implement caching logic for storing AI prompts and outputs

- [x] 3.0 Backend API Endpoint Updates
  - [x] 3.1 Modify `POST /api/plans/generate` to only generate story and save plan without activities
  - [x] 3.2 Create new `POST /api/plans/activity/generate` endpoint for on-demand activity generation
  - [x] 3.3 Update `GET /api/plans/:studentId` to return plan with story and existing activities only
  - [x] 3.4 Modify `PUT /api/plans/activity/:activityId` to mark activities as completed when student responses saved
  - [x] 3.5 Add validation middleware for sequential day completion (prevent skipping ahead)
  - [x] 3.6 Implement error handling and logging for generation failures
  - [x] 3.7 Add caching headers and response optimization for plan retrieval

- [x] 4.0 Frontend Data Layer & API Updates
  - [x] 4.1 Update `generatePlan()` function in `api.ts` to handle story-only generation
  - [x] 4.2 Create new `generateDayActivity()` function for on-demand activity requests
  - [x] 4.3 Update `getPlan()` function to handle plans with partial activities
  - [x] 4.4 Modify `saveActivityResponse()` function to include completion marking
  - [x] 4.5 Create new TypeScript interfaces for refactored data structures
  - [x] 4.6 Add error handling for activity generation failures
  - [x] 4.7 Implement optimistic UI updates for activity generation

- [x] 5.0 Frontend UI Component Refactor
  - [x] 5.1 Create new `StoryDisplay.tsx` component for chapter navigation and reading
  - [x] 5.2 Create new `DailyActivityCard.tsx` component for individual day activities
  - [x] 5.3 Refactor `WeeklyPlanView.tsx` to display story upfront and activities on-demand
  - [x] 5.4 Add "Generate Activity" buttons for uncompleted days
  - [x] 5.5 Implement sequential day access controls (disable future days until previous completed)
  - [x] 5.6 Add visual progress indicators showing completed vs. pending days
  - [x] 5.7 Implement loading states for activity generation
  - [x] 5.8 Add error handling UI for generation failures with retry options
  - [x] 5.9 Update plan page to auto-trigger Day 1 activity generation after story display
  - [x] 5.10 Add completion celebration/feedback when students finish each day