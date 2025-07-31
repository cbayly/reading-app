## Relevant Files

-   `backend/prisma/schema.prisma` - To define the new `Benchmark` model and add new scoring fields to the `Assessment` model.
-   `backend/routes/assessments.js` - To replace the old scoring logic with the new algorithm in the assessment submission endpoint.
-   `backend/scripts/seed.js` - To populate the `Benchmark` table with the WPM data for grades 1-12.
-   `frontend/src/types/assessment.ts` - To update the `Assessment` type definition to include the new score fields.
-   `frontend/src/app/assessment/[id]/results/page.tsx` - To update the UI to display the new composite score, component scores, and reading level label.

### Notes

-   After modifying `schema.prisma`, you will need to generate a new database migration by running `npx prisma migrate dev --name update-scoring-models` in the `backend/` directory.
-   Use `npx jest [optional/path/to/test/file]` to run tests.

## Tasks

- [x] 1.0 **Backend: Database and Scaffolding**
    - [x] 1.1 In `backend/prisma/schema.prisma`, define a new model `Benchmark` with fields: `id` (PK), `grade` (Int, unique), and `wpm` (Int).
    - [x] 1.2 In `backend/prisma/schema.prisma`, add the new fields to the `Assessment` model: `fluencyScore` (Float?), `compVocabScore` (Float?), and `readingLevelLabel` (String?). Make the existing `compositeScore` a Float?.
    - [x] 1.3 In the `backend` directory, run `npx prisma migrate dev --name refactor-scoring-algorithm` to apply the schema changes to the database.
    - [x] 1.4 In `backend/scripts/seed.js`, add logic to populate the `Benchmark` table with the WPM data for grades 1-12. Ensure the script can be run multiple times without creating duplicate data.

- [x] 2.0 **Backend: Implement New Scoring Algorithm**
    - [x] 2.1 In `backend/routes/assessments.js`, modify the `PUT /api/assessments/:id/submit` endpoint.
    - [x] 2.2 Before the scoring logic, fetch the student's `gradeLevel` and the corresponding `expectedWPM` from the `Benchmark` table. Handle cases where the grade is outside the 1-12 range.
    - [x] 2.3 Implement the "Invalid Attempt" check (`minutes < 0.5` or `wordCount < 50`). If invalid, return a `400 Bad Request` error.
    - [x] 2.4 Replace the existing WPM, accuracy, and score calculations with the new logic from the PRD to calculate `fluencyScore`, `compVocabScore`, and the new `compositeScore`.
    - [x] 2.5 Implement the logic to handle the edge case where an assessment is missing comprehension or vocabulary questions.
    - [x] 2.6 Add the logic to map the final `compositeScore` to the `readingLevelLabel`.
    - [x] 2.7 Update the `prisma.assessment.update` call to save all the new fields: `fluencyScore`, `compVocabScore`, `compositeScore`, and `readingLevelLabel`.

- [x] 3.0 **Frontend: Update Assessment Data Types**
    - [x] 3.1 In `frontend/src/types/assessment.ts`, update the `Assessment` interface to include the new optional fields: `fluencyScore?`, `compVocabScore?`, and `readingLevelLabel?`.

- [x] 4.0 **Frontend: Refactor Assessment Results UI**
    - [x] 4.1 In `frontend/src/app/assessment/[id]/results/page.tsx`, update the UI to prominently display the new `compositeScore` and `readingLevelLabel`.
    - [x] 4.2 Create a tooltip or an expandable section that shows a detailed breakdown: the student's WPM vs. benchmark WPM, the `fluencyScore`, and the `compVocabScore`.
    - [x] 4.3 Add frontend logic to handle the `400 Bad Request` for invalid attempts, displaying a user-friendly message.
    - [x] 4.4 Use conditional styling (colors or icons) to visually represent the `readingLevelLabel`.

- [x] 5.0 **Testing: Validate End-to-End Implementation**
    - [x] 5.1 Manually test the end-to-end flow by creating a new assessment for a student.
    - [x] 5.2 Verify that the new scores are calculated and stored correctly in the database.
    - [x] 5.3 Confirm that the Assessment Results page displays all the new information correctly, including the breakdown in the tooltip.
    - [x] 5.4 Test the invalid attempt flow to ensure the user receives the correct error message.
    - [x] 5.5 Test the edge case where a student's grade is outside the 1-12 range.
