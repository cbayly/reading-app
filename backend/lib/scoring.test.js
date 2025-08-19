import { computeWpm, computeAccuracy, computeCompVocab, scoreV2 } from './scoring.js';

describe('scoring helpers', () => {
  test('computeWpm rounds correctly', () => {
    expect(computeWpm(300, 120)).toBe(150);
  });
  test('computeAccuracy clamps and computes', () => {
    expect(computeAccuracy(100, 1)).toBeCloseTo(99);
    expect(computeAccuracy(100, 150)).toBe(0);
  });
  test('computeCompVocab averages comps and vocab', () => {
    const questions = [
      { type: 'comprehension', correctAnswer: 'A' },
      { type: 'comprehension', correctAnswer: 'B' },
      { type: 'vocabulary', correctAnswer: 'C' },
      { type: 'vocabulary', correctAnswer: 'D' },
    ];
    const answers = { 0: 'A', 1: 'B', 2: 'D', 3: 'D' }; // 2/2 comp, 1/2 vocab → (100 + 50)/2 = 75
    expect(computeCompVocab(questions, answers)).toBe(75);
  });
});

describe('scoreV2 test vectors (Grade 5 benchmark 150)', () => {
  const tunables = { fluencyCap: 150 };
  const questions = new Array(8).fill(0).map((_, i) => ({
    type: i < 4 ? 'comprehension' : 'vocabulary',
    correctAnswer: ['A', 'B', 'C', 'D'][i % 4],
  }));

  function makeAnswers(percent) {
    const correctCount = Math.round((percent / 100) * questions.length);
    const ans = {};
    for (let i = 0; i < questions.length; i++) {
      ans[i] = i < correctCount ? questions[i].correctAnswer : (questions[i].correctAnswer === 'A' ? 'B' : 'A');
    }
    return ans;
  }

  test('#1 WPM=150 Acc=98 C=85 → F≈98, Composite≈92 → At', () => {
    const result = scoreV2({
      wordCount: 300, // 300 words in 2 min → 150 WPM
      readingTime: 120,
      errorCount: 6, // 98%
      questions,
      answers: makeAnswers(85),
      benchmarkWpm: 150,
      tunables,
    });
    expect(result.fluencyScore).toBeGreaterThanOrEqual(96);
    expect(result.fluencyScore).toBeLessThanOrEqual(100);
    expect(result.compositeScore).toBeGreaterThanOrEqual(91);
    expect(result.compositeScore).toBeLessThanOrEqual(94);
    expect(result.readingLevelLabel).toBe('At Grade Level');
  });

  test('#2 WPM=157 Acc=96 C≈75–80 → F≈100, Composite≈88–92 → Slightly Below/At band edge', () => {
    const result = scoreV2({
      wordCount: 314,
      readingTime: 120,
      errorCount: 12, // 96%
      questions,
      answers: makeAnswers(80),
      benchmarkWpm: 150,
      tunables,
    });
    expect(result.fluencyScore).toBeGreaterThanOrEqual(98);
    expect(result.fluencyScore).toBeLessThanOrEqual(102);
    expect(result.compositeScore).toBeGreaterThanOrEqual(88);
    expect(result.compositeScore).toBeLessThanOrEqual(92);
    // With 6/8 correct distributed by type, C skews to 75 and Composite ~88 → Slightly Below
    expect(['At Grade Level', 'Slightly Below Grade Level']).toContain(result.readingLevelLabel);
  });

  test('#3 WPM=140 Acc=98 C=95 → F≈91, Composite≈93 → At', () => {
    const result = scoreV2({
      wordCount: 280,
      readingTime: 120,
      errorCount: 6, // 98%
      questions,
      answers: makeAnswers(95),
      benchmarkWpm: 150,
      tunables,
    });
    expect(result.fluencyScore).toBeGreaterThanOrEqual(89);
    expect(result.fluencyScore).toBeLessThanOrEqual(93);
    expect(result.compositeScore).toBeGreaterThanOrEqual(92);
    expect(result.compositeScore).toBeLessThanOrEqual(96);
    expect(result.readingLevelLabel).toBe('At Grade Level');
  });

  test('#4 WPM=150 Acc=95 C=75 → F≈95, Composite≈85 → Slightly Below', () => {
    const result = scoreV2({
      wordCount: 300,
      readingTime: 120,
      errorCount: 15, // 95%
      questions,
      answers: makeAnswers(75),
      benchmarkWpm: 150,
      tunables,
    });
    expect(result.fluencyScore).toBeGreaterThanOrEqual(94);
    expect(result.fluencyScore).toBeLessThanOrEqual(96);
    expect(result.compositeScore).toBeGreaterThanOrEqual(84);
    expect(result.compositeScore).toBeLessThanOrEqual(86);
    expect(result.readingLevelLabel).toBe('Slightly Below Grade Level');
  });

  test('#5 WPM=130 Acc=99 C=95 → F≈86, Composite≈91 → At', () => {
    const result = scoreV2({
      wordCount: 260,
      readingTime: 120,
      errorCount: 1, // 99%
      questions,
      answers: makeAnswers(95),
      benchmarkWpm: 150,
      tunables,
    });
    expect(result.fluencyScore).toBeGreaterThanOrEqual(85);
    expect(result.fluencyScore).toBeLessThanOrEqual(88);
    expect(result.compositeScore).toBeGreaterThanOrEqual(90);
    expect(result.compositeScore).toBeLessThanOrEqual(93);
    expect(result.readingLevelLabel).toBe('At Grade Level');
  });

  test('#6 WPM=250 Acc=90 C=90 → cap 150, F≈135, Composite≈113 → Above', () => {
    const result = scoreV2({
      wordCount: 500,
      readingTime: 120,
      errorCount: 30, // 90%
      questions,
      answers: makeAnswers(90),
      benchmarkWpm: 150,
      tunables,
    });
    expect(result.fluencyScore).toBeGreaterThanOrEqual(133);
    expect(result.fluencyScore).toBeLessThanOrEqual(141);
    expect(result.compositeScore).toBeGreaterThanOrEqual(111);
    expect(result.compositeScore).toBeLessThanOrEqual(115);
    expect(result.readingLevelLabel).toBe('Above Grade Level');
  });
});

