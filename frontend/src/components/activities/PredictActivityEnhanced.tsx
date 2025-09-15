import React, { useState, useEffect, useCallback } from 'react';
import { useDeviceDetector, getOptimalInteractionPattern } from './shared/DeviceDetector';
import {
  EnhancedActivityProps,
  EnhancedPredictContent,
  ActivityResponse,
  ActivityFeedback
} from '../../types/enhancedActivities';

interface PredictActivityEnhancedProps extends EnhancedActivityProps {
  content: { type: 'predict'; content: EnhancedPredictContent };
}

const PredictActivityEnhanced: React.FC<PredictActivityEnhancedProps> = ({
  content,
  progress,
  onComplete,
  onProgressUpdate,
  onJumpToContext,
  className = '',
  disabled = false,
  planId,
  dayIndex
}) => {
  const deviceInfo = useDeviceDetector();
  const interactionPattern = getOptimalInteractionPattern(deviceInfo);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [checks, setChecks] = useState(0);
  const [startTime] = useState(Date.now());

  // Initialize from progress if available
  useEffect(() => {
    if (progress?.responses && progress.responses.length > 0) {
      const lastResponse = progress.responses[progress.responses.length - 1];
      if (typeof lastResponse.answer === 'number') {
        setSelectedIndex(lastResponse.answer);
      }
      if (progress.status === 'completed' && lastResponse.feedback) {
        const finalFeedback: ActivityFeedback = {
          isCorrect: lastResponse.isCorrect || false,
          score: lastResponse.score || 0,
          feedback: lastResponse.feedback,
          suggestions: lastResponse.isCorrect ? undefined : [
            'Compare clues in the story with the prediction you chose.',
            'Eliminate predictions that contradict known events.',
            'Favor predictions with clear cause-and-effect from prior events.'
          ],
          nextSteps: lastResponse.isCorrect ? [
            'Great inference! Proceed to the next activity.',
            'Explain why your prediction makes sense using evidence.'
          ] : [
            'Re-read the relevant parts of the story for more clues.',
            'Re-evaluate which prediction has the strongest support.'
          ]
        };
        setFeedback(finalFeedback);
        setShowFeedback(true);
      }
    }
  }, [progress]);

  // Update progress when activity starts
  useEffect(() => {
    if (!progress || progress.status === 'not_started') {
      onProgressUpdate?.('predict', 'in_progress');
    }
  }, [progress, onProgressUpdate]);

  const handleSelect = useCallback((index: number) => {
    if (disabled) return;
    setSelectedIndex(index);
    
    // Clear any existing feedback when selecting a new option
    setShowFeedback(false);
  }, [disabled]);

  const handleComplete = useCallback(() => {
    if (disabled || selectedIndex === null) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const option = content.content.options[selectedIndex];
    const score = Math.round((option.plausibilityScore / 10) * 100);
    const isCorrect = option.plausibilityScore >= 7; // consider 7-10 as strong/plausible

    const finalFeedback: ActivityFeedback = {
      isCorrect,
      score,
      feedback: isCorrect
        ? 'Strong prediction! Your choice is well-supported by the story.'
        : 'Your prediction is less likely. Consider the events and character motivations.',
      suggestions: !isCorrect ? [
        'Re-read the last few paragraphs for stronger clues.',
        'Ask: What would the character most likely do next?'
      ] : undefined,
      nextSteps: isCorrect ? [
        'Proceed to the next activity.',
        'Write one sentence explaining why this prediction makes sense.'
      ] : [
        'Try a different prediction with clearer evidence.',
        'Underline phrases in the text that support your choice.'
      ]
    };

    setFeedback(finalFeedback);
    setShowFeedback(true);

    const responses: ActivityResponse[] = [
      {
        id: `predict-response-${Date.now()}`,
        question: content.content.question,
        answer: selectedIndex,
        isCorrect,
        feedback: finalFeedback.feedback,
        score,
        timeSpent,
        createdAt: new Date(),
        // Include checks count for analytics
        metadata: {
          unsuccessfulChecks: checks + (isCorrect ? 0 : 1)
        }
      }
    ];

    onComplete('predict', [selectedIndex], responses);
    onProgressUpdate?.('predict', 'completed', timeSpent);
    
    // Track unsuccessful attempts (low plausibility score)
    if (!isCorrect) {
      setChecks((c) => c + 1);
    }
    
    // Show congratulations popup after a brief delay
    setTimeout(() => {
      setShowCongratulations(true);
    }, 1000);
  }, [disabled, selectedIndex, startTime, content, onComplete, onProgressUpdate]);

  const isCompleted = progress?.status === 'completed';
  const canComplete = selectedIndex !== null && !isCompleted;

  const getOptionClasses = (index: number) => {
    const selected = selectedIndex === index;
    if (selected) {
      return 'border-blue-500 bg-blue-50';
    }
    return 'border-gray-200 bg-white hover:border-gray-300';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Question header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{content.content.question}</h2>
      </div>

      {/* Blue instruction box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          {interactionPattern.primaryInteraction === 'tap' ? 'Tap' : 'Click'} on the prediction you think is most likely. Consider clues from the story to guide your choice.
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <div className="grid gap-3">
          {content.content.options.map((opt, index) => (
            <div key={index}>
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 focus-ring ${getOptionClasses(index)} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-pressed={selectedIndex === index}
                aria-label={`Prediction ${index + 1}: ${opt.text}`}
                onClick={() => handleSelect(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(index);
                  }
                }}
              >
                <p className="text-gray-800 leading-relaxed">{opt.text}</p>
              </div>
              
              {/* Reasoning appears under selected option */}
              {selectedIndex === index && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">Reasoning:</p>
                      <p className="text-sm text-blue-800">{opt.feedback}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {selectedIndex !== null && !isCompleted && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleComplete}
            className="rounded-lg px-4 py-2 text-sm font-semibold shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            Next
          </button>
        </div>
      )}


      {/* Congratulations Popup */}
      {showCongratulations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-xl">
            {/* Confetti Animation */}
            <div className="mb-6">
              <div className="text-6xl mb-2">🎉</div>
            </div>
            
            {/* Message */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Congratulations!
            </h2>
            <p className="text-gray-600 mb-6">
              You've completed all the activities for Chapter {dayIndex}!
            </p>
            
            {/* Button */}
            <button
              onClick={() => {
                // Navigate to plan overview page
                window.location.href = `/plan3/${planId || ''}`;
              }}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {dayIndex < 3 ? `Unlock Chapter ${dayIndex + 1}` : 'View Plan Overview'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictActivityEnhanced;


