'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Assessment } from '@/types/assessment';
import GenericSplitLayout from '@/components/layout/GenericSplitLayout';
import AssessmentQuestionPane from '@/components/assessment/AssessmentQuestionPane';

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

    // Get reading time and error count from URL params, with localStorage fallback
    let readingTime = searchParams.get('readingTime');
    let errorCount = searchParams.get('errorCount');
    
    console.log('Assessment submission - URL params:', { readingTime, errorCount });
    
    // If URL params are missing, try localStorage as fallback
    if (!readingTime || !errorCount) {
      const storedReadingTime = localStorage.getItem(`assessment_${assessment.id}_readingTime`);
      const storedErrorCount = localStorage.getItem(`assessment_${assessment.id}_errorCount`);
      
      console.log('Using localStorage fallback:', { storedReadingTime, storedErrorCount });
      
      readingTime = readingTime || storedReadingTime || '0';
      errorCount = errorCount || storedErrorCount || '0';
    }
    
    console.log('Final values being submitted:', { readingTime, errorCount });

    try {
      await api.put(`/assessments/${assessment.id}/submit`, {
        readingTime: parseInt(readingTime, 10),
        errorCount: parseInt(errorCount, 10),
        answers,
      });
      
      // Clean up localStorage after successful submission
      localStorage.removeItem(`assessment_${assessment.id}_readingTime`);
      localStorage.removeItem(`assessment_${assessment.id}_errorCount`);
      
      router.push(`/assessment/${assessment.id}/results`);
    } catch (err: any) {
      // Handle specific error cases
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
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="p-4 border rounded-lg bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200 mb-4" role="alert">
            <div className="flex items-start">
              <svg className="h-5 w-5 mt-0.5 me-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.336-.213 3.007-1.742 3.007H3.48c-1.53 0-2.492-1.67-1.743-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd"/></svg>
              <div>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to previous step
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
  const firstName = assessment?.student?.name?.split(' ')[0] || assessment?.student?.name || 'Student';

  return (
    <GenericSplitLayout
      readingContent={
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reading Complete
            </h3>
            <p className="text-gray-600 text-sm">
              Great job! Now let's answer some questions about what you read.
            </p>
          </div>
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
          readingCompleted={true}
          studentName={firstName}
          onQuestionIndexChange={setCurrentQuestionIndex}
        />
      }
      title="Reading Assessment"
      subtitle={firstName}
      onBack={handleBack}
      defaultView="activity"
      printConfig={{
        readingPrintable: false,
        activitiesPrintable: false
      }}
      splitConfig={{
        defaultSplitValue: 0.3, // Give more space to questions
        minLeftWidth: 300,
        minRightWidth: 500,
        showDivider: true
      }}
    />
  );
}