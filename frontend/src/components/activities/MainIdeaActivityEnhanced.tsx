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

export default function MainIdeaActivityEnhanced({
  content,
  progress,
  onComplete,
  onProgressUpdate,
  onJumpToContext,
  className = '',
  disabled = false
}: MainIdeaActivityEnhancedProps) {
  // Debug: Log what we're receiving
  console.log('🧠 Main Idea activity received:', {
    content,
    hasOptions: !!content?.content?.options,
    optionsCount: content?.content?.options?.length || 0,
    options: content?.content?.options,
    question: content?.content?.question
  });

  const deviceInfo = useDeviceDetector();
  const interactionPattern = getOptimalInteractionPattern(deviceInfo);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [checks, setChecks] = useState(0);
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
    setShowFeedback(false);
  }, [disabled]);

  const handleCheck = useCallback(() => {
    if (disabled || !selectedOption) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const selectedOptionData = content.content.options?.find(opt => opt.text === selectedOption);
    const isCorrect = !!selectedOptionData?.isCorrect;
    const score = isCorrect ? 100 : 0;

    const finalFeedback: ActivityFeedback = {
      isCorrect,
      score,
      feedback: isCorrect ? 'Correct' : 'Incorrect'
    };
    setFeedback(finalFeedback);
    setShowFeedback(true);
    setChecks((c) => c + (isCorrect ? 0 : 1));

    // Save in_progress for attempts
    onProgressUpdate?.('main-idea', 'in_progress', timeSpent);

    if (isCorrect) {
      const responses: ActivityResponse[] = [
        {
          id: `main-idea-response-${Date.now()}`,
          question: content.content.question,
          answer: [selectedOption],
          isCorrect,
          feedback: finalFeedback.feedback,
          score,
          timeSpent,
          createdAt: new Date()
        }
      ];
      onComplete('main-idea', [selectedOption], responses);
      onProgressUpdate?.('main-idea', 'completed', timeSpent);
    }
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

  const isCompleted = progress?.status === 'completed' || (feedback?.isCorrect ?? false);
  const canCheck = !!selectedOption && !isCompleted;

  return (
    <div className="space-y-4">
      {/* Simple header like Who activity */}
      <div>
        <h2 className="text-lg font-semibold">{content.content.question}</h2>
      </div>

      {/* Simple blue instruction box like Who activity */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">Select the option that best describes the main idea of this story.</p>
      </div>

      {/* Grid layout for options like Who activity */}
      <div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(content.content.options || []).map((option, index) => {
            const isSelected = selectedOption === option.text;
            const isCorrect = option.isCorrect;
            
            return (
              <button
                key={option.text}
                type="button"
                onClick={() => handleOptionSelect(option.text)}
                disabled={disabled || isCompleted}
                className={`
                  w-full rounded-lg border p-4 text-left shadow-sm transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                  ${disabled || isCompleted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                  ${showFeedback && isSelected && isCorrect ? 'border-green-300 bg-green-50' : ''}
                  ${showFeedback && isSelected && !isCorrect ? 'border-red-300 bg-red-50' : ''}
                `}
              >
                <div className="mb-1 text-base font-normal text-gray-900">
                  {option.text}
                  {showFeedback && isSelected && isCorrect && (
                    <span className="ml-1">✅</span>
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <span className="ml-1">✗</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simple feedback and button like Who activity */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-sm text-gray-700">
          {showFeedback && feedback && (
            feedback.isCorrect ? (
              <span className="font-semibold text-green-700">Correct</span>
            ) : (
              <span className="font-semibold text-red-700">Incorrect</span>
            )
          )}
        </div>
        {(() => {
          const showNext = !!(feedback && feedback.isCorrect);
          const isDisabled = !selectedOption && !showFeedback;
          return (
            <button
              onClick={showNext ? () => {
                // Save the answer when moving to next
                if (selectedOption) {
                  const responses: ActivityResponse[] = [
                    {
                      id: `main-idea-response-${Date.now()}`,
                      question: content.content.question,
                      answer: [selectedOption],
                      isCorrect: true,
                      feedback: feedback?.feedback || 'Correct answer!',
                      score: 100,
                      timeSpent: Math.floor((Date.now() - startTime) / 1000),
                      createdAt: new Date()
                    }
                  ];
                  onComplete('main-idea', [selectedOption], responses);
                }
                onProgressUpdate?.('main-idea', 'completed');
              } : handleCheck}
              className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${
                showNext
                  ? 'text-white bg-green-600 hover:bg-green-700'
                  : isDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  : 'text-white bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isDisabled}
            >
              {showNext ? 'Next' : 'Check'}
            </button>
          );
        })()}
      </div>
    </div>
  );
};
