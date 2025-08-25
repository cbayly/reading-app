import React, { useState, useEffect, useCallback } from 'react';
import { useDeviceDetector, getOptimalInteractionPattern } from './shared/DeviceDetector';
import { 
  EnhancedActivityProps, 
  EnhancedMainIdeaContent, 
  EnhancedMainIdeaOption, 
  ActivityResponse,
  ActivityFeedback 
} from '../../types/enhancedActivities';

interface MainIdeaActivityEnhancedProps extends EnhancedActivityProps {
  content: { type: 'main-idea'; content: EnhancedMainIdeaContent };
}

const MainIdeaActivityEnhanced: React.FC<MainIdeaActivityEnhancedProps> = ({
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
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime] = useState(Date.now());

  // Initialize from progress if available
  useEffect(() => {
    if (progress?.responses && progress.responses.length > 0) {
      const lastResponse = progress.responses[progress.responses.length - 1];
      if (lastResponse.answer && typeof lastResponse.answer === 'string') {
        setSelectedOption(lastResponse.answer);
      }
    }
  }, [progress]);

  // Update progress when activity starts
  useEffect(() => {
    if (!progress || progress.status === 'not_started') {
      onProgressUpdate?.('main-idea', 'in_progress');
    }
  }, [progress, onProgressUpdate]);

  // Set feedback if activity is already completed
  useEffect(() => {
    if (progress?.status === 'completed' && progress.responses && progress.responses.length > 0) {
      const lastResponse = progress.responses[progress.responses.length - 1];
      if (lastResponse.feedback) {
        const finalFeedback: ActivityFeedback = {
          isCorrect: lastResponse.isCorrect || false,
          score: lastResponse.score || 0,
          feedback: lastResponse.feedback,
          suggestions: lastResponse.isCorrect ? undefined : [
            'Read the story carefully to understand the main message.',
            'Look for repeated ideas or themes throughout the story.',
            'Consider what the author wants readers to learn or understand.',
            'Think about the deeper meaning, not just what happened.'
          ],
          nextSteps: lastResponse.isCorrect ? [
            'Great job! You can now move on to the next activity.',
            'Try to remember this main idea for the other activities.'
          ] : [
            'Review the story to understand the main message.',
            'Look for clues about what the author is trying to teach.'
          ]
        };
        setFeedback(finalFeedback);
        setShowFeedback(true);
      }
    }
  }, [progress]);

  const handleOptionSelect = useCallback((optionText: string) => {
    if (disabled) return;

    setSelectedOption(optionText);
    
    // Find the selected option to get feedback
    const option = content.content.options.find(opt => opt.text === optionText);
    if (option) {
      const feedback: ActivityFeedback = {
        isCorrect: option.isCorrect,
        score: option.isCorrect ? 100 : 0,
        feedback: option.feedback,
        suggestions: option.isCorrect ? undefined : [
          'Read the story carefully to understand the main message.',
          'Look for repeated ideas or themes throughout the story.',
          'Consider what the author wants readers to learn or understand.'
        ],
        nextSteps: option.isCorrect ? [
          'Great job! You can now move on to the next activity.',
          'Try to remember this main idea for the other activities.'
        ] : [
          'Review the story to understand the main message.',
          'Look for clues about what the author is trying to teach.'
        ]
      };
      setFeedback(feedback);
      setShowFeedback(true);
      
      // Hide feedback after 5 seconds for incorrect answers
      if (!option.isCorrect) {
        setTimeout(() => setShowFeedback(false), 5000);
      }
    }
  }, [disabled, content.content.options]);

  const handleComplete = useCallback(() => {
    if (disabled || !selectedOption) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const selectedOptionData = content.content.options.find(opt => opt.text === selectedOption);
    
    const isCorrect = selectedOptionData?.isCorrect || false;
    const score = isCorrect ? 100 : 0;
    
    const finalFeedback: ActivityFeedback = {
      isCorrect,
      score,
      feedback: selectedOptionData?.feedback || 'Thank you for your response.',
      suggestions: isCorrect ? undefined : [
        'Read the story carefully to understand the main message.',
        'Look for repeated ideas or themes throughout the story.',
        'Consider what the author wants readers to learn or understand.',
        'Think about the deeper meaning, not just what happened.'
      ],
      nextSteps: isCorrect ? [
        'Great job! You can now move on to the next activity.',
        'Try to remember this main idea for the other activities.'
      ] : [
        'Review the story to understand the main message.',
        'Look for clues about what the author is trying to teach.'
      ]
    };

    setFeedback(finalFeedback);
    setShowFeedback(true);

    // Create responses for detailed tracking
    const responses: ActivityResponse[] = [
      {
        id: `main-idea-response-${Date.now()}`,
        question: content.content.question,
        answer: selectedOption,
        isCorrect,
        feedback: finalFeedback.feedback,
        score,
        timeSpent,
        createdAt: new Date()
      }
    ];

    onComplete('main-idea', selectedOption, responses);
    onProgressUpdate?.('main-idea', 'completed', timeSpent);
  }, [disabled, selectedOption, content, startTime, onComplete, onProgressUpdate]);

  const getOptionStatus = (option: EnhancedMainIdeaOption) => {
    if (!selectedOption) return 'unselected';
    if (option.text === selectedOption) {
      return option.isCorrect ? 'correct' : 'incorrect';
    }
    if (selectedOption && option.isCorrect) {
      return 'correct-unselected';
    }
    return 'unselected';
  };

  const getOptionStatusColor = (status: string) => {
    switch (status) {
      case 'correct':
        return 'border-green-500 bg-green-50 text-green-800';
      case 'incorrect':
        return 'border-red-500 bg-red-50 text-red-800';
      case 'correct-unselected':
        return 'border-green-300 bg-green-25 text-green-700';
      default:
        return 'border-gray-200 bg-white text-gray-900 hover:border-gray-300';
    }
  };

  const isCompleted = progress?.status === 'completed';
  const canComplete = selectedOption !== null && !isCompleted;

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
              <li>• {interactionPattern.primaryInteraction === 'tap' ? 'Tap' : 'Click'} on the option that best describes the main idea</li>
              <li>• Read all options carefully before making your choice</li>
              <li>• You'll get immediate feedback on your selection</li>
              <li>• Think about what the author wants readers to understand</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {content.content.question}
        </h3>
        <p className="text-gray-600">
          {content.content.instructions}
        </p>
      </div>

      {/* Immediate Feedback */}
      {showFeedback && feedback && (
        <div className={`border rounded-lg p-4 transition-all duration-300 ${
          feedback.isCorrect 
            ? 'border-green-200 bg-green-50 text-green-800' 
            : 'border-yellow-200 bg-yellow-50 text-yellow-800'
        }`} role="status" aria-live="polite">
          <div className="flex items-start">
            <svg className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
              feedback.isCorrect ? 'text-green-600' : 'text-yellow-600'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  {feedback.suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Multiple Choice Options */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900">
          Select the option that best describes the main idea:
        </h4>
        
        <div className="space-y-3">
          {content.content.options.map((option, index) => {
            const status = getOptionStatus(option);
            const isSelected = selectedOption === option.text;
            
            return (
              <div
                key={option.text}
                className={`
                  relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 focus-ring
                  ${getOptionStatusColor(status)}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => handleOptionSelect(option.text)}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-pressed={isSelected}
                aria-label={`Option ${index + 1}: ${option.text}${isSelected ? ' (selected)' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOptionSelect(option.text);
                  }
                }}
              >
                {/* Selection Indicator */}
                <div className="absolute top-2 left-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    status === 'correct' 
                      ? 'bg-green-500' 
                      : status === 'incorrect'
                        ? 'bg-red-500'
                        : 'bg-gray-300'
                  }`}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {status === 'correct' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      ) : status === 'incorrect' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      )}
                    </svg>
                  </div>
                </div>

                {/* Option Content */}
                <div className="ml-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">Option {index + 1}</span>
                    {option.isCorrect && selectedOption && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Correct Answer
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 leading-relaxed">{option.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedOption && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm font-medium text-green-800">
                Option selected
              </span>
            </div>
            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={disabled}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus-ring transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Complete activity"
              >
                Complete Activity
              </button>
            )}
          </div>
        </div>
      )}

      {/* Jump to Context */}
      {onJumpToContext && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Find theme clues in the story</h4>
              <p className="text-sm text-gray-600">Click the button to jump to relevant parts of the story</p>
            </div>
            <button
              onClick={() => onJumpToContext('main-idea-context')}
              className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus-ring"
              aria-label="Jump to story context for main idea analysis"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
              Find in Story
            </button>
          </div>
        </div>
      )}

      {/* Final Feedback */}
      {isCompleted && feedback && (
        <div className="text-center py-4">
          <div className={`inline-flex items-center px-4 py-2 rounded-full ${
            feedback.isCorrect 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {feedback.isCorrect ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              )}
            </svg>
            {feedback.isCorrect ? 'Activity completed!' : 'Activity completed with feedback'}
          </div>
          {feedback.nextSteps && feedback.nextSteps.length > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              <p className="font-medium">Next steps:</p>
              <ul className="mt-1 space-y-1">
                {feedback.nextSteps.map((step, index) => (
                  <li key={index}>• {step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MainIdeaActivityEnhanced;