describe('scoreV2 edge cases', () => {
  const questionsCompOnly = new Array(4).fill(0).map((_, i) => ({ type: 'comprehension', correctAnswer: 'A' }));
  const questionsNone = [];

  test('single-type questions: C equals that type percent', () => {
    const answers = { 0: 'A', 1: 'A' }; // 2/4 = 50%
    const res = scoreV2({
      wordCount: 300,
      readingTime: 120,
      errorCount: 0,
      questions: questionsCompOnly,
      answers,
      benchmarkWpm: 150,
      tunables: { fluencyCap: 150 },
    });
    expect(res.compVocabScore).toBe(50);
  });

  test('zero questions: C = 0%', () => {
    const res = scoreV2({
      wordCount: 300,
      readingTime: 120,
      errorCount: 0,
      questions: questionsNone,
      answers: {},
      benchmarkWpm: 150,
      tunables: { fluencyCap: 150 },
    });
    expect(res.compVocabScore).toBe(0);
  });

  test('accuracy hard floor downgrades one band', () => {
    // Setup At-grade composite but low accuracy to trigger downgrade
    const questions = new Array(8).fill(0).map((_, i) => ({
      type: i < 4 ? 'comprehension' : 'vocabulary',
      correctAnswer: 'A',
    }));
    const answers = { 0: 'A', 1: 'A', 2: 'A', 3: 'A', 4: 'A', 5: 'A' }; // 6/8 ~ 75%
    const res = scoreV2({
      wordCount: 300,
      readingTime: 120,
      errorCount: 15, // 95% → would meet At floors
      questions,
      answers,
      benchmarkWpm: 150,
      tunables: { fluencyCap: 150, accuracyHardFloor: 96 }, // floor 96% -> accuracy 95% triggers downgrade
    });
    expect(res.readingLevelLabel).toBe('Slightly Below Grade Level');
  });
});

