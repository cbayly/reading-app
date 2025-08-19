# Scoring Logic v2 (Simplified)

## 1. Introduction / Overview
Update the assessment scoring so reading level labels better reflect widely used fluency and comprehension expectations. Keep current inputs and 50/50 weighting between Fluency and Comprehension/Vocabulary, but introduce component floors so students must demonstrate both reasonable fluency and comprehension to achieve “At” or “Above” Grade Level.

This change should be feature‑flagged and fully backward compatible with today’s API surface.

## 2. Goals
- Maintain existing API fields and request/response shapes.
- Make “At Grade Level” attainable at realistic Grade 5 norms (and generally sensible across grades).
- Prevent achieving “At/Above” via speed‑only or MCQ‑only performance.
- Provide tunable caps/floors for future calibration without code changes.

## 3. User Stories
- As a parent, I want my child’s reading level label to reflect both speed and understanding, so results feel accurate and actionable.
- As a teacher, I want to avoid labeling a student “At/Above” solely due to fast reading with low comprehension (or vice versa).
- As a product owner, I want to turn on Scoring v2 behind a flag and monitor distribution shifts before rolling it out to everyone.

## 4. Non‑Goals (Out of Scope)
- Grade‑equivalent (WPM band) logic.
- Question generation or benchmark WPM tables.
- Reworking data model or API endpoints.

## 5. Inputs & Validation (unchanged)
Inputs
- wordCount (int)
- readingTime (seconds)
- errorCount (int)
- answers: map of questionIndex → 'A'|'B'|'C'|'D'
- questions[]: each has type ∈ {comprehension, vocabulary}, correctAnswer
- benchmarkWPM (by grade)

Validation (unchanged)
- If (readingTime / 60) < 0.5 or wordCount < 50 → 400 INVALID_ATTEMPT

## 6. Scoring Formulas (math unchanged; documented clearly)
Let minutes = readingTime / 60

WPM = round(wordCount / minutes)

accuracyPercent = ((wordCount − errorCount) / wordCount) × 100

FluencyNormalized = (WPM / benchmarkWPM) × 100

Cap FluencyNormalized at FLUENCY_CAP (default 150)

FluencyScore F = round(CappedFluencyNormalized × (accuracyPercent / 100))

Comp/Vocab Score C =
- If both types exist: average of their percents
- If only one type exists: that percent
- If none exist: 0

Composite = round((F + C) / 2)

Rounding
- Round to nearest integer at each step noted above.

## 7. Labels v2 (with floors)
- Above Grade Level: Composite ≥ 105 AND F ≥ 100 AND C ≥ 85
- At Grade Level: 90–104 AND F ≥ 85 AND C ≥ 75
- Slightly Below: 75–89, OR Composite ≥ 90 but any floor is missed
- Below: < 75

Configurable constants
- FLUENCY_CAP = 150 (default; tunable)
- Optional ACCURACY_HARD_FLOOR (e.g., 93%). If set and accuracyPercent falls below it, downgrade one band (Above→At, At→Slightly Below).

## 8. Functional Requirements
1. The backend must compute WPM, accuracyPercent, F, C, Composite as specified above.
2. The backend must assign readingLevelLabel according to Section 7 floors and thresholds.
3. The backend must expose a feature flag (e.g., env var SCORE_V2_ENABLED=true|false) to toggle v2 logic; when false, v1 logic is used unchanged.
4. All existing API contracts remain identical: response continues to return wpm, accuracy, fluencyScore, compVocabScore, compositeScore, readingLevelLabel.
5. The FLUENCY_CAP and ACCURACY_HARD_FLOOR must be configurable via env or config, without code changes.
6. Add server‑side logging for: F, C, Composite, Label, floors met/missed (boolean), and flag state.

## 9. Technical Considerations
- Implement v2 within the existing assessment submission route (PUT /api/assessments/:id/submit) guarded by a flag.
- Keep v1 code path intact for rollback.
- Add small utility to compute floors met/missed and label selection for easier unit testing.
- Ensure rounding behavior matches existing code (use Math.round where noted).

## 10. Success Metrics
- Distribution of labels after v2 closely matches expected norms (e.g., target % for Grade 5 aligning with internal reference data).
- Zero changes to API schema; no client regressions reported.
- Feature can be toggled on/off safely in production.

## 11. Acceptance Criteria
- Backend returns same fields as today (wpm, accuracyPercent, fluencyScore, compVocabScore, compositeScore, readingLevelLabel).
- New labels follow Section 7 exactly when SCORE_V2_ENABLED=true.
- Unit tests cover typical Grade 5 cases and edge caps (see vectors below).
- Feature flag allows toggle between v1 and v2 at runtime (process restart acceptable).

## 12. Test Vectors (Grade 5; benchmarkWPM = 150)
| # | WPM | Acc% | C% | Expect F | Composite | Label |
|---|----:|-----:|---:|---------:|----------:|:------|
| 1 | 150 | 98 | 85 | 98 | 92 | At |
| 2 | 157 | 96 | 80 | 100 | 90 | At |
| 3 | 140 | 98 | 95 | 91 | 93 | At |
| 4 | 150 | 95 | 75 | 95 | 85 | Slightly Below |
| 5 | 130 | 99 | 95 | 86 | 91 | At |
| 6 | 250 | 90 | 90 | 135* | 113 | Above |

Note: FluencyNormalized = (250/150)×100 = 166.7 → cap 150 → 150×0.90 = 135.

## 13. Rollout & Observability
- Feature flag: SCORE_V2_ENABLED toggle.
- Logging/metrics: record F, C, Composite, Label, and floor checks to monitor distribution shifts post‑launch.
- Start with limited internal rollout; expand after validation.

## 14. Open Questions
1. Final default for ACCURACY_HARD_FLOOR (enable and set to 93%?).
2. Should floors vary by grade (e.g., stricter at higher grades)?
3. Do we need per‑grade label thresholds instead of global ones?
4. Should we persist floor‑miss details on the assessment for analytics?


