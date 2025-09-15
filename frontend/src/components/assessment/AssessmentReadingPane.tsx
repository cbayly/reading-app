'use client';

import React from 'react';
import AssessmentPassageReader from './AssessmentPassageReader';
import '@/styles/reading-typography.css';

interface AssessmentReadingPaneProps {
  passage: string;
  studentName: string;
  onComplete: (readingTime: number, errorCount: number) => void;
  showCompleteButton?: boolean;
  className?: string;
  assessmentId?: string;
  errorCount?: number;
  readingTime?: number;
  onTimeClick?: () => void;
  isEditingTime?: boolean;
  editMinutes?: string;
  editSeconds?: string;
  onEditMinutesChange?: (value: string) => void;
  onEditSecondsChange?: (value: string) => void;
  onTimeEditSubmit?: () => void;
  onTimeEditCancel?: () => void;
  onTimeKeyDown?: (e: React.KeyboardEvent) => void;
  onTimeBlur?: () => void;
  editContainerRef?: React.RefObject<HTMLDivElement | null>;
  hasStarted?: boolean;
  isPaused?: boolean;
  onButtonClick?: () => void;
  onErrorCountChange?: (count: number) => void;
  onTimerStateChange?: (hasStarted: boolean, isPaused: boolean) => void;
  onElapsedTimeChange?: (time: number) => void;
}

const AssessmentReadingPane: React.FC<AssessmentReadingPaneProps> = ({
  passage,
  studentName,
  onComplete,
  showCompleteButton = true,
  className = '',
  assessmentId,
  errorCount = 0,
  readingTime = 0,
  onTimeClick,
  isEditingTime = false,
  editMinutes = '',
  editSeconds = '',
  onEditMinutesChange,
  onEditSecondsChange,
  onTimeEditSubmit,
  onTimeEditCancel,
  onTimeKeyDown,
  onTimeBlur,
  editContainerRef,
  hasStarted = false,
  isPaused = false,
  onButtonClick,
  onErrorCountChange,
  onTimerStateChange,
  onElapsedTimeChange
}) => {
  return (
    <div 
      className={`p-4 md:p-8 bg-white h-full overflow-auto reading-content transition-all duration-300 ease-in-out ${className}`}
      role="main"
      aria-label="Reading assessment content"
    >
      <div className="mx-auto w-full max-w-4xl">
        {/* Assessment Header */}
        <header className="mb-8 pb-6 border-b border-gray-200" role="banner">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
              Reading Assessment
            </h1>
          </div>
          
          <div className="flex items-center justify-between text-sm text-gray-500" role="contentinfo" aria-label="Assessment metadata">
            <div className="flex items-center space-x-6">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <span>Reading Passage</span>
              </span>
              <span className="flex items-center text-red-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <span>{errorCount} Errors</span>
              </span>
              <span className="flex items-center text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {!isEditingTime ? (
                  <button
                    type="button"
                    className={`px-2 py-1 rounded ${readingTime > 0 ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-400'} focus:outline-none`}
                    onClick={onTimeClick}
                    title={readingTime > 0 ? 'Click to edit time' : undefined}
                  >
                    {Math.floor(readingTime / 60)}:{(readingTime % 60).toString().padStart(2, '0')}
                  </button>
                ) : (
                  <input
                    ref={editContainerRef}
                    type="text"
                    value={`${editMinutes}:${editSeconds}`}
                    onChange={(e) => {
                      const value = e.target.value;
                      const [minutes, seconds] = value.split(':');
                      if (onEditMinutesChange) onEditMinutesChange(minutes || '');
                      if (onEditSecondsChange) onEditSecondsChange(seconds || '');
                      
                      // Auto-pause timer when user starts typing
                      if (onTimerStateChange && hasStarted && !isPaused) {
                        onTimerStateChange(hasStarted, true);
                      }
                    }}
                    onKeyDown={onTimeKeyDown}
                    onBlur={onTimeBlur}
                    onFocus={(e) => e.target.select()}
                    className="w-16 px-2 py-1 border border-blue-300 rounded text-center text-sm bg-blue-50 text-blue-600"
                    autoFocus
                    placeholder="0:00"
                  />
                )}
              </span>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors duration-200 ${
                  !hasStarted || isPaused 
                    ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800' 
                    : 'bg-gray-500 hover:bg-gray-600 active:bg-gray-700'
                }`}
                onClick={onButtonClick}
                style={{ outline: 'none' }}
                onFocus={(e) => e.target.blur()}
              >
                {!hasStarted ? 'Start' : isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
        </header>

        {/* Assessment Content */}
        <article 
          className="max-w-none"
          style={{ color: '#000000' }}
          aria-label="Assessment reading passage"
          role="article"
        >
          <section 
            className="leading-relaxed"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              lineHeight: '1.75',
              letterSpacing: '0.01em',
              color: '#000000',
              fontWeight: '400'
            }}
            aria-label="Assessment passage content"
          >
            <AssessmentPassageReader
              passage={passage}
              studentName={studentName}
              onComplete={onComplete}
              showCompleteButton={showCompleteButton}
              assessmentId={assessmentId}
              onErrorCountChange={onErrorCountChange}
              externalHasStarted={hasStarted}
              externalIsPaused={isPaused}
              onTimerStateChange={onTimerStateChange}
              onElapsedTimeChange={onElapsedTimeChange}
            />
          </section>
        </article>

        {/* Assessment Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200" role="contentinfo" aria-label="Assessment navigation">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-6">
              <span className="font-medium text-gray-600">Reading Assessment</span>
            </div>
            <div className="flex items-center space-x-3" role="group" aria-label="Assessment navigation controls">
              <button
                onClick={() => {
                  const container = document.querySelector('.reading-content');
                  if (container) {
                    container.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 focus-ring font-medium"
                aria-label="Scroll to top of assessment"
                title="Scroll to top of assessment"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                </svg>
                Top
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AssessmentReadingPane;
