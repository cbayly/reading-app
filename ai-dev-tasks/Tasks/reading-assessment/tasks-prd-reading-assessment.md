## Relevant Files

- `backend/prisma/schema.prisma` - To be updated with new fields for the `Assessment` model to store the passage, questions, answers, and results.
- `backend/routes/assessments.js` - To be updated with new endpoints for creating, fetching, and submitting an assessment.
- `backend/lib/openai.js` - A new file to contain the logic for interacting with the OpenAI API to generate passages and questions.
- `frontend/src/lib/api.ts` - To be updated with new functions for starting an assessment, fetching assessment data, and submitting results.
- `frontend/src/app/assessment/[id]/read/page.tsx` - A new page to display the reading passage and handle the parent's error tracking.
- `frontend/src/app/assessment/[id]/questions/page.tsx` - A new page to display and handle the comprehension and vocabulary questions.
- `frontend/src/app/assessment/[id]/results/page.tsx` - A new page to display the final assessment results and summary.
- `frontend/src/components/assessment/PassageReader.tsx` - A new component to manage the state of the reading passage, including the timer and error highlighting.
- `frontend/src/components/assessment/QuestionForm.tsx` - A new component to display the multiple-choice questions and manage the student's answers.

### Notes

- Unit tests should be created for new components and backend services to ensure reliability.
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- API keys for OpenAI must be stored securely in the `backend/.env` file and should not be committed to version control.

## Tasks

- [x] 1.0 **Backend: Enhance Assessment Model and API Endpoints**
  - [x] 1.1 Modify the `Assessment` model in `prisma/schema.prisma` to include fields for `passage` (String), `questions` (JSON), `studentAnswers` (JSON), `readingTime` (Int), `errorCount` (Int), `wpm` (Float), `accuracy` (Float), and `compositeScore` (Float).
  - [x] 1.2 Run `npx prisma migrate dev --name update-assessment-model` to apply the database schema changes.
  - [x] 1.3 In `routes/assessments.js`, modify the `POST /` route. It should take a `studentId` and call the new OpenAI service to generate a passage and questions.
  - [x] 1.4 In the `POST /` route, save the new assessment to the database with the generated passage, questions, and a status of `in_progress`.
  - [x] 1.5 Create a `GET /api/assessments/:id` route that fetches the assessment data (passage and questions) for the frontend.
  - [x] 1.6 Create a `PUT /api/assessments/:id/submit` route that accepts the fluency data (reading time, error count) and student answers from the frontend.

- [x] 2.0 **Backend: Implement OpenAI Passage & Question Generation Service**
  - [x] 2.1 Create a new file `lib/openai.js`.
  - [x] 2.2 Add an `OPENAI_API_KEY` to the `.env` file and ensure it's loaded by the application.
  - [x] 2.3 Implement a function `generateAssessment(student)` that takes student details (grade level, interests) as input.
  - [x] 2.4 Inside `generateAssessment`, construct a detailed prompt for the OpenAI API to generate a passage, 4 comprehension questions, and 4 vocabulary questions. The prompt should specify the desired word count, reading level, and topics.
  - [x] 2.5 The function should make a request to the OpenAI API and parse the response into a structured JSON object containing the `passage` and `questions`.
  - [x] 2.6 Add error handling to gracefully manage cases where the OpenAI API request fails.

- [x] 3.0 **Frontend: Build the Assessment Reading Interface**
  - [x] 3.1 Create the new page file at `app/assessment/[id]/read/page.tsx`.
  - [x] 3.2 On this page, fetch the assessment data from the `GET /api/assessments/:id` endpoint.
  - [x] 3.3 Create a new component `PassageReader.tsx`. This component will receive the passage text as a prop.
  - [x] 3.4 The `PassageReader` will display the passage and implement the timer logic (start, pause, resume).
  - [x] 3.5 Implement the logic to allow a parent to click on individual words in the passage. Clicking a word should highlight it and add it to a list of "incorrect words" in the component's state.
  - [x] 3.6 Add a "Finish Reading" button that stops the timer and navigates the user to the questions page.

- [x] 4.0 **Frontend: Build the Comprehension & Vocabulary Question Flow**
  - [x] 4.1 Create the new page file at `app/assessment/[id]/questions/page.tsx`.
  - [x] 4.2 On this page, fetch the assessment questions from the `GET /api/assessments/:id` endpoint.
  - [x] 4.3 Create a new component `QuestionForm.tsx`. This component will receive the questions as a prop.
  - [x] 4.4 The `QuestionForm` will display the 8 multiple-choice questions and manage the student's selected answers in its state.
  - [x] 4.5 Implement a "Submit Assessment" button. When clicked, it will gather all the data (reading time, incorrect words list, and answers) and send it to the backend.

- [x] 5.0 **Frontend & Backend: Implement Results Calculation and Display**
  - [x] 5.1 In the `PUT /api/assessments/:id/submit` route on the backend, receive the data from the frontend.
  - [x] 5.2 Calculate the WPM, accuracy, and composite score based on the STAR rubric formula.
  - [x] 5.3 Update the assessment record in the database with the results and change its status to `completed`.
  - [x] 5.4 Send the final calculated results back to the frontend.
  - [x] 5.5 Create the new results page at `app/assessment/[id]/results/page.tsx`.
  - [x] 5.6 On this page, display the comprehensive summary, including the composite score, grade-level equivalent, strengths, and areas for growth, as outlined in the PRD.
  - [x] 5.7 Add a button to download or print the results.
