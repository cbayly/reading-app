// Scoring utilities module (v1 and v2)
// Exposes helpers and two scorer implementations, plus a selector.

// Tunable defaults
const DEFAULT_TUNABLES = {
  fluencyCap: 150, // PRD: FLUENCY_CAP
  accuracyHardFloor: null, // e.g., 93 (percent) or null to disable
};

// Helper: compute words per minute (rounded integer)
export function computeWpm(wordCount, readingTimeSeconds) {
  const minutes = readingTimeSeconds / 60;
  if (!minutes || minutes <= 0) return 0;
  return Math.round(wordCount / minutes);
}

// Helper: compute accuracy percent (0-100)
export function computeAccuracy(wordCount, errorCount) {
  if (!wordCount || wordCount <= 0) return 0;
  const correct = Math.max(0, wordCount - Math.max(0, errorCount || 0));
  const pct = (correct / wordCount) * 100;
  // Clamp to [0, 100] for safety
  return Math.max(0, Math.min(100, pct));
}

// Helper: compute comprehension/vocabulary percent
// questions: [{ type: 'comprehension'|'vocabulary', correctAnswer: 'A'|'B'|'C'|'D', ... }]
// answers: { [index: number]: 'A'|'B'|'C'|'D' }
export function computeCompVocab(questions = [], answers = {}) {
  let compTotal = 0;
  let compCorrect = 0;
  let vocabTotal = 0;
  let vocabCorrect = 0;

  questions.forEach((q, idx) => {
    const a = answers[idx];
    if (q?.type === 'comprehension') {
      compTotal += 1;
      if (a === q.correctAnswer) compCorrect += 1;
    } else if (q?.type === 'vocabulary') {
      vocabTotal += 1;
      if (a === q.correctAnswer) vocabCorrect += 1;
    }
  });

  const compPct = compTotal > 0 ? (compCorrect / compTotal) * 100 : null;
  const vocabPct = vocabTotal > 0 ? (vocabCorrect / vocabTotal) * 100 : null;

  let C = 0;
  if (compPct !== null && vocabPct !== null) {
    C = (compPct + vocabPct) / 2;
  } else if (compPct !== null) {
    C = compPct;
  } else if (vocabPct !== null) {
    C = vocabPct;
  } else {
    C = 0;
  }

  // Clamp to [0, 100]
  C = Math.max(0, Math.min(100, C));
  return C;
}

function cap(value, maximum) {
  return Math.min(value, maximum);
}

// V1 scorer: matches current backend logic
export function scoreV1({
  wordCount,
  readingTime,
  errorCount,
  questions,
  answers,
  benchmarkWpm,
  tunables = {},
}) {
  const mergedTunables = { ...DEFAULT_TUNABLES, ...tunables };
  const wpm = computeWpm(wordCount, readingTime);
  const accuracy = computeAccuracy(wordCount, errorCount);
  const compVocabScore = computeCompVocab(questions, answers);

  // Fluency
  const fluencyNormalized = (wpm / benchmarkWpm) * 100;
  const cappedFluencyNormalized = cap(fluencyNormalized, mergedTunables.fluencyCap);
  const fluencyScore = Math.round(cappedFluencyNormalized * (accuracy / 100));

  // Composite
  const compositeScore = Math.round((fluencyScore * 0.5) + (compVocabScore * 0.5));

  // Labels (v1)
  let readingLevelLabel;
  if (compositeScore >= 150) {
    readingLevelLabel = 'Above Grade Level';
  } else if (compositeScore >= 120) {
    readingLevelLabel = 'At Grade Level';
  } else if (compositeScore >= 90) {
    readingLevelLabel = 'Slightly Below Grade Level';
  } else {
    readingLevelLabel = 'Below Grade Level';
  }

  return { wpm, accuracy, fluencyScore, compVocabScore, compositeScore, readingLevelLabel };
}

function applyAccuracyHardFloor(label, accuracy, accuracyHardFloor) {
  if (accuracyHardFloor == null) return label;
  if (accuracy >= accuracyHardFloor) return label;
  // Downgrade one band: Above->At, At->Slightly Below; others unchanged
  if (label === 'Above Grade Level') return 'At Grade Level';
  if (label === 'At Grade Level') return 'Slightly Below Grade Level';
  return label;
}

// V2 scorer: PRD floors and thresholds
export function scoreV2({
  wordCount,
  readingTime,
  errorCount,
  questions,
  answers,
  benchmarkWpm,
  tunables = {},
}) {
  const { fluencyCap, accuracyHardFloor } = { ...DEFAULT_TUNABLES, ...tunables };

  const wpm = computeWpm(wordCount, readingTime);
  const accuracy = computeAccuracy(wordCount, errorCount);
  const compVocabScore = computeCompVocab(questions, answers);

  // Fluency
  const fluencyNormalized = (wpm / benchmarkWpm) * 100;
  const cappedFluencyNormalized = cap(fluencyNormalized, fluencyCap);
  const fluencyScore = Math.round(cappedFluencyNormalized * (accuracy / 100));

  const compositeScore = Math.round((fluencyScore + compVocabScore) / 2);

  // Floors and label selection
  const fMetAbove = fluencyScore >= 100;
  const cMetAbove = compVocabScore >= 85;
  const fMetAt = fluencyScore >= 85;
  const cMetAt = compVocabScore >= 75;

  let label;
  if (compositeScore >= 105 && fMetAbove && cMetAbove) {
    label = 'Above Grade Level';
  } else if (compositeScore >= 90 && compositeScore <= 104 && fMetAt && cMetAt) {
    label = 'At Grade Level';
  } else if (compositeScore >= 75) {
    // Slightly Below for 75–89 OR 90+ with missed floors
    label = 'Slightly Below Grade Level';
  } else {
    label = 'Below Grade Level';
  }

  // Apply optional accuracy hard floor downgrade
  label = applyAccuracyHardFloor(label, accuracy, accuracyHardFloor);

  return { wpm, accuracy, fluencyScore, compVocabScore, compositeScore, readingLevelLabel: label };
}

// Selector utility
export function pickScorer({ flag }) {
  return flag ? scoreV2 : scoreV1;
}

export default {
  computeWpm,
  computeAccuracy,
  computeCompVocab,
  scoreV1,
  scoreV2,
  pickScorer,
};


