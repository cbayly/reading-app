## Relevant Files

*   `backend/prisma/schema.prisma` - Updated database models for the new 5-day plan structure with Plan, Story, Day, and Activity models.
*   `backend/prisma/migrations/20250820020902_refactor_weekly_plan_to_5_day_plan/` - Migration to refactor WeeklyPlan to Plan and add new models.
*   `backend/prisma/migrations/20250820021100_finalize_5_day_plan_models/` - Migration to add indexes and optimize the new models.
*   `backend/routes/plans.js` - Updated with new POST /api/plans endpoint for creating 5-day plan structure.
*   `backend/lib/openai.js` - Updated story generation prompt to require structured JSON with title, themes, part1-3, and vocabulary array.
*   `frontend/src/app/plan/[id]/page.tsx` - To be refactored into the main Plan Overview page.
*   `frontend/src/components/WeeklyPlanView.tsx` - To be refactored or replaced to display the new 5-day structure.
*   `frontend/src/types/weekly-plan.ts` - To update frontend type definitions to match the new data models.
*   `frontend/src/components/activities/` - New directory for story-integrated activity components.

### Notes

-   The existing weekly plan structure will be significantly refactored. It's recommended to create new models and API endpoints and deprecate the old ones in phases if necessary.
-   Testing will be critical. New unit and integration tests should be created for the backend logic, and E2E tests for the frontend user flows.

## Tasks

- [x] 1.0 **Backend: Data Model & API Foundation**
  - [x] 1.1 Create a new Prisma migration to refactor the `WeeklyPlan` model to a more generic `Plan` and introduce the `Story`, `Day`, and `Activity` models as defined in the PRD.
  - [x] 1.2 Update `schema.prisma` to finalize the new models, ensuring correct relations (e.g., a `Plan` has one `Story` and five `Days`).
  - [x] 1.3 Implement the new `POST /api/plans` endpoint in `plans.js` to handle the creation of the new `Plan` structure (initially without story generation).
  - [x] 1.4 Implement the new `GET /api/plans/:id` endpoint to fetch a single plan with its associated story, days, and activities.
  - [x] 1.5 Implement the new `PUT /api/plans/:id/days/:index` endpoint for saving and validating day activities.
  - [x] 1.6 Implement the new `POST /api/plans/:id/complete` endpoint to mark a plan as complete.
- [x] 2.0 **Backend: Story & Plan Generation Logic**
  - [x] 2.1 In `openai.js`, update the story generation prompt to require a structured JSON object including `title`, `themes` array, `part1`, `part2`, `part3`, and a `vocabulary` array (6 words with definitions from part1).
  - [x] 2.2 Modify the story generation function to parse the new JSON structure and add robust error handling for cases where the AI response is malformed.
  - [x] 2.3 Integrate the updated story generation logic into the `POST /api/plans` endpoint.
  - [x] 2.4 When a plan is created, use the generated story data to create and link the `Plan` and `Story` records in the database.
  - [x] 2.5 Scaffold the five `Day` records for the new plan, setting Day 1 to `available` and the rest to `locked`.
  - [x] 2.6 Scaffold the initial `Activity` records for each day, populating the Day 1 activity with the AI-generated vocabulary.
- [x] 3.0 **Backend: Activity & Plan Progression Logic**
  - [x] 3.1 Implement the server-side validation logic for the `PUT /api/plans/:id/days/:index` endpoint.
  - [x] 3.2 Create dedicated validation functions for each activity type: `matching` (Day 1 & 2), `writing` (Day 3 & 4), and `multi-select` (Day 5), ensuring they handle the specific completion rules from the PRD.
  - [x] 3.3 When a day's activities are submitted and validated, update the day's `state` to `complete`.
  - [x] 3.4 After a day is marked complete, trigger a state update to set the next day's `state` to `available` (if applicable).
  - [x] 3.5 Implement the `POST /api/plans/:id/complete` endpoint to verify all 5 days are complete, set the plan `status` to `completed`, and then trigger the new plan generation flow.
- [x] 4.0 **Frontend: Plan Overview & Day Navigation**
  - [x] 4.1 Update `frontend/src/types/weekly-plan.ts` with interfaces for `Plan`, `Story`, `Day`, and `Activity` that match the new backend models.
  - [x] 4.2 Refactor the main plan page (`/plan/[id]/page.tsx`) to function as the Plan Overview.
  - [x] 4.3 Update the data fetching logic to use the new `GET /api/plans/:id` endpoint.
  - [x] 4.4 Create a `PlanHeader` component to display the plan `name` and `theme`.
  - [x] 4.5 Create a `DayList` component to render the 5 day cards, each with distinct styling for `Locked`, `Available`, and `Complete` states.
  - [x] 4.6 Implement client-side routing to navigate to a new Day Detail page (e.g., `/plan/:id/day/:index`) when an `Available` day is clicked.
  - [x] 4.7 Add the "Mark Plan Complete" button to the UI, making it visible and enabled only when all 5 days are marked as complete.
- [x] 5.0 **Frontend: Day Detail View & Activity Components**
  - [x] 5.1 Create the new dynamic route page at `frontend/src/app/plan/[id]/day/[index]/page.tsx`.
  - [x] 5.2 Create a `ReadingPanel` component to display the correct chapter(s) for the current day, including the per-chapter collapse/expand UI for Day 4.
  - [x] 5.3 Create an `ActivitiesPanel` component that dynamically renders the correct activity component based on `activity.type`.
  - [x] 5.4 Develop the individual, reusable activity components in `frontend/src/components/activities/`: `MatchingActivity`, `ReflectionActivity`, `ConditionalWritingActivity`, and `MultiSelectActivity`.
  - [x] 5.5 Implement the "Complete Day" button on the Day Detail page, which triggers validation and calls the `PUT /api/plans/:id/days/:index` endpoint.
- [x] 6.0 **Frontend: State Management & Autosave**
  - [x] 6.1 Implement a robust state management solution (e.g., React Context with useReducer, or Zustand) to handle the `Plan` data across the overview and detail pages, ensuring UI updates reactively.
  - [x] 6.2 Create a custom hook `useAutosave` that saves activity responses on input `onBlur` and uses a debounce effect (800ms) for `onChange` events.
  - [x] 6.3 Add a visual indicator in the UI to show the autosave status (e.g., "Saving...", "Saved", "Error").
  - [x] 6.4 Enforce the read-only state by disabling all inputs in activity components when a day's state is `complete`.
- [ ] 7.0 **End-to-End Integration & Testing**
  - [x] 7.1 Write backend integration tests for the new API endpoints, covering plan creation, day completion, and full plan completion/regeneration.
  - [x] 7.2 Write frontend component tests for the new activity components to verify correct rendering and user interaction handling.
  - [x] 7.3 Manually test the full user flow: create a plan, progress through all 5 days, complete the plan, and confirm a new plan is generated and displayed.
  - [ ] 7.4 (Optional Stretch) Add E2E tests using a framework like Cypress or Playwright to automate the main user flow and catch regressions.
