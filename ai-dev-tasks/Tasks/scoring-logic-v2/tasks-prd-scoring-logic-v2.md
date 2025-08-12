## Relevant Files

- `backend/routes/assessments.js` - Submission route that computes WPM/accuracy and writes assessment results/labels.
- `backend/lib/logging.js` - Centralized logging; extend to log scoring metrics and floors.
- `backend/src/index.js` - App bootstrap; will read env flags (e.g., SCORE_V2_ENABLED) if needed.
- `backend/package.json` - Ensure test scripts remain valid; no schema changes required.
- `backend/integration/` - Place new end-to-end tests for submission route with flag on/off.
- `backend/lib/scoring.js` (new) - Pure scoring utilities (v1 and v2) with explicit exports for unit testing.
- `backend/lib/scoring.test.js` (new) - Unit tests for scoring math, floors, labels, and rounding.
- `backend/docs/README.md` (update) - Brief note on SCORE_V2 feature flag and tunables.

### Notes

- Keep API responses unchanged: `wpm, accuracy, fluencyScore, compVocabScore, compositeScore, readingLevelLabel`.
- Implement v2 under a feature flag (`SCORE_V2_ENABLED`). Default can be false.
- Make `FLUENCY_CAP` and optional `ACCURACY_HARD_FLOOR` configurable via env; provide sensible defaults.
- Prefer extracting scoring to a pure module for testability; route becomes a thin orchestrator.
- Add structured logs to observe floors met/missed and label distribution.

## Tasks

- [ ] 1.0 Create a pure scoring module with v1 and v2
- [x] 1.1 Create `backend/lib/scoring.js` exporting:
    - [x] `computeWpm(wordCount, readingTimeSeconds)` → integer
    - [x] `computeAccuracy(wordCount, errorCount)` → percent number (0–100)
    - [x] `computeCompVocab(questions, answers)` → percent number (0–100)
    - [x] `scoreV1({ wordCount, readingTime, errorCount, questions, answers, benchmarkWpm, tunables })` → `{ wpm, accuracy, fluencyScore, compVocabScore, compositeScore, label }`
    - [x] `scoreV2({...same})` with floors/thresholds per PRD §7
  - [x] 1.2 Implement v1 math identical to current route code (preserve rounding points)
  - [x] 1.3 Implement v2 floors and banding exactly:
    - [x] Above: Composite ≥ 105 AND F ≥ 100 AND C ≥ 85
    - [x] At: 90–104 AND F ≥ 85 AND C ≥ 75
    - [x] Slightly Below: 75–89, OR Composite ≥ 90 but any floor missed
    - [x] Below: < 75
  - [x] 1.4 Tunables object with defaults: `{ fluencyCap: 150, accuracyHardFloor: null }`
  - [x] 1.5 Accuracy hard floor (if set): downgrade one band (Above→At, At→Slightly Below)
  - [x] 1.6 Export a selector `pickScorer({ flag })` returning v1 or v2 function

- [x] 2.0 Wire scoring v2 into the assessment submission route behind a feature flag
  - [x] 2.1 In `backend/routes/assessments.js` submission handler, replace inline math with call to scorer
  - [x] 2.2 Read `process.env.SCORE_V2_ENABLED === 'true'`
  - [x] 2.3 Read tunables `FLUENCY_CAP`, `ACCURACY_HARD_FLOOR` with safe defaults
  - [x] 2.4 Keep validation logic unchanged (INVALID_ATTEMPT, grade checks, benchmark fetch)
  - [x] 2.5 Persist returned fields exactly to DB and response
  - [x] 2.6 Add structured logs (see 6.0)

- [ ] 3.0 Add tunable constants via environment variables and document usage
  - [x] 3.1 Support `FLUENCY_CAP` (default 150)
  - [x] 3.2 Support optional `ACCURACY_HARD_FLOOR` (integer percent, e.g., 93)
  - [x] 3.3 Add `.env.example` entries and short doc
  - [x] 3.4 Document in `backend/docs/README.md`

- [x] 4.0 Add unit tests for scoring math, floors, labels, and rounding
  - [x] 4.1 Create `backend/lib/scoring.test.js`
  - [x] 4.2 Cover PRD §12 vectors (Grade 5 benchmark 150)
  - [x] 4.3 Edge cases: low time/short passage invalid attempt, cap engaged, one-type only, zero questions
  - [x] 4.4 Floor-miss cases: Composite ≥ 90 but F or C below floor → Slightly Below
  - [x] 4.5 Accuracy hard floor downgrade behavior

- [x] 5.0 Add integration tests for submission route (flag on/off)
  - [x] 5.1 New test file `backend/integration/scoring-v2.integration.test.js`
  - [x] 5.2 Seed or mock benchmarkWPM; submit payloads; assert response fields and labels
  - [x] 5.3 Verify identical API schema across v1/v2; verify label differences when expected
  - [x] 5.4 Verify 400 INVALID_ATTEMPT unchanged

- [ ] 6.0 Add observability
  - [x] 6.1 Use existing logger to log `{ flag: v2, F, C, Composite, label, floors: { fMet, cMet }, capEngaged, accuracyHardFloorApplied }`
  - [x] 6.2 Consider minimal counters or summary logs during rollout (optional)

- [ ] 7.0 Rollout plan and developer docs
  - [x] 7.1 Add flag control instructions and defaults to docs
  - [x] 7.2 Add monitoring checklist and rollback steps
  - [x] 7.3 Create a brief CHANGELOG entry noting feature flag and behavior



