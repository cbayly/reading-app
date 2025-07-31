'use client';

import React, { useState, useEffect } from 'react';
import '@/styles/print.css';

interface PassageReaderProps {
  passage: string;
  studentName?: string;
  onComplete: (readingTime: number, errorCount: number) => void;
}

export default function PassageReader({ passage, studentName, onComplete }: PassageReaderProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [incorrectWords, setIncorrectWords] = useState<Set<number>>(new Set());
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!startTime || isPaused) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isPaused]);

  const handleStart = () => {
    setStartTime(Date.now());
    setHasStarted(true);
  };

  const handlePause = () => {
    if (!isPaused) {
      setIsPaused(true);
      setPauseStartTime(Date.now());
    } else {
      setIsPaused(false);
      if (pauseStartTime) {
        const pauseDuration = Date.now() - pauseStartTime;
        setStartTime(prev => prev ? prev + pauseDuration : null);
        setPauseStartTime(null);
      }
    }
  };

  const handleWordClick = (wordIndex: number) => {
    setIncorrectWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordIndex)) {
        newSet.delete(wordIndex);
      } else {
        newSet.add(wordIndex);
      }
      return newSet;
    });
  };

  const handleComplete = () => {
    onComplete(elapsedTime, incorrectWords.size);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Parse passage into paragraphs and words
  const renderPassage = () => {
    // Split into paragraphs first (split on double newlines)
    const paragraphs = passage.split(/\n\s*\n/);
    
    return paragraphs.map((paragraph, paragraphIndex) => {
      // Split paragraph into words
      const words = paragraph.trim().split(/\s+/);
      
      return (
        <p key={`p-${paragraphIndex}`} className="mb-6 last:mb-0">
          {words.map((word, wordIndex) => {
            const globalWordIndex = paragraphs
              .slice(0, paragraphIndex)
              .reduce((sum, p) => sum + p.trim().split(/\s+/).length, 0) + wordIndex;
            
            const isIncorrect = incorrectWords.has(globalWordIndex);
            return (
              <React.Fragment key={`w-${globalWordIndex}`}>
                <span
                  onClick={() => handleWordClick(globalWordIndex)}
                  className={`cursor-pointer inline-block transition-colors whitespace-nowrap ${
                    isIncorrect
                      ? 'bg-red-200 text-red-800 px-1 rounded'
                      : 'hover:bg-gray-200 px-1 rounded'
                  }`}
                >
                  {word}
                </span>
                {/* Add a space after each word */}
                <span className="inline-block">&nbsp;</span>
              </React.Fragment>
            );
          })}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Instructions and Controls Row */}
      <div className="flex gap-6">
        {/* Instructions - 2/3 width */}
        <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4 no-print" style={{ flexBasis: '66.666%' }}>
          <h3 className="font-semibold text-blue-900 mb-2">Instructions for Parents:</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Click "Start Reading" to begin the timer</li>
            <li>• Have your student read the passage at their own pace</li>
            <li>• Click any word that is read incorrectly or skipped</li>
            <li>• Use the pause button if your student needs a break</li>
            <li>• Click &quot;I&apos;m Done Reading&quot; when they finish</li>
            <li>• Your student will then answer questions about the passage</li>
          </ul>
        </div>

        {/* Controls Panel - 1/3 width */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center space-y-4 no-print" style={{ flexBasis: '33.333%' }}>
          {/* Timer */}
          <div className="text-center">
            <div className="text-sm text-gray-500">Reading Time</div>
            <div className="text-2xl font-mono font-bold text-blue-600">
              {formatTime(elapsedTime)}
            </div>
          </div>

          {/* Start/Pause Button */}
          <div>
            {!hasStarted ? (
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Start Reading
              </button>
            ) : (
              <button
                onClick={handlePause}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isPaused
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
          </div>


        </div>
      </div>

      {/* Passage Display */}
      <div className="bg-gray-50 rounded-lg p-6 print-content">
        <div className="text-lg leading-relaxed text-gray-900 max-w-3xl mx-auto print-passage">
          <h1 className="text-2xl font-bold mb-6 print-header">Reading Assessment</h1>
          {renderPassage()}
        </div>
      </div>

      {/* Error Count */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 no-print">
        <div className="flex justify-between items-center">
          <span className="text-red-800 font-medium">Words Marked as Incorrect:</span>
          <span className="text-red-800 font-bold text-xl">{incorrectWords.size}</span>
        </div>
      </div>

      {/* Done Button */}
      <div className="text-center no-print">
        <button
          onClick={handleComplete}
          disabled={!hasStarted}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            !hasStarted
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          I&apos;m Done Reading
        </button>
      </div>
    </div>
  );
} 