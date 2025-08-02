# Product Requirements Document (PRD): Weekly Plan with Daily Activities

- **Owner:** Reading Buddy Project
- **Version:** 1.0
- **Status:** Draft

---

### 1. Introduction & Overview

This document outlines the requirements for a new "Weekly Plan" feature. This feature aims to solve several key problems for students and parents: the lack of consistent daily reading routines, the need for more personally engaging content, and the difficulty in finding cohesive, age-appropriate activities that build on each other.

The goal is to provide students with a structured, motivating weekly reading plan that builds strong reading habits, strengthens fluency, and engages them with personalized, AI-generated stories tied to their interests.

### 2. Goals

- Provide a structured 7-day plan with 5 required daily activities and 2 optional bonus days.
- Engage students by generating a unique 3-chapter story each week based on one of their selected interests.
- Strengthen reading skills by scaffolding story difficulty and reinforcing words the student struggled with in their last assessment.
- Offer a mix of activities, including comprehension, vocabulary, puzzles, and creative prompts.
- Empower parents with a printable, binder-friendly weekly plan and a summary of their child's progress.

### 3. User Stories

- **As a 5th-grade student,** I want to read a new, fun story about my interests each week and do different activities every day so I can get better at reading without it feeling like a chore.
- **As a parent,** I want to easily set up and print a week's worth of engaging, structured reading activities for my child so I can support their learning and see a summary of their progress.
- **As the system,** I want to generate a personalized, 3-chapter story and a 7-day activity plan based on a student's reading level and interests to provide a scaffolded learning experience that reinforces weak areas.

### 4. Functional Requirements

#### 4.1. Weekly Plan Generation
1.  The system must generate a 7-day plan, where Days 1-5 are required and Days 6-7 are optional bonus activities.
2.  Each weekly plan must be themed around a single, randomly selected student interest.
3.  The core of the plan must be an AI-generated 3-chapter short story.
4.  The story's difficulty must be scaffolded:
    -   Chapter 1: At the student’s current reading level.
    -   Chapters 2 & 3: Approximately a half-level (0.5) above the student’s current reading level.
5.  Chapters 1 and 2 of the story must end with a cliffhanger to encourage continued reading.
6.  The story must naturally incorporate words the student answered incorrectly on their most recent assessment.

#### 4.2. Daily Activity Breakdown
The plan must include the following activities for each day:
-   **Day 1: Story Kickoff** - Prediction Warm-Up, Read Chapter 1, Vocabulary in Context, Comprehension Questions, Reflection Prompt.
-   **Day 2: Building Connections** - Quick Review of Chapter 1, Read Chapter 2, Vocabulary Word Map, Comprehension Questions, Character Spotlight Question.
-   **Day 3: Story Climax** - Quick Review of Chapter 2, Read Chapter 3, Vocabulary Challenge, Comprehension Questions, Quick Retell.
-   **Day 4: Story Review & Game** - Story Sequencing Puzzle, Character Choices Game, Vocabulary Scavenger Hunt.
-   **Day 5: Topic Exploration** - Fun Facts Page, Mini-Quiz, Word Puzzle (crossword or word search).
-   **Day 6: Creative Expression (Optional)** - Alternate Ending Prompt, Character Diary Entry, Book Cover Design Prompt.
-   **Day 7: Visual & Reflective (Optional)** - Draw a Scene Prompt, Optional Comic Strip Retell.

#### 4.3. User Experience & Output
1.  The system must provide the weekly plan in two formats:
    -   An interactive, on-screen experience where students can complete activities within the application.
    -   A printable PDF version of the entire weekly plan, formatted to be binder-friendly.
2.  All activities for the week must be generated at once and be visible to allow for printing.

#### 4.4. Assessment & Data
1.  A new weekly plan will be generated every two weeks, following the completion of a bi-weekly assessment.
2.  The system must store each daily activity, the student's responses, and the results from comprehension and vocabulary questions.
3.  The system must generate a weekly summary report for parents, showing completed activities, strengths/opportunities, and reinforced words.

#### 4.5. Edge Case Handling
1.  **AI Generation Failure:** If the AI fails to generate a story or activity, the system must display a user-friendly error message and prompt the parent to try again later.
2.  **No Incorrect Words:** If a student has no incorrect words from their last assessment, the system must select challenging, grade-appropriate vocabulary words from the story to reinforce instead.

### 5. Non-Goals (Out of Scope for V1)

-   Daily streak rewards or a badge/trophy system.
-   Features creating urgency, such as plan expiration dates.
-   Parental controls to override or reset a plan mid-week.
-   Adaptive difficulty *within* the 7-day plan (difficulty is set at the start of the week).
-   Enforcing strict sequential completion of activities in the online version. The UI should encourage it, but a user will not be blocked from doing activities out of order.

### 6. Design & Technical Considerations

-   **UI/UX:** The primary output is a printable, binder-friendly PDF. The on-screen experience should be clean, easy to navigate, and encourage a day-by-day progression.
-   **AI Integration:** The system will rely heavily on the OpenAI API. It must implement the specific prompts provided in the project documentation for generating stories, questions, and activities.
-   **Database:** The database schema must be expanded to store weekly plans, chapter content, daily activities, and student responses/progress for each activity.

### 7. Success Metrics

-   **Primary Metric:** Completion Rate: Achieve a >60% completion rate for the 5 required days of the weekly plan among active students.
-   **Secondary Metric:** Assessment Improvement: A measurable increase in students' average composite scores on the bi-weekly assessments after they have completed two consecutive weekly plans.

### 8. Open Questions

-   For the online version, should the UI visually de-emphasize or "lock" future days' activities to better guide students to complete the plan sequentially?
