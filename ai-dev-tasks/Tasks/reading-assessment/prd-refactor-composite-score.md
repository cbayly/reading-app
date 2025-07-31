# PRD: Refactor Composite Score Algorithm

## 1. Introduction/Overview

This document outlines the requirements for refactoring the reading assessment's composite score algorithm. The goal is to implement a more robust and transparent scoring model that provides clearer insights into a student's reading proficiency. This new algorithm will replace the existing scoring logic and will provide scores for fluency and comprehension/vocabulary, a final composite score, and a clear mapping to a reading level relative to grade-level benchmarks.

## 2. Goals

*   To provide a more accurate and meaningful measure of a student's reading ability.
*   To offer parents and educators a clearer understanding of the components that contribute to the score (fluency, comprehension, vocabulary).
*   To standardize scoring against grade-level benchmarks for Words Per Minute (WPM).
*   To output a simple, descriptive reading level (e.g., "At Grade Level") that is easy to interpret.

## 3. User Stories

*   **As a parent,** I want to see a single, clear score for my child's reading assessment so I can easily track their progress over time.
*   **As a parent,** I want to see a breakdown of the score into fluency and comprehension so I know which areas my child is excelling in and where they need support.
*   **As a parent,** I want to know how my child's reading speed (WPM) compares to the expectation for their grade level so I can understand their fluency in context.
*   **As a parent,** I want to see a simple "Reading Level" label so I can quickly understand if my child is on track without needing to interpret raw numbers.

## 4. Functional Requirements

### 4.1. Input Data

The scoring algorithm will require the following inputs upon assessment submission:

| Field                | Type                                       | Description                                      |
| -------------------- | ------------------------------------------ | ------------------------------------------------ |
| `passageText`        | string                                     | The full text of the reading passage.            |
| `readingTimeSeconds` | number                                     | The time in seconds the student took to read.    |
| `errorCount`         | number                                     | The number of reading errors.                    |
| `answers`            | object `{ questionIndex: studentAnswer }`  | The student's submitted answers.                 |
| `questions`          | array                                      | The list of questions with their type and answer.|
| `studentGrade`       | number                                     | The student's current grade level (1-12).        |

### 4.2. Scoring Process

The calculation will be executed in the following order:

1.  **Calculate Base Metrics:**
    *   `wordCount` = Count of words in `passageText`.
    *   `minutes` = `readingTimeSeconds` / 60.
    *   `wpm` = `wordCount` / `minutes`.
    *   `accuracyPercent` = `((wordCount - errorCount) / wordCount) * 100`.

2.  **Calculate Fluency Score:**
    *   Fetch `expectedWPM` from the `Benchmarks` table for the `studentGrade`.
    *   `fluencyNormalized` = `(wpm / expectedWPM) * 100`.
    *   The `fluencyNormalized` value is capped at a maximum of 150.
    *   `fluencyScore` = `fluencyNormalized * (accuracyPercent / 100)`.

3.  **Calculate Comprehension & Vocabulary Score (`compVocabScore`):**
    *   Count `comprehensionCorrect`, `vocabularyCorrect`, `comprehensionTotal`, and `vocabularyTotal` based on student `answers`.
    *   Calculate `comprehensionPercent` and `vocabularyPercent`.
    *   **Edge Case:**
        *   If `comprehensionTotal > 0` and `vocabularyTotal > 0`, then `compVocabScore` = (`comprehensionPercent` + `vocabularyPercent`) / 2.
        *   If only `comprehensionTotal > 0`, then `compVocabScore` = `comprehensionPercent`.
        *   If only `vocabularyTotal > 0`, then `compVocabScore` = `vocabularyPercent`.
        *   If neither is present, `compVocabScore` = 0.

4.  **Calculate Composite Score:**
    *   `compositeScore` = `ROUND((fluencyScore * 0.5) + (compVocabScore * 0.5))`.

5.  **Map to Reading Level:**
    *   The `compositeScore` is mapped to a `readingLevelLabel` string:
        *   `>= 150`: "Above Grade Level"
        *   `>= 120`: "At Grade Level"
        *   `>= 90`: "Slightly Below Grade Level"
        *   `< 90`: "Below Grade Level"

### 4.3. Output Data

The algorithm will produce the following output fields, which must be stored in the `Assessment` table:

*   `compositeScore` (number)
*   `fluencyScore` (number)
*   `compVocabScore` (number)
*   `readingLevelLabel` (string)

### 4.4. Handling of Invalid Attempts

*   An attempt is considered invalid if `minutes < 0.5` OR `wordCount < 50`.
*   If an attempt is invalid, the backend API must return a **`400 Bad Request`** error with a clear error code (e.g., `INVALID_ATTEMPT`).
*   The frontend will catch this error and display a user-friendly message encouraging the student to try again, as the attempt was too short to register a valid score.
*   Invalid attempts should be logged for internal analysis.

### 4.5. Grade Level Validation

*   The scoring algorithm only supports grades 1–12.
*   The system must validate that the `studentGrade` is within this range before processing. If not, it should return a `400 Bad Request` error.

## 5. Non-Goals (Out of Scope)

*   This refactor will **not** be applied retroactively to assessments that have already been scored. It will only apply to new assessments taken after deployment.
*   The old composite score calculation logic will be entirely removed.
*   Scoring for grades outside the 1–12 range (e.g., Kindergarten, College) is not supported in this version.

## 6. Design & UI Considerations

*   The **Assessment Results** page must be updated to display the new scores.
*   The `compositeScore` and `readingLevelLabel` should be the primary, most prominent metrics displayed.
*   A tooltip or an expandable section should be available to show the user the detailed breakdown, including:
    *   `fluencyScore`
    *   `compVocabScore`
    *   Student's WPM vs. the grade-level benchmark WPM.
*   The `readingLevelLabel` should use color-coding or icons to provide a quick visual indicator of the student's performance.

## 7. Technical Considerations

*   **Database Changes:**
    *   A new table named `Benchmarks` must be created to store the WPM benchmark for each grade level.
        *   Schema: `id` (PK), `grade` (integer), `wpm` (integer).
    *   The `Assessment` table must be updated to include the new output fields: `compositeScore`, `fluencyScore`, `compVocabScore`, and `readingLevelLabel`.
*   **Backend Logic:**
    *   The assessment submission endpoint (`/api/assessments/:id/submit`) must be updated to implement the new scoring algorithm.
    *   The logic should use the student's existing `gradeLevel` field as the `studentGrade` input.
*   **Data Seeding:**
    *   A seed script should be created to populate the `Benchmarks` table with the provided WPM values for grades 1–12.

## 8. Success Metrics

*   Reduction in user confusion regarding score calculation, measured by a decrease in related support inquiries.
*   Positive feedback from user surveys regarding the clarity and usefulness of the new assessment results.
*   Successful and accurate implementation of the scoring logic, validated by internal testing against a predefined set of test cases.

## 9. Open Questions

*   None at this time.
