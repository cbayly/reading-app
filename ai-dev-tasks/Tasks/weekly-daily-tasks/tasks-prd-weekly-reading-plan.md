## Relevant Files

-   `backend/prisma/schema.prisma` - To add new models for `WeeklyPlan`, `Chapter`, and `DailyActivity`.
-   `backend/lib/openai.js` - To add new functions for generating the 3-chapter story and daily activities based on the PRD prompts.
-   `backend/routes/plans.js` - New file for API endpoints to generate, fetch, and update weekly plans.
-   `backend/src/index.js` - To add the new `/api/plans` route.
-   `frontend/src/app/dashboard/page.tsx` - To add a new section or button for viewing/starting the weekly plan.
-   `frontend/src/app/plan/[id]/page.tsx` - New dynamic route to display the weekly plan and its activities.
-   `frontend/src/components/WeeklyPlanView.tsx` - New component to render the full 7-day plan, including chapters and daily activities.
-   `frontend/src/components/DailyActivityCard.tsx` - New component for displaying a single day's activities.
-   `frontend/src/lib/api.ts` - To add new functions for interacting with the `/api/plans` endpoints.
-   `frontend/src/types/plan.ts` - New file for TypeScript interfaces (`WeeklyPlan`, `Chapter`, `DailyActivity`).
-   `frontend/lib/pdfGenerator.ts` - New utility for generating a printable PDF from the plan data.

### Notes

-   Unit tests should be created for new backend logic and frontend components.
-   Use `npx jest [optional/path/to/test/file]` to run tests.
-   The new database schema will require running `npx prisma migrate dev` to apply changes.

---

## Tasks

-   [x] **1.0 Backend: Database Schema and Seeding**
    -   [x] 1.1 In `prisma/schema.prisma`, define a new model `WeeklyPlan` with fields `id`, `studentId`, `interestTheme`, `createdAt`.
    -   [x] 1.2 Define a `Chapter` model to store the 3-chapter story, with fields `id`, `planId`, `chapterNumber`, `title`, `content`, and `summary`.
    -   [x] 1.3 Define a `DailyActivity` model to store daily tasks, with fields `id`, `planId`, `dayOfWeek` (1-7), `activityType` (e.g., 'Comprehension', 'Vocabulary', 'Game'), `content` (JSON for questions/prompts), and `studentResponse` (JSON).
    -   [x] 1.4 Establish relations: A `WeeklyPlan` has many `Chapters` and many `DailyActivities`. A `Student` has many `WeeklyPlans`.
    -   [x] 1.5 Run `npx prisma migrate dev --name add-weekly-plan-models` to apply the schema changes.

-   [x] **2.0 Backend: Core Generation Logic**
    -   [x] 2.1 In `lib/openai.js`, create a new function `generateStory(student, interest)` that uses the "Story Generation Prompt" from the PRD to generate a 3-chapter story.
    -   [x] 2.2 Create a function `generateComprehensionQuestions(chapterText, student)` using the "Comprehension Question Prompt".
    -   [x] 2.3 Create a function `generateVocabularyActivities(chapterText, student)` using the "Vocabulary Question Prompt".
    -   [x] 2.4 Create a function `generateGameAndCreativeActivities(story, student)` using the "Days 4–7 Activity Generation Prompt".
    -   [x] 2.5 Create a main orchestrator function `generateFullWeeklyPlan(student)` that:
        -   Selects a random interest.
        -   Calls `generateStory` to get the 3 chapters.
        -   Calls the appropriate question/activity generation functions for all 7 days.
        -   Assembles the full data structure for the `WeeklyPlan`, `Chapters`, and `DailyActivities`.

-   [x] **3.0 Backend: API Endpoints**
    -   [x] 3.1 Create a new file `backend/routes/plans.js`.
    -   [x] 3.2 Create a `POST /api/plans/generate` endpoint that takes a `studentId`, calls `generateFullWeeklyPlan`, and saves the result to the database.
-   [x] 3.3 Create a `GET /api/plans/:studentId` endpoint to fetch the most recent weekly plan for a student.
-   [x] 3.4 Create a `PUT /api/plans/activity/:activityId` endpoint to save a `studentResponse` to a specific `DailyActivity`.
    -   [x] 3.5 Add the new router to `backend/src/index.js` under the `/api/plans` path.

-   [ ] **4.0 Frontend: UI Components for Weekly Plan**
    -   [x] 4.1 Create `frontend/src/app/plan/[id]/page.tsx` as the main page for displaying a weekly plan.
    -   [x] 4.2 Create a `WeeklyPlanView.tsx` component that lays out the 7 days, perhaps in a grid or tabbed interface.
    -   [x] 4.3 Create a `DailyActivityCard.tsx` component that dynamically renders different activity types (e.g., multiple-choice questions, text input for reflections, game instructions).
-   [x] 4.4 Design a simple but clear UI for reading story chapters within the plan view.
    -   [x] 4.5 Add a "View Weekly Plan" button or section to the student cards on the main dashboard (`dashboard/page.tsx`).

-   [ ] **5.0 Frontend: Data Fetching and State Management**
    -   [x] 5.1 In `lib/api.ts`, add functions: `generatePlan(studentId)`, `getPlan(studentId)`, `saveActivityResponse(activityId, response)`.
    -   [x] 5.2 In `plan/[id]/page.tsx`, use a `useEffect` hook to fetch the weekly plan data when the page loads.
    -   [x] 5.3 Implement state management to track student answers for activities before submitting them to the backend.
    -   [x] 5.4 Implement the logic to call `saveActivityResponse` when a student completes an activity.

-   [ ] **6.0 System: PDF Generation and Printing**
    -   [x] 6.1 Research and choose a library for generating PDFs on the client-side (e.g., `jspdf`, `react-to-print`).
    -   [x] 6.2 Create a utility function `generatePlanPDF(planData)` that takes the weekly plan data and formats it into a structured, printable document.
    -   [x] 6.3 Add a "Print Plan" button to the `WeeklyPlanView.tsx` component that triggers the PDF generation and download/print dialog.
    -   [x] 6.4 Ensure the PDF layout is clean, organized, and binder-friendly as specified in the PRD.
