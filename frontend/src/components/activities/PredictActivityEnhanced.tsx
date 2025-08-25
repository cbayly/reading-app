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
  disabled = false
}) => {
  const deviceInfo = useDeviceDetector();
  const interactionPattern = getOptimalInteractionPattern(deviceInfo);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
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

    const option = content.content.options[index];
    const isStrong = option.plausibilityScore >= 7;
    const immediateFeedback: ActivityFeedback = {
      isCorrect: isStrong,
      score: Math.round((option.plausibilityScore / 10) * 100),
      feedback: option.feedback,
      suggestions: isStrong ? undefined : [
        'Look for details that better support a different prediction.',
        'Choose the option that best fits the character goals and events.'
      ],
      nextSteps: isStrong ? ['Consider what evidence supports this prediction.'] : ['Try selecting a more plausible option.']
    };
    setFeedback(immediateFeedback);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
  }, [disabled, content.content.options]);

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
        createdAt: new Date()
      }
    ];

    onComplete('predict', [selectedIndex], responses);
    onProgressUpdate?.('predict', 'completed', timeSpent);
  }, [disabled, selectedIndex, startTime, content, onComplete, onProgressUpdate]);

  const isCompleted = progress?.status === 'completed';
  const canComplete = selectedIndex !== null && !isCompleted;

  const getOptionClasses = (index: number) => {
    const selected = selectedIndex === index;
    if (selected && feedback) {
      return feedback.isCorrect ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50';
    }
    return 'border-gray-200 bg-white hover:border-gray-300';
  };

  const plausibilityColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Activity Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">How to complete this activity:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {interactionPattern.primaryInteraction === 'tap' ? 'Tap' : 'Click'} on the prediction you think is most likely</li>
              <li>• Consider clues from the story to guide your choice</li>
              <li>• Plausibility is shown from 1 (low) to 10 (high)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{content.content.question}</h3>
        <p className="text-gray-600">{content.content.instructions}</p>
      </div>

      {/* Immediate Feedback */}
      {showFeedback && feedback && (
        <div className={`border rounded-lg p-4 transition-all duration-300 ${feedback.isCorrect ? 'border-green-200 bg-green-50 text-green-800' : 'border-yellow-200 bg-yellow-50 text-yellow-800'}`} role="status" aria-live="polite">
          <div className="flex items-start">
            <svg className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${feedback.isCorrect ? 'text-green-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {feedback.isCorrect ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              )}
            </svg>
            <div>
              <p className="font-medium">{feedback.feedback}</p>
              {feedback.suggestions && feedback.suggestions.length > 0 && (
                <ul className="mt-2 text-sm space-y-1">
                  {feedback.suggestions.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900">Choose the most likely prediction:</h4>
        <div className="grid gap-3">
          {content.content.options.map((opt, index) => (
            <div
              key={index}
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
              <div className="flex items-start justify-between">
                <p className="text-gray-800 leading-relaxed pr-3">{opt.text}</p>
                <span className={`ml-3 px-2 py-1 text-xs rounded-full whitespace-nowrap ${plausibilityColor(opt.plausibilityScore)}`} aria-label={`Plausibility ${opt.plausibilityScore} of 10`}>
                  {opt.plausibilityScore}/10
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        {onJumpToContext && (
          <button
            onClick={() => onJumpToContext('predict-context')}
            className="inline-flex items-center px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors focus-ring"
            aria-label="Jump to story context for predictions"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
            Find in Story
          </button>
        )}

        {!isCompleted && (
          <button
            onClick={handleComplete}
            disabled={!canComplete || disabled}
            className={`px-6 py-2 rounded-lg font-medium transition-colors focus-ring ${
              canComplete && !disabled ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            aria-label="Complete activity"
          >
            Complete Activity
          </button>
        )}
      </div>

      {/* Final Feedback */}
      {isCompleted && feedback && (
        <div className="text-center py-4">
          <div className={`inline-flex items-center px-4 py-2 rounded-full ${feedback.isCorrect ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {feedback.isCorrect ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              )}
            </svg>
            {feedback.isCorrect ? 'Activity completed!' : 'Activity completed with feedback'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictActivityEnhanced;


