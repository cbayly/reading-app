'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Assessment } from '@/types/assessment';
import GenericSplitLayout from '@/components/layout/GenericSplitLayout';
import AssessmentReadingPane from '@/components/assessment/AssessmentReadingPane';
import AssessmentQuestionPane from '@/components/assessment/AssessmentQuestionPane';

interface Question {
  type: 'comprehension' | 'vocabulary';
  text?: string;
  question?: string;
  options: string[];
  correctAnswer: string;
  context?: string;
}

export default function CombinedAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [readingCompleted, setReadingCompleted] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editMinutes, setEditMinutes] = useState('');
  const [editSeconds, setEditSeconds] = useState('');
  const [wasRunningBeforeEdit, setWasRunningBeforeEdit] = useState(false);
  const editContainerRef = useRef<HTMLDivElement | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'reading' | 'split' | 'activity'>('reading');
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const response = await api.get(`/assessments/${params.id}`);
        setAssessment(response.data);
        // Load persisted reading time/errors if present
        if (typeof response.data?.readingTime === 'number') {
          setReadingTime(response.data.readingTime);
        }
        if (typeof response.data?.errorCount === 'number') {
          setErrorCount(response.data.errorCount || 0);
        }
        // Mark completed if time already exists (enables tabs and allows default split)
        if (typeof response.data?.readingTime === 'number' && response.data.readingTime > 0) {
          setReadingCompleted(true);
          setLayoutMode('split');
        }
        // If questions are missing, poll until they are saved by backend
        if (!response.data?.questions) {
          setQuestionsLoading(true);
          const maxAttempts = 30;
          let attempts = 0;
          while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, Math.min(500 + attempts * 150, 2000)));
            const check = await api.get(`/assessments/${params.id}`);
            if (check.data?.questions) {
              setAssessment(check.data);
              break;
            }
            attempts++;
          }
          setQuestionsLoading(false);
        }
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

  const handleReadingComplete = (time: number, errors: number) => {
    setReadingCompleted(true);
    setReadingTime(time);
    setErrorCount(errors);
    setLayoutMode('split');
    
    // Persist immediately so refresh shows final time
    if (assessment) {
      // Save to localStorage as backup
      localStorage.setItem(`assessment_${assessment.id}_readingTime`, time.toString());
      localStorage.setItem(`assessment_${assessment.id}_errorCount`, errors.toString());
      
      void api.put(`/assessments/${assessment.id}/reading`, {
        readingTime: time,
        errorCount: errors
      });
    }
  };

  const handleButtonClick = () => {
    if (!hasStarted) {
      setHasStarted(true);
    } else {
      setIsPaused(!isPaused);
    }
  };

  const handleTimerStateChange = (newHasStarted: boolean, newIsPaused: boolean) => {
    setHasStarted(newHasStarted);
    setIsPaused(newIsPaused);
  };

  const handleErrorCountChange = (count: number) => {
    setErrorCount(count);
  };

  const handleElapsedTimeChange = (time: number) => {
    setReadingTime(time);
  };

  const handleTimeClick = () => {
    if (readingTime === 0) return;
    
    const currentMinutes = Math.floor(readingTime / 60);
    const currentSeconds = readingTime % 60;
    
    setEditMinutes(currentMinutes.toString());
    setEditSeconds(currentSeconds.toString().padStart(2, '0'));
    setWasRunningBeforeEdit(true); // Assume it was running if we're editing
    setIsEditingTime(true);
  };

  const handleTimeEditSubmit = () => {
    const minutes = parseInt(editMinutes) || 0;
    const seconds = parseInt(editSeconds) || 0;
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds >= 0) {
      setReadingTime(totalSeconds);
    }
    
    setIsEditingTime(false);
  };

  const handleTimeEditCancel = () => {
    setIsEditingTime(false);
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTimeEditSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTimeEditCancel();
    }
  };

  const handleInlineTimeBlur = () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (editContainerRef.current && active && editContainerRef.current.contains(active)) {
        return;
      }
      if (isEditingTime) handleTimeEditSubmit();
    }, 0);
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

    // Use localStorage as fallback if state values are 0 (indicating they might be lost)
    const finalReadingTime = readingTime || parseInt(localStorage.getItem(`assessment_${assessment.id}_readingTime`) || '0', 10);
    const finalErrorCount = errorCount || parseInt(localStorage.getItem(`assessment_${assessment.id}_errorCount`) || '0', 10);

    try {
      await api.put(`/assessments/${assessment.id}/submit`, {
        readingTime: finalReadingTime,
        errorCount: finalErrorCount,
        answers,
      });
      
      // Clean up localStorage after successful submission
      localStorage.removeItem(`assessment_${assessment.id}_readingTime`);
      localStorage.removeItem(`assessment_${assessment.id}_errorCount`);
      
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

  const firstName = assessment?.student?.name?.split(' ')[0] || assessment?.student?.name || 'Student';
  const questions = assessment.questions as Question[];

  return (
    <GenericSplitLayout
      view={layoutMode}
      onViewChange={(mode) => setLayoutMode(mode)}
      readingContent={
        <AssessmentReadingPane
          passage={assessment.passage}
          studentName={firstName}
          onComplete={handleReadingComplete}
          showCompleteButton={!readingCompleted}
          assessmentId={assessment.id.toString()}
          errorCount={errorCount}
          readingTime={readingTime}
          onTimeClick={handleTimeClick}
          isEditingTime={isEditingTime}
          editMinutes={editMinutes}
          editSeconds={editSeconds}
          onEditMinutesChange={setEditMinutes}
          onEditSecondsChange={setEditSeconds}
          onTimeEditSubmit={handleTimeEditSubmit}
          onTimeEditCancel={handleTimeEditCancel}
          onTimeKeyDown={handleInlineKeyDown}
          onTimeBlur={handleInlineTimeBlur}
          editContainerRef={editContainerRef}
          hasStarted={hasStarted}
          isPaused={isPaused}
          onButtonClick={handleButtonClick}
          onErrorCountChange={handleErrorCountChange}
          onTimerStateChange={handleTimerStateChange}
          onElapsedTimeChange={handleElapsedTimeChange}
        />
      }
      activityContent={
        questionsLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-gray-600">Generating questions…</p>
            </div>
          </div>
        ) : (
          <AssessmentQuestionPane
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            answers={answers}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onPrevious={handlePrevious}
            readingCompleted={readingCompleted}
            studentName={firstName}
            renderAll
            onAnswerAtIndex={(index, answer) =>
              setAnswers(prev => ({
                ...prev,
                [index]: answer
              }))
            }
            onSubmit={handleSubmit}
            onQuestionIndexChange={setCurrentQuestionIndex}
          />
        )
      }
      title="Reading Assessment"
      subtitle={firstName}
      onBack={handleBack}
      defaultView={readingCompleted ? 'split' : 'reading'}
      // Hide view tabs until reading is completed
      hideModeSelector={!readingCompleted}
      // Match Day 1 outside background
      backgroundClassName="bg-gray-50"
      printConfig={{
        readingPrintable: true,
        activitiesPrintable: false
      }}
      printStrategy="iframe"
      printTargetSelector=".print-content"
      activityLoading={questionsLoading}
    />
  );
}
