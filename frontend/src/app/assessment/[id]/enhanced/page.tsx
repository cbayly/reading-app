'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Assessment } from '@/types/assessment';
import GenericSplitLayout from '@/components/layout/GenericSplitLayout';
import PassageReader from '@/components/PassageReader';
import AssessmentQuestionPane from '@/components/assessment/AssessmentQuestionPane';

interface Question {
  type: 'comprehension' | 'vocabulary';
  text?: string;
  question?: string;
  options: string[];
  correctAnswer: string;
  context?: string;
}

export default function EnhancedAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [readingCompleted, setReadingCompleted] = useState(false);

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

  const handleReadingComplete = (readingTime: number, errorCount: number) => {
    setReadingCompleted(true);
    // Store reading metrics for later submission
    localStorage.setItem(`assessment_${params.id}_readingTime`, readingTime.toString());
    localStorage.setItem(`assessment_${params.id}_errorCount`, errorCount.toString());
  };

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

    const readingTime = localStorage.getItem(`assessment_${params.id}_readingTime`);
    const errorCount = localStorage.getItem(`assessment_${params.id}_errorCount`);

    try {
      await api.put(`/assessments/${assessment.id}/submit`, {
        readingTime: parseInt(readingTime || '0', 10),
        errorCount: parseInt(errorCount || '0', 10),
        answers,
      });
      
      // Clean up localStorage after successful submission
      localStorage.removeItem(`assessment_${params.id}_readingTime`);
      localStorage.removeItem(`assessment_${params.id}_errorCount`);
      
      router.push(`/assessment/${assessment.id}/results`);
    } catch (err: any) {
      if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData.error === 'INVALID_ATTEMPT') {
          setError('Your reading session was too short to score accurately. Please try again with a longer reading session.');
        } else if (errorData.error === 'INVALID_GRADE_LEVEL') {
          setError('Grade level not supported for scoring. Please contact support.');
        } else {
          setError(errorData.message || 'Invalid request. Please try again.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to submit answers');
      }
    }
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your reading assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="p-4 border rounded-lg bg-red-50 border-red-200 text-red-800 mb-4" role="alert">
            <div className="flex items-start">
              <svg className="h-5 w-5 mt-0.5 me-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.336-.213 3.007-1.742 3.007H3.48c-1.53 0-2.492-1.67-1.743-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd"/>
              </svg>
              <div>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleBack}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!assessment || !assessment.passage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">No Assessment Found</h2>
          <p className="text-gray-600 mb-4">The reading assessment could not be loaded.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const firstName = assessment?.student?.name?.split(' ')[0] || assessment?.student?.name;
  const questions = assessment.questions as Question[];

  return (
    <GenericSplitLayout
      readingContent={
        <div className="h-full p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {firstName}&apos;s Reading Passage
            </h2>
            {!readingCompleted && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 text-sm">
                  Read the passage carefully. When you're done, click "Complete Reading" to move on to the questions.
                </p>
              </div>
            )}
          </div>
          <PassageReader
            passage={assessment.passage}
            studentName={firstName}
            onComplete={handleReadingComplete}
            showCompleteButton={!readingCompleted}
          />
        </div>
      }
      activityContent={
        <AssessmentQuestionPane
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          answers={answers}
          onAnswer={handleAnswer}
          onNext={handleNext}
          onPrevious={handlePrevious}
          readingCompleted={readingCompleted}
          studentName={firstName}
        />
      }
      title="Reading Assessment"
      subtitle={firstName}
      onBack={handleBack}
      defaultView={readingCompleted ? 'split' : 'reading'}
      printConfig={{
        readingPrintable: true,
        activitiesPrintable: false
      }}
      splitConfig={{
        defaultSplitValue: 0.6, // Give more space to reading
        minLeftWidth: 400,
        minRightWidth: 350,
        showDivider: true
      }}
    />
  );
}
