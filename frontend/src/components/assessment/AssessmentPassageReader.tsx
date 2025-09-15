'use client';

import React, { useState, useEffect, useRef } from 'react';
import '@/styles/print.css';
import { Button } from '@/components/ui/Button';

// Utility function to clean and format passage text
const cleanPassage = (passage: string): string => {
  return passage
    .trim()
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')   // Handle old Mac line endings
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks to double
    .replace(/[ \t]+/g, ' ') // Normalize whitespace
    .trim();
};

interface AssessmentPassageReaderProps {
  passage: string;
  studentName?: string;
  onComplete: (readingTime: number, errorCount: number) => void;
  showCompleteButton?: boolean;
  onErrorCountChange?: (count: number) => void;
  // Control completion state from parent
  canComplete?: boolean;
  // External elapsed time in seconds to use when completing
  externalElapsedSeconds?: number;
  // When true, disable word marking interactions
  readOnly?: boolean;
  // Assessment ID for interim saves
  assessmentId?: string;
  // External timer control
  externalHasStarted?: boolean;
  externalIsPaused?: boolean;
  onTimerStateChange?: (hasStarted: boolean, isPaused: boolean) => void;
  onElapsedTimeChange?: (time: number) => void;
}

export default function AssessmentPassageReader({ 
  passage, 
  studentName, 
  onComplete, 
  showCompleteButton = true,
  onErrorCountChange,
  canComplete = true,
  externalElapsedSeconds,
  readOnly = false,
  assessmentId,
  externalHasStarted,
  externalIsPaused,
  onTimerStateChange,
  onElapsedTimeChange
}: AssessmentPassageReaderProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [incorrectWords, setIncorrectWords] = useState<Set<number>>(new Set());
  const [hasStarted, setHasStarted] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const currentHasStarted = externalHasStarted !== undefined ? externalHasStarted : hasStarted;
  const currentIsPaused = externalIsPaused !== undefined ? externalIsPaused : isPaused;
  const [showManualTimer, setShowManualTimer] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualSeconds, setManualSeconds] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editMinutes, setEditMinutes] = useState('');
  const [editSeconds, setEditSeconds] = useState('');
  const [wasRunningBeforeEdit, setWasRunningBeforeEdit] = useState(false);
  const editContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!startTime || currentIsPaused) return;

    const interval = setInterval(() => {
      const newElapsedTime = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(newElapsedTime);
      if (onElapsedTimeChange) {
        onElapsedTimeChange(newElapsedTime);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, currentIsPaused, onElapsedTimeChange]);

  // Sync external state changes with timer
  useEffect(() => {
    if (externalHasStarted && !startTime) {
      setStartTime(Date.now());
    }
  }, [externalHasStarted, startTime]);

  const handleStart = () => {
    setStartTime(Date.now());
    if (onTimerStateChange) {
      onTimerStateChange(true, false);
    } else {
      setHasStarted(true);
    }
  };

  const handlePause = () => {
    if (!currentIsPaused) {
      if (onTimerStateChange) {
        onTimerStateChange(currentHasStarted, true);
      } else {
        setIsPaused(true);
      }
      setPauseStartTime(Date.now());
    } else {
      if (onTimerStateChange) {
        onTimerStateChange(currentHasStarted, false);
      } else {
        setIsPaused(false);
      }
      if (pauseStartTime) {
        const pauseDuration = Date.now() - pauseStartTime;
        setStartTime(prev => prev ? prev + pauseDuration : null);
        setPauseStartTime(null);
      }
    }
  };

  const handleWordClick = (wordIndex: number) => {
    if (readOnly) return;
    const newSet = new Set(incorrectWords);
    if (newSet.has(wordIndex)) {
      newSet.delete(wordIndex);
    } else {
      newSet.add(wordIndex);
    }
    setIncorrectWords(newSet);
    if (onErrorCountChange) onErrorCountChange(newSet.size);
  };

  const handleManualTimerSubmit = () => {
    // legacy noop retained for compatibility; parent owns timer now
    setShowManualTimer(false);
  };

  const handleComplete = () => {
    const total = typeof externalElapsedSeconds === 'number' ? externalElapsedSeconds : elapsedTime;
    onComplete(total, incorrectWords.size);
  };

  const handleTimeClick = () => {
    if (!hasStarted) return;
    
    const currentMinutes = Math.floor(elapsedTime / 60);
    const currentSeconds = elapsedTime % 60;
    
    setEditMinutes(currentMinutes.toString());
    setEditSeconds(currentSeconds.toString().padStart(2, '0'));
    setWasRunningBeforeEdit(!isPaused);
    setIsEditingTime(true);
    
    // Pause the timer while editing if it was running
    if (!isPaused) {
      handlePause();
    }
  };

  const handleTimeEditSubmit = () => {
    const minutes = parseInt(editMinutes) || 0;
    const seconds = parseInt(editSeconds) || 0;
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds >= 0) {
      setElapsedTime(totalSeconds);
      if (startTime) {
        // Adjust start time to match the new elapsed time
        setStartTime(Date.now() - (totalSeconds * 1000));
      }
    }
    
    setIsEditingTime(false);
    
    // Resume only if it was running before edit
    if (wasRunningBeforeEdit) {
      handlePause();
    }
  };

  const handleTimeEditCancel = () => {
    setIsEditingTime(false);
    
    // Resume only if it was running before edit
    if (wasRunningBeforeEdit) {
      handlePause();
    }
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
    // Defer to allow focus to move between the two inputs
    setTimeout(() => {
      const active = document.activeElement;
      if (editContainerRef.current && active && editContainerRef.current.contains(active)) {
        return; // still inside editor
      }
      // Commit changes when leaving the editor entirely
      if (isEditingTime) handleTimeEditSubmit();
    }, 0);
  };

  // Save reading progress periodically
  useEffect(() => {
    if (!assessmentId || !hasStarted) return;
    
    const saveProgress = async () => {
      try {
        const response = await fetch(`/api/assessments/${assessmentId}/reading`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            readingTime: elapsedTime,
            errorCount: incorrectWords.size,
          }),
        });
        
        if (!response.ok) {
          console.warn('Failed to save reading progress');
        }
      } catch (error) {
        console.warn('Error saving reading progress:', error);
      }
    };

    // Save every 30 seconds
    const interval = setInterval(saveProgress, 30000);
    return () => clearInterval(interval);
  }, [assessmentId, hasStarted, elapsedTime, incorrectWords.size]);

  // Debug function to check computed styles
  const debugStyles = () => {
    const passageElement = document.querySelector('.reading-passage');
    const paragraphElement = passageElement?.querySelector('p');
    
    if (passageElement) {
      const styles = getComputedStyle(passageElement);
      console.log('Passage container styles:', {
        whiteSpace: styles.whiteSpace,
        wordBreak: styles.wordBreak,
        overflowWrap: styles.overflowWrap,
        hyphens: styles.hyphens,
        overflow: styles.overflow,
        display: styles.display,
        webkitLineClamp: styles.webkitLineClamp,
        webkitBoxOrient: styles.webkitBoxOrient
      });
    }
    
    if (paragraphElement) {
      const pStyles = getComputedStyle(paragraphElement);
      console.log('Paragraph styles:', {
        display: pStyles.display,
        overflow: pStyles.overflow,
        webkitLineClamp: pStyles.webkitLineClamp,
        webkitBoxOrient: pStyles.webkitBoxOrient,
        whiteSpace: pStyles.whiteSpace,
        textOverflow: pStyles.textOverflow
      });
    }
  };

  // Check styles on mount
  useEffect(() => {
    debugStyles();
  }, []);

  // Initialize error count on mount and when cleared externally
  useEffect(() => {
    if (onErrorCountChange) onErrorCountChange(incorrectWords.size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onErrorCountChange]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Parse passage into paragraphs and words
  const renderPassage = () => {
    const cleanedPassage = cleanPassage(passage);
    // Split into paragraphs first (split on double newlines)
    const paragraphs = cleanedPassage.split(/\n\s*\n/);

    return paragraphs.map((paragraph, paragraphIndex) => {
      // Split paragraph into words
      const words = paragraph.trim().split(/\s+/);

      return (
        <p key={`p-${paragraphIndex}`} className="not-prose">
          {words.map((word, wordIndex) => {
            const globalWordIndex = paragraphs
              .slice(0, paragraphIndex)
              .reduce((acc, p) => acc + p.trim().split(/\s+/).length, 0) + wordIndex;
            
            const isIncorrect = incorrectWords.has(globalWordIndex);

            return (
              <span
                key={`word-${globalWordIndex}`}
                onClick={() => handleWordClick(globalWordIndex)}
                className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} transition-colors duration-200 ${
                  isIncorrect
                    ? 'bg-red-200 text-red-800 rounded'
                    : readOnly ? '' : 'hover:bg-gray-100 rounded'
                }`}
                aria-disabled={readOnly}
                title={isIncorrect ? 'Click to mark as correct' : 'Click to mark as incorrect'}
              >
                {word}
              </span>
            );
          }).reduce((acc: React.ReactNode[], node, idx) => {
            if (idx > 0) acc.push(' ');
            acc.push(node);
            return acc;
          }, [])}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-blue-900"
          aria-expanded={showInstructions}
          aria-controls="assessment-instructions"
          onClick={() => setShowInstructions((s) => !s)}
        >
          <span className="font-semibold">Instructions</span>
          <svg
            className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
          </svg>
        </button>
        {showInstructions && (
          <div id="assessment-instructions" className="px-4 pb-4 text-sm text-blue-900">
            <ol className="list-decimal pl-5 space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new Event('generic-print'));
                    }
                  }}
                  className="underline font-medium text-blue-700 hover:text-blue-800"
                >
                  Print the passage
                </button>
                {" "}if possible. Ask the student to read it aloud.
              </li>
              <li>Click <span className="font-semibold">Start Reading</span> to begin timing. Use <span className="font-semibold">Stop Reading</span> to pause and <span className="font-semibold">Resume Reading</span> to continue.</li>
              <li>When the student misreads or hesitates on a word, click that word in the passage to mark an error.</li>
              <li>To correct the time, click the time display and enter it manually. This pauses the timer.</li>
              <li>When finished, click <span className="font-semibold">Stop Reading</span> or <span className="font-semibold">I'm Done Reading</span>.</li>
            </ol>
          </div>
        )}
      </div>

      {/* Passage Display */}
      <div className="print-content min-w-0">
        <div className="reading-passage not-prose no-clamp max-w-[68ch] text-[18px] leading-8 space-y-5 break-normal whitespace-normal no-hyphens">
          {renderPassage()}
        </div>
      </div>

      {/* Done Button */}
      {showCompleteButton && (
        <div className="text-center no-print">
          <Button
            onClick={handleComplete}
            disabled={!canComplete}
            variant="primary"
            className={`disabled:opacity-50 disabled:cursor-not-allowed text-sm`}
          >
            I&apos;m Done Reading
          </Button>
        </div>
      )}
    </div>
  );
}
