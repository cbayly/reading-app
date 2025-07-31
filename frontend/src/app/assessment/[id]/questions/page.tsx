'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Assessment } from '@/types/assessment';

interface Question {
  type: 'comprehension' | 'vocabulary';
  text?: string;
  question?: string;
  options: string[];
  correctAnswer: string;
}

export default function AssessmentQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const response = await api.get(`/assessments/${params.id}`);
        setAssessment(response.data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load assessment');
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAssessment();
    }
  }, [params.id]);

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));
  };

  const handleNext = () => {
    if (!assessment?.questions) return;
    
    if (currentQuestionIndex < assessment.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Submit answers and navigate to results
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    const readingTime = searchParams.get('readingTime');
    const errorCount = searchParams.get('errorCount');

    try {
      await api.put(`/assessments/${assessment.id}/submit`, {
        readingTime: parseInt(readingTime || '0', 10),
        errorCount: parseInt(errorCount || '0', 10),
        answers,
      });
      router.push(`/assessment/${assessment.id}/results`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to submit answers');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
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

  if (!assessment || !assessment.questions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">No Questions Found</h2>
          <p className="text-gray-600 mb-4">The assessment questions could not be loaded.</p>
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

  const questions = assessment.questions as Question[];
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {assessment.student?.name}&apos;s Reading Assessment
            </h1>
            <p className="text-gray-600">
              Let&apos;s check {assessment.student?.name}&apos;s understanding of the passage
            </p>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium text-gray-600">
                {currentQuestion.type === 'comprehension' ? 'Comprehension' : 'Vocabulary'}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {currentQuestion.text || currentQuestion.question || 'Question text not available'}
            </h2>
            <div className="space-y-4">
              {currentQuestion.options.map((option, index) => {
                const letter = String.fromCharCode(65 + index); // A, B, C, D
                const isSelected = answers[currentQuestionIndex] === letter;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(letter)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <span className="font-medium">{letter}.</span> {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentQuestionIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!answers[currentQuestionIndex]}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                !answers[currentQuestionIndex]
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLastQuestion ? 'Submit Answers' : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}