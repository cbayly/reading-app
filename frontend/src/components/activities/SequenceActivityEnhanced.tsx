import React, { useState, useEffect, useCallback } from 'react';
import { useDeviceDetector, getOptimalInteractionPattern } from './shared/DeviceDetector';
import { 
  EnhancedActivityProps, 
  EnhancedSequenceContent, 
  EnhancedEvent, 
  ActivityResponse,
  ActivityFeedback 
} from '../../types/enhancedActivities';

interface SequenceActivityEnhancedProps extends EnhancedActivityProps {
  content: { type: 'sequence'; content: EnhancedSequenceContent };
}

const SequenceActivityEnhanced: React.FC<SequenceActivityEnhancedProps> = ({
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
  
  const [orderedEvents, setOrderedEvents] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  // Initialize from progress if available
  useEffect(() => {
    if (progress?.responses && progress.responses.length > 0) {
      const lastResponse = progress.responses[progress.responses.length - 1];
      if (lastResponse.answer && Array.isArray(lastResponse.answer)) {
        setOrderedEvents(lastResponse.answer);
      }
    } else {
      // Initialize with shuffled events
      const shuffledEvents = [...content.content.events]
        .sort(() => Math.random() - 0.5)
        .map(event => event.id);
      setOrderedEvents(shuffledEvents);
    }
  }, [progress, content.content.events]);

  // Update progress when activity starts
  useEffect(() => {
    if (!progress || progress.status === 'not_started') {
      onProgressUpdate?.('sequence', 'in_progress');
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
            'Read the story carefully to understand the sequence of events.',
            'Look for time indicators like "first", "then", "finally".',
            'Pay attention to cause and effect relationships.'
          ],
          nextSteps: lastResponse.isCorrect ? [
            'Great job! You can now move on to the next activity.',
            'Try to remember this sequence for the other activities.'
          ] : [
            'Review the story to understand the correct order.',
            'Look for clues about what happens first, second, and so on.'
          ]
        };
        setFeedback(finalFeedback);
        setShowFeedback(true);
      }
    }
  }, [progress]);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    if (interactionPattern.dragPattern === 'touchDrag') return; // Disable drag on touch-only devices
    
    setDraggedEvent(eventId);
    e.dataTransfer.setData('text/plain', eventId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (interactionPattern.dragPattern === 'touchDrag') return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (interactionPattern.dragPattern === 'touchDrag') return;
    
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    
    if (draggedId) {
      reorderEvents(draggedId, targetIndex);
    }
    
    setDraggedEvent(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    if (interactionPattern.dragPattern === 'touchDrag') return;
    
    setDraggedEvent(null);
    setDragOverIndex(null);
  };

  const reorderEvents = useCallback((draggedId: string, targetIndex: number) => {
    setOrderedEvents(prev => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedId);
      
      if (draggedIndex !== -1) {
        // Remove from original position
        newOrder.splice(draggedIndex, 1);
        // Insert at new position
        newOrder.splice(targetIndex, 0, draggedId);
      }
      
      return newOrder;
    });
  }, []);

  const handleTapToSwap = useCallback((eventId: string) => {
    if (disabled || interactionPattern.dragPattern !== 'touchDrag') return;

    if (selectedEvent === null) {
      setSelectedEvent(eventId);
    } else if (selectedEvent === eventId) {
      setSelectedEvent(null);
    } else {
      // Swap the two selected events
      const firstIndex = orderedEvents.indexOf(selectedEvent);
      const secondIndex = orderedEvents.indexOf(eventId);
      
      if (firstIndex !== -1 && secondIndex !== -1) {
        setOrderedEvents(prev => {
          const newOrder = [...prev];
          [newOrder[firstIndex], newOrder[secondIndex]] = [newOrder[secondIndex], newOrder[firstIndex]];
          return newOrder;
        });
      }
      
      setSelectedEvent(null);
    }
  }, [selectedEvent, orderedEvents, disabled, interactionPattern.dragPattern]);

  const handleComplete = useCallback(() => {
    if (disabled) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // Check if events are in correct order
    const correctOrder = content.content.events
      .sort((a, b) => a.order - b.order)
      .map(event => event.id);
    
    const isCorrect = JSON.stringify(orderedEvents) === JSON.stringify(correctOrder);
    
    // Calculate score based on how many events are in correct position
    let correctPositions = 0;
    orderedEvents.forEach((eventId, index) => {
      if (correctOrder[index] === eventId) {
        correctPositions++;
      }
    });
    
    const score = Math.round((correctPositions / correctOrder.length) * 100);
    
    const finalFeedback: ActivityFeedback = {
      isCorrect,
      score,
      feedback: isCorrect 
        ? 'Excellent! You correctly ordered all the story events.'
        : `You got ${correctPositions} out of ${correctOrder.length} events in the correct order.`,
      suggestions: !isCorrect ? [
        'Read the story carefully to understand the sequence of events.',
        'Look for time indicators like "first", "then", "finally".',
        'Pay attention to cause and effect relationships.'
      ] : undefined,
      nextSteps: isCorrect ? [
        'Great job! You can now move on to the next activity.',
        'Try to remember this sequence for the other activities.'
      ] : [
        'Review the story to understand the correct order.',
        'Look for clues about what happens first, second, and so on.'
      ]
    };

    setFeedback(finalFeedback);
    setShowFeedback(true);

    // Create responses for detailed tracking
    const responses: ActivityResponse[] = [
      {
        id: `sequence-response-${Date.now()}`,
        question: content.content.question,
        answer: orderedEvents,
        isCorrect,
        feedback: finalFeedback.feedback,
        score,
        timeSpent,
        createdAt: new Date()
      }
    ];

    onComplete('sequence', orderedEvents, responses);
    onProgressUpdate?.('sequence', 'completed', timeSpent);
  }, [disabled, orderedEvents, content, startTime, onComplete, onProgressUpdate]);

  const handleReset = useCallback(() => {
    const shuffledEvents = [...content.content.events]
      .sort(() => Math.random() - 0.5)
      .map(event => event.id);
    setOrderedEvents(shuffledEvents);
    setSelectedEvent(null);
    setFeedback(null);
    setShowFeedback(false);
  }, [content.content.events]);

  const isCompleted = progress?.status === 'completed';
  const isAllOrdered = orderedEvents.length === content.content.events.length;

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
              {interactionPattern.dragPattern === 'touchDrag' ? (
                <>
                  <li>• Tap on two events to swap their positions</li>
                  <li>• The first event you tap will be highlighted</li>
                  <li>• Tap the second event to complete the swap</li>
                </>
              ) : (
                <>
                  <li>• Drag and drop events to put them in the correct order</li>
                  <li>• Events should follow the story sequence from beginning to end</li>
                </>
              )}
              <li>• Use the numbered indicators to help with ordering</li>
              <li>• All events must be in order to complete the activity</li>
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
        }`}>
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

      {/* Event Ordering */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900">Put the story events in order:</h4>
        
        <div className="space-y-3">
          {orderedEvents.map((eventId, index) => {
            const event = content.content.events.find(e => e.id === eventId);
            if (!event) return null;
            
            const isDragging = draggedEvent === eventId;
            const isDragOver = dragOverIndex === index;
            const isSelected = selectedEvent === eventId;
            const isCorrectPosition = event.order === index + 1;
            
            return (
              <div
                key={eventId}
                draggable={interactionPattern.dragPattern !== 'touchDrag' && !disabled}
                onDragStart={(e) => handleDragStart(e, eventId)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => handleTapToSwap(eventId)}
                className={`
                  relative p-4 border-2 rounded-lg transition-all duration-200 focus-ring
                  ${interactionPattern.dragPattern === 'touchDrag' ? 'cursor-pointer' : 'cursor-move'}
                  ${isDragging 
                    ? 'opacity-50 border-blue-400 bg-blue-50' 
                    : isDragOver 
                      ? 'border-blue-300 bg-blue-50' 
                      : isSelected
                        ? 'border-blue-500 bg-blue-100'
                        : isCorrectPosition
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={`Event ${index + 1}: ${event.text}. ${interactionPattern.dragPattern === 'touchDrag' ? 'Tap to select for swapping.' : 'Drag to reorder.'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTapToSwap(eventId);
                  }
                }}
              >
                {/* Order Number */}
                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  isCorrectPosition 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 text-white'
                }`}>
                  {index + 1}
                </div>

                {/* Drag Handle */}
                {interactionPattern.dragPattern !== 'touchDrag' && (
                  <div className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path>
                    </svg>
                  </div>
                )}

                {/* Selection Indicator for Mobile */}
                {interactionPattern.dragPattern === 'touchDrag' && isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                )}

                {/* Event Content */}
                <div className={`${interactionPattern.dragPattern === 'touchDrag' && isSelected ? 'mr-8' : 'mr-8'} ml-8`}>
                  <p className="text-gray-800 leading-relaxed">{event.text}</p>
                </div>

                {/* Jump to Context Button */}
                {onJumpToContext && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToContext(`event-${eventId}`);
                    }}
                    className="mt-3 ml-8 inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors focus-ring"
                    aria-label={`Jump to context for event ${index + 1}`}
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                    Find in story
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={handleReset}
          disabled={disabled}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors focus-ring font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Reset event order"
        >
          <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Reset Order
        </button>
        
        <div className="flex items-center space-x-3">
          {isAllOrdered && !isCompleted && (
            <div className="flex items-center text-green-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-sm font-medium">All events ordered</span>
            </div>
          )}
          
          {!isCompleted && (
            <button
              onClick={handleComplete}
              disabled={!isAllOrdered || disabled}
              className={`
                px-6 py-2 rounded-lg font-medium transition-colors focus-ring
                ${isAllOrdered && !disabled
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
              aria-label="Complete activity"
            >
              Complete Activity
            </button>
          )}
        </div>
      </div>

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

export default SequenceActivityEnhanced;
