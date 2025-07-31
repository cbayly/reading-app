'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Assessment } from '@/types/assessment';

interface Question {
  type: 'comprehension' | 'vocabulary';
  text: string;
  options: string[];
  correctAnswer: string;
}

function getGradeEquivalent(compositeScore: number): string {
  if (compositeScore >= 90) return 'Above Grade Level';
  if (compositeScore >= 70) return 'At Grade Level';
  if (compositeScore >= 50) return 'Approaching Grade Level';
  return 'Below Grade Level';
}

function getStrengthsAndWeaknesses(wpm: number, accuracy: number, comprehensionScore: number) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // WPM Analysis
  if (wpm >= 150) {
    strengths.push('Excellent reading speed');
  } else if (wpm < 100) {
    weaknesses.push('Reading speed could be improved');
  }

  // Accuracy Analysis
  if (accuracy >= 95) {
    strengths.push('High reading accuracy');
  } else if (accuracy < 90) {
    weaknesses.push('Focus on reading accuracy');
  }

  // Comprehension Analysis
  if (comprehensionScore >= 75) {
    strengths.push('Strong reading comprehension');
  } else if (comprehensionScore < 60) {
    weaknesses.push('Work on understanding what you read');
  }

  return { strengths, weaknesses };
}

export default function AssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const response = await api.get(`/assessments/${params.id}`);
        setAssessment(response.data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load assessment results');
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAssessment();
    }
  }, [params.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!assessment || !assessment.studentAnswers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">No Results Found</h2>
          <p className="text-gray-600 mb-4">
            The assessment results could not be loaded. This might be because the assessment is
            still in progress.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const questions = assessment.questions as Question[];
  const answers = assessment.studentAnswers as Record<number, string>;
  let correctAnswers = 0;
  Object.entries(answers).forEach(([index, answer]) => {
    if (questions[parseInt(index)].correctAnswer === answer) {
      correctAnswers++;
    }
  });
  const comprehensionScore =
    assessment.questions && assessment.questions.length > 0
      ? Math.round(
          (Object.values(assessment.studentAnswers).filter(
            (answer, index) =>
              (assessment.questions as Question[])[index].correctAnswer === answer
          ).length /
            assessment.questions.length) *
            100
        )
      : 0;
  const gradeEquivalent = getGradeEquivalent(assessment.compositeScore);
  const { strengths, weaknesses } = getStrengthsAndWeaknesses(
    assessment.wpm,
    assessment.accuracy,
    comprehensionScore
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {assessment.student?.name}&apos;s Reading Results
              </h1>
              <p className="text-gray-600">
                Here&apos;s how {assessment.student?.name} did on their assessment
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Overall Score */}
          <div className="mb-12 text-center">
            <div className="inline-block bg-blue-50 rounded-full px-8 py-8 mb-4">
              <div className="text-4xl font-bold text-blue-600 mb-1">
                {Math.round(assessment.compositeScore * 100)}%
              </div>
              <div className="text-sm text-blue-800">Composite Score</div>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {gradeEquivalent}
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">{assessment.wpm}</div>
              <div className="text-sm text-gray-600">Words per Minute</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">{assessment.accuracy}%</div>
              <div className="text-sm text-gray-600">Reading Accuracy</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {comprehensionScore}%
              </div>
              <div className="text-sm text-gray-600">Comprehension</div>
            </div>
          </div>

          {/* Strengths & Areas for Growth */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Strengths
              </h3>
              <ul className="space-y-2">
                {strengths.map((strength, index) => (
                  <li
                    key={index}
                    className="flex items-center text-green-700 bg-green-50 rounded-lg p-3"
                  >
                    <span className="mr-2">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Areas for Growth
              </h3>
              <ul className="space-y-2">
                {weaknesses.map((weakness, index) => (
                  <li
                    key={index}
                    className="flex items-center text-orange-700 bg-orange-50 rounded-lg p-3"
                  >
                    <span className="mr-2">!</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Question Analysis */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Question Analysis
            </h3>
            <div className="space-y-4">
              {questions.map((question, index) => {
                const isCorrect = answers[index] === question.correctAnswer;
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      isCorrect ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">Question {index + 1}</div>
                      <div
                        className={`text-sm font-medium ${
                          isCorrect ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{question.text}</p>
                    <div className="text-sm">
                      <span className="font-medium">Your answer:</span>{' '}
                      {question.options[answers[index].charCodeAt(0) - 65]}
                      {!isCorrect && (
                        <>
                          <br />
                          <span className="font-medium">Correct answer:</span>{' '}
                          {
                            question.options[
                              question.correctAnswer.charCodeAt(0) - 65
                            ]
                          }
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}