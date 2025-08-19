'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Assessment } from '@/types/assessment';

interface Question {
  type: 'comprehension' | 'vocabulary';
  text?: string;
  question?: string; // Alternative field name
  options: string[];
  correctAnswer: string;
  context?: string; // Quote from the passage
}

function getGradeEquivalent(compositeScore: number): string {
  // Based on typical reading assessment benchmarks
  if (compositeScore >= 140) return 'Above Grade Level';
  if (compositeScore >= 120) return 'At Grade Level';
  if (compositeScore >= 100) return 'Approaching Grade Level';
  return 'Below Grade Level';
}

function getGradeLevel(compositeScore: number): string {
  // Determine approximate grade level based on composite score
  if (compositeScore >= 160) return 'Grade 6+';
  if (compositeScore >= 140) return 'Grade 5';
  if (compositeScore >= 120) return 'Grade 4';
  if (compositeScore >= 100) return 'Grade 3';
  if (compositeScore >= 80) return 'Grade 2';
  if (compositeScore >= 60) return 'Grade 1';
  return 'Kindergarten';
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
  const [showQuestionAnalysis, setShowQuestionAnalysis] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planCreated, setPlanCreated] = useState(false);

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

  const handleCreateWeeklyPlan = async () => {
    if (!assessment?.student?.id) {
      setError('Student information not available');
      return;
    }

    setCreatingPlan(true);
    try {
      const response = await api.post('/plans/generate', { 
        studentId: assessment.student.id 
      });
      
      if (response.data && response.data.plan && response.data.plan.id) {
        setPlanCreated(true);
        // Navigate to the weekly plan page
        router.push(`/plan/${response.data.plan.id}`);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error creating weekly plan:', err);
      setError('Failed to create weekly plan. Please try again.');
    } finally {
      setCreatingPlan(false);
    }
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
  // Use backend reading level label and calculate grade level
  const readingLevelLabel = assessment.readingLevelLabel || 'Grade Level Not Available';
  const gradeLevel = getGradeLevel(assessment.compositeScore || 0);
  const { strengths, weaknesses } = getStrengthsAndWeaknesses(
    assessment.wpm || 0,
    assessment.accuracy ? 
      (assessment.accuracy > 1 ? Math.round(assessment.accuracy) : Math.round(assessment.accuracy * 100)) 
      : 0,
    comprehensionScore
  );

  const firstName = assessment?.student?.name?.split(' ')[0] || assessment?.student?.name;
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {firstName}&apos;s Reading Results
              </h1>
              <p className="text-gray-600">
                Here&apos;s how {firstName} did on their assessment
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
            <div className="inline-block bg-blue-50 rounded-full px-8 py-8 mb-4 relative group">
              <div className="text-4xl font-bold text-blue-600 mb-1">
                {assessment.compositeScore || 0}
              </div>
              <div className="text-sm text-blue-800">Composite Score</div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                <div className="font-semibold mb-1">Composite Score Breakdown:</div>
                <div>• Fluency Score: {assessment.fluencyScore?.toFixed(1) || 'N/A'}</div>
                <div>• Comp/Vocab Score: {assessment.compVocabScore?.toFixed(1) || 'N/A'}</div>
                <div>• Final: ({assessment.fluencyScore?.toFixed(1) || 0} × 0.5) + ({assessment.compVocabScore?.toFixed(1) || 0} × 0.5)</div>
                <div className="border-t border-gray-700 mt-1 pt-1 font-bold">
                  Total: {assessment.compositeScore || 0}
                </div>
                <div className="text-xs mt-1">
                  Reading Level: {readingLevelLabel}
                </div>
                <div className="text-xs">
                  Assessed Grade: {gradeLevel}
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
            <div className={`text-xl font-semibold ${
              readingLevelLabel === 'Above Grade Level' ? 'text-green-600' :
              readingLevelLabel === 'At Grade Level' ? 'text-blue-600' :
              readingLevelLabel === 'Slightly Below Grade Level' ? 'text-yellow-600' :
              readingLevelLabel === 'Below Grade Level' ? 'text-red-600' :
              'text-gray-900'
            }`}>
              {readingLevelLabel}
            </div>
            <div className="text-lg text-gray-600 mt-2">
              Grade Equivalent: {gradeLevel}
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-4 gap-6 mb-12">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">{assessment.wpm || 0}</div>
              <div className="text-sm text-gray-600">Words per Minute</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {assessment.accuracy ? 
                  (assessment.accuracy > 1 ? Math.round(assessment.accuracy) : Math.round(assessment.accuracy * 100)) 
                  : 0}%
              </div>
              <div className="text-sm text-gray-600">Reading Accuracy</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {assessment.fluencyScore?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Fluency Score</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {assessment.compVocabScore?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Comp/Vocab Score</div>
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
            {(() => {
              const correctAnswers = questions.filter((question, index) => 
                answers[index] === question.correctAnswer
              ).length;
              const totalQuestions = questions.length;
              
              return (
                <>
                  <button
                    onClick={() => setShowQuestionAnalysis(!showQuestionAnalysis)}
                    className="w-full flex justify-between items-center text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mb-4"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Question Analysis
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {correctAnswers} of {totalQuestions} questions answered correctly
                      </p>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <span className="text-sm mr-2">
                        {showQuestionAnalysis ? 'Hide' : 'Show'} Details
                      </span>
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          showQuestionAnalysis ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>
                  
                  {showQuestionAnalysis && (
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
                            
                            {/* Question text */}
                            <p className="text-gray-700 mb-3 font-medium">
                              {question.text || question.question || 'Question text not available'}
                            </p>
                            
                            {/* Context/quote from passage if available */}
                            {question.context && (
                              <div className="bg-gray-100 rounded p-3 mb-3 text-sm">
                                <div className="font-medium text-gray-600 mb-1">From the passage:</div>
                                <div className="italic text-gray-700">"{question.context}"</div>
                              </div>
                            )}
                            
                            {/* Answer options */}
                            <div className="space-y-2 mb-3">
                              <div className="text-sm font-medium text-gray-600">Options:</div>
                              {question.options.map((option, optionIndex) => {
                                const optionLetter = String.fromCharCode(65 + optionIndex);
                                const isSelected = answers[index] === optionLetter;
                                const isCorrectOption = question.correctAnswer === optionLetter;
                                
                                return (
                                  <div
                                    key={optionIndex}
                                    className={`text-sm p-2 rounded ${
                                      isSelected && isCorrectOption
                                        ? 'bg-green-200 text-green-800'
                                        : isSelected && !isCorrectOption
                                        ? 'bg-red-200 text-red-800'
                                        : isCorrectOption
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    <span className="font-medium">{optionLetter}.</span> {option}
                                    {isSelected && isCorrectOption && (
                                      <span className="ml-2 text-green-600">✓ Your answer (correct)</span>
                                    )}
                                    {isSelected && !isCorrectOption && (
                                      <span className="ml-2 text-red-600">✗ Your answer (incorrect)</span>
                                    )}
                                    {!isSelected && isCorrectOption && (
                                      <span className="ml-2 text-green-600">✓ Correct answer</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Weekly Plan Creation */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Next Steps
              </h3>
              <p className="text-gray-600 mb-6">
                Based on {firstName}&apos;s assessment results, you can now create a personalized weekly reading plan.
              </p>
              
              <button
                onClick={handleCreateWeeklyPlan}
                disabled={creatingPlan || planCreated}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  creatingPlan || planCreated
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {creatingPlan ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Weekly Plan...
                  </div>
                ) : planCreated ? (
                  <div className="flex items-center">
                    <span className="mr-2">✓</span>
                    Weekly Plan Created!
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="mr-2">📚</span>
                    Create Weekly Reading Plan
                  </div>
                )}
              </button>
              
              {error && (
                <p className="text-red-600 mt-4 text-sm">
                  {error}
                </p>
              )}
              
              <p className="text-sm text-gray-500 mt-4">
                The weekly plan will be tailored to {firstName}&apos;s reading level and interests.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}