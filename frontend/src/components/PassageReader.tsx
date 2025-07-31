'use client';

import { useState, useEffect } from 'react';

interface PassageReaderProps {
  passage: string;
  onComplete: (readingTime: number, errorCount: number) => void;
}

export default function PassageReader({ passage, onComplete }: PassageReaderProps) {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [incorrectWords, setIncorrectWords] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Start the timer when the component mounts
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    if (!startTime || isPaused) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isPaused]);

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

  // Parse passage into words with their indices
  const renderPassage = () => {
    const words = passage.split(/\s+/);
    return words.map((word, index) => {
      const isIncorrect = incorrectWords.has(index);
      return (
        <span
          key={index}
          onClick={() => handleWordClick(index)}
          className={`cursor-pointer transition-colors ${
            isIncorrect
              ? 'bg-red-200 text-red-800 px-1 rounded'
              : 'hover:bg-gray-200 px-1 rounded'
          }`}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Timer and Controls */}
      <div className="flex justify-between items-center">
        <div className="text-right">
          <div className="text-sm text-gray-500">Reading Time</div>
          <div className="text-2xl font-mono font-bold text-blue-600">
            {formatTime(elapsedTime)}
          </div>
        </div>
        <div className="flex space-x-3">
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
          <button
            onClick={handleComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            I&apos;m Done Reading
          </button>
        </div>
      </div>

      {/* Error Count Display */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-red-800 font-medium">Words Marked as Incorrect:</span>
          <span className="text-red-800 font-bold text-xl">{incorrectWords.size}</span>
        </div>
      </div>

      {/* Passage Display */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="text-lg leading-relaxed text-gray-900">
          {renderPassage()}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Instructions for Parents:</h3>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Have your student read the passage at their own pace</li>
          <li>• Click any word that is read incorrectly or skipped</li>
          <li>• Use the pause button if your student needs a break</li>
          <li>• Click &quot;I&apos;m Done Reading&quot; when they finish</li>
          <li>• Your student will then answer questions about the passage</li>
        </ul>
      </div>
    </div>
  );
} 