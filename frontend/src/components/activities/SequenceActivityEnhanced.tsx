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
  studentId?: string;
  planId?: string;
  dayIndex?: number;
}

const SequenceActivityEnhanced: React.FC<SequenceActivityEnhancedProps & { onNext?: () => void }> = ({
  content,
  progress,
  onComplete,
  onProgressUpdate,
  onJumpToContext,
  className = '',
  disabled = false,
  onNext,
  studentId,
  planId,
  dayIndex
}) => {
  const deviceInfo = useDeviceDetector();
  const interactionPattern = getOptimalInteractionPattern(deviceInfo);
  
  const [orderedEvents, setOrderedEvents] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [checks, setChecks] = useState(0);
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
        
        // Show restoration notification if this is a restored session
        if (progress.status === 'in_progress' && lastResponse.answer.length > 0) {
          // Brief notification that progress was restored
          const restorationFeedback: ActivityFeedback = {
            isCorrect: true,
            score: 0,
            feedback: `Welcome back! You had ordered ${lastResponse.answer.length} event(s). Continue where you left off.`,
            suggestions: undefined,
            nextSteps: ['Continue ordering the events in the correct sequence.']
          };
          setFeedback(restorationFeedback);
          setShowFeedback(true);
          setTimeout(() => setShowFeedback(false), 4000); // Show for 4 seconds
        }
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
    
    // Update progress when student reorders events (intermediate step)
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onProgressUpdate?.('sequence', 'in_progress', timeSpent);
  }, [startTime, onProgressUpdate]);

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
        
        // Update progress when student swaps events (intermediate step)
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        onProgressUpdate?.('sequence', 'in_progress', timeSpent);
      }
      
      setSelectedEvent(null);
    }
  }, [selectedEvent, orderedEvents, disabled, interactionPattern.dragPattern, startTime, onProgressUpdate]);

  const handleCheck = useCallback(() => {
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
      feedback: isCorrect ? 'Correct' : 'Incorrect'
    };

    setFeedback(finalFeedback);
    setShowFeedback(true);
    setChecks((c) => c + (isCorrect ? 0 : 1));

    // Persist progress state
    onProgressUpdate?.('sequence', 'in_progress', timeSpent);

    if (isCorrect) {
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
      // small delay so students see the state, then allow Next via button label swap
    }
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

  const isCompleted = progress?.status === 'completed' || (feedback?.isCorrect ?? false);
  const isAllOrdered = orderedEvents.length === content.content.events.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Question header only */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          What happened in this chapter?
        </h3>
      </div>

      {/* Blue instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">Reorder the events below in the order they appear in the story.</p>
      </div>

      {/* Immediate Feedback removed per simplified flow */}

      {/* Event Ordering */}
      <div className="space-y-3">
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
                  relative p-4 border rounded-lg transition-all duration-200 focus-ring
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
                <div className={`${interactionPattern.dragPattern === 'touchDrag' && isSelected ? 'mr-8' : 'mr-8'}`}>
                  <p className="text-gray-800 leading-relaxed text-sm">{event.text}</p>
                </div>

                {/* Jump to Context Button - hidden until 3rd failed attempt */}
                {onJumpToContext && checks >= 3 && !isCompleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToContext(`event-${eventId}`);
                    }}
                    className="mt-3 inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors focus-ring"
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

      {/* Action Buttons: Check / Next like Who/Where */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-sm text-gray-700">
          {feedback && feedback.isCorrect && (
            <span className="font-semibold text-green-700">Correct</span>
          )}
          {feedback && !feedback.isCorrect && (
            <span className="font-semibold text-red-700">Incorrect</span>
          )}
        </div>
        {(() => {
          const isDisabled = !isAllOrdered && !(feedback && feedback.isCorrect);
          const showNext = !!(feedback && feedback.isCorrect);
          return (
            <button
              onClick={showNext ? onNext : handleCheck}
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

      {/* Final feedback pill removed per request */}
    </div>
  );
};

export default SequenceActivityEnhanced;
