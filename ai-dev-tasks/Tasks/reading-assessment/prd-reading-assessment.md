# PRD: Reading Assessment Component
> *Version 2.0 - Based on user feedback and refined for development*

## 1. Introduction & Overview
This document outlines the requirements for the Reading Assessment component. This feature is designed to evaluate a student’s reading fluency, comprehension, and vocabulary in an engaging, parent-guided format.

The primary goal is to provide an adaptive, interest-based reading passage that accurately measures key reading metrics. The results will be used to provide actionable insights for parents and to inform the student’s personalized weekly reading plans.

## 2. Goals
- To provide an adaptive, interest-based reading passage that matches the student’s current reading level.
- To accurately measure fluency, comprehension, and vocabulary using the STAR Reading method as a framework.
- To provide parents with an easy-to-use tool to support and track their child’s reading progress.
- To generate actionable, motivating summaries that outline a clear path for growth.
- To support both on-screen and printable assessment formats.

## 3. User Stories
*   **As a parent,** I want to launch an assessment for my child so that I can understand their current reading level and track their progress over time.
*   **As a parent,** I want the assessment to be based on my child's interests so that they are engaged and motivated to read.
*   **As a parent,** I want to be able to mark my child's reading errors in real-time so that the system can accurately calculate their fluency.
*   **As a student,** I want to read a story that is interesting and at a comfortable reading level so that I can do my best.
*   **As a student,** I want to answer questions about the story to show that I understood what I read.

## 4. Functional Requirements

### 4.1. Assessment Setup
1.  The parent must be able to launch the assessment from the student’s dashboard or a dedicated assessment section.
2.  The system must allow the parent to select which of their children is taking the assessment.
3.  Upon starting the assessment, the system will make a request to the backend to generate a new assessment passage.

### 4.2. Passage Generation (Backend)
1.  The system will integrate with the OpenAI API to generate a reading passage.
2.  The API request to OpenAI will include the following parameters:
    *   **Length**: Between 200-500 words, adjusted for the student's grade level.
    *   **Reading Level**: Adapted to the student’s current estimated reading level.
    *   **Topics**: Based on 1-3 interests from the student's profile.
3.  The generated passage must be filtered for age-appropriate content.
4.  The backend will also generate:
    *   4 multiple-choice comprehension questions (main idea, details, inference, sequencing).
    *   4 multiple-choice vocabulary questions based on words from the passage.
5.  The passage and questions will be saved to the database and sent to the frontend.

### 4.3. Fluency & Error Tracking (Frontend)
1.  The reading passage will be displayed clearly on the screen.
2.  A timer will begin when the parent clicks a "Start" button.
3.  The parent will be able to click on any word in the passage to mark it as an error.
4.  Clicked words will be visually highlighted (e.g., in red).
5.  A counter will display the total number of errors marked.
6.  The timer can be paused and resumed. The system will record the total aggregated time.
7.  The parent will have the option to reset the passage, which will clear the timer and any marked errors.

### 4.4. Comprehension & Vocabulary Questions (Frontend)
1.  After the reading portion is complete, the student will be presented with the 8 multiple-choice questions.
2.  The student will be able to select one answer for each question.
3.  The system will record the student's answers.

### 4.5. Results & Scoring (Backend & Frontend)
1.  After the questions are answered, the frontend will send the fluency data (reading time, error count) and the student's answers to the backend.
2.  The backend will calculate the final results based on the **STAR Reading Method Adaptation**:
    *   **WPM**: Calculated from the total words in the passage and the reading time.
    *   **Accuracy**: Calculated from the total words and the error count.
    *   **Comprehension Score**: Calculated from the number of correctly answered questions.
    *   **Composite Score**: Calculated using the formula: `(WPM × Accuracy%) × 0.5 + (Comprehension Score / 200 × 200) × 0.5`
3.  The backend will determine the student's reading level based on the **Benchmark Rubric** in the original PRD.
4.  The frontend will display an immediate, post-assessment summary including:
    *   The final composite score and the corresponding grade-level equivalent.
    *   Strengths and opportunities for growth.
    *   An encouraging message and clear next steps.
    *   A review of the fluency metrics and the comprehension questions.

### 4.6. Other Requirements
1.  Parents must be able to download and print the passage, questions, and an answer key.
2.  The assessment results will be saved and displayed in the student's profile, including a history of assessments and growth charts.

## 5. Non-Goals (Out of Scope for this version)
*   Support for languages other than English.
*   Real-time voice analysis to automatically detect reading errors.
*   Advanced analytics comparing the student to a broader population.

## 6. Technical Considerations
*   The OpenAI API integration will require secure handling of API keys.
*   The UI for marking errors on the passage will need to be carefully designed to be responsive and easy to use on different devices.
*   State management on the frontend will be critical to handle the multi-step assessment process.

## 7. Success Metrics
*   **Placement Accuracy**: ≥ 85% match with teacher-provided benchmarks.
*   **Engagement**: > 80% of initiated assessments are completed.
*   **Parent Satisfaction**: ≥ 4/5 ease-of-use rating from parent surveys.
*   **Growth Tracking**: Demonstrable improvement in WPM and comprehension scores over a 4-6 week period.
