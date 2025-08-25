import React, { useState, useEffect } from 'react';

export interface Event {
  id: string;
  text: string;
  order?: number;
}

export interface SequenceActivityProps {
  activity: {
    id: string;
    prompt: string;
    events?: Event[];
    answer?: string[];
  };
  onComplete: (activityId: string, answer: string[]) => void;
  onJumpToContext?: (anchorId: string) => void;
  className?: string;
}

const SequenceActivity: React.FC<SequenceActivityProps> = ({
  activity,
  onComplete,
  onJumpToContext,
  className = ''
}) => {
  const [events, setEvents] = useState<Event[]>(activity.events || []);
  const [orderedEvents, setOrderedEvents] = useState<string[]>(activity.answer || []);
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Sample events if none provided
  useEffect(() => {
    if (!activity.events || activity.events.length === 0) {
      setEvents([
        { id: 'event1', text: 'Emma discovers a mysterious map in her grandmother\'s attic' },
        { id: 'event2', text: 'Emma and Max set out on their adventure to find the treasure' },
        { id: 'event3', text: 'They encounter a wise old professor who helps them' },
        { id: 'event4', text: 'Emma solves the final puzzle and finds the hidden treasure' },
        { id: 'event5', text: 'Emma returns home with her new friends and the treasure' }
      ]);
    }
  }, [activity.events]);

  // Initialize ordered events if not provided
  useEffect(() => {
    if (!activity.answer || activity.answer.length === 0) {
      setOrderedEvents(events.map(event => event.id));
    }
  }, [events, activity.answer]);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    setDraggedEvent(eventId);
    e.dataTransfer.setData('text/plain', eventId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    
    if (draggedId) {
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
    }
    
    setDraggedEvent(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverIndex(null);
  };

  const handleComplete = () => {
    if (orderedEvents.length === events.length) {
      onComplete(activity.id, orderedEvents);
    } else {
      setShowValidation(true);
    }
  };

  const handleReset = () => {
    setOrderedEvents(events.map(event => event.id));
    setShowValidation(false);
  };

  const isCompleted = activity.answer && activity.answer.length === events.length;
  const isAllOrdered = orderedEvents.length === events.length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">How to complete this activity:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Drag and drop events to put them in the correct order</li>
              <li>• Events should follow the story sequence from beginning to end</li>
              <li>• Use the numbered indicators to help with ordering</li>
              <li>• All events must be in order to complete the activity</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Event Ordering */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900">Put the story events in order:</h4>
        
        <div className="space-y-3">
          {orderedEvents.map((eventId, index) => {
            const event = events.find(e => e.id === eventId);
            if (!event) return null;
            
            const isDragging = draggedEvent === eventId;
            const isDragOver = dragOverIndex === index;
            
            return (
              <div
                key={eventId}
                draggable
                onDragStart={(e) => handleDragStart(e, eventId)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative p-4 border-2 rounded-lg cursor-move transition-all duration-200 focus-ring
                  ${isDragging 
                    ? 'opacity-50 border-blue-400 bg-blue-50' 
                    : isDragOver 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }
                `}
                role="button"
                tabIndex={0}
                aria-label={`Event ${index + 1}: ${event.text}. Drag to reorder.`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Focus management for keyboard users
                  }
                }}
              >
                {/* Order Number */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>

                {/* Drag Handle */}
                <div className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path>
                  </svg>
                </div>

                {/* Event Content */}
                <div className="ml-8 mr-8">
                  <p className="text-gray-800 leading-relaxed">{event.text}</p>
                </div>

                {/* Jump to Context Button */}
                {onJumpToContext && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToContext(`chapter-1-para-${index + 1}`);
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

        {/* Validation Message */}
        {showValidation && !isAllOrdered && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm font-medium text-red-800">
                Please order all events before completing the activity
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors focus-ring font-medium"
          aria-label="Reset event order"
        >
          <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Reset Order
        </button>
        
        <div className="flex items-center space-x-3">
          {isAllOrdered && (
            <div className="flex items-center text-green-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-sm font-medium">All events ordered</span>
            </div>
          )}
          
          <button
            onClick={handleComplete}
            disabled={!isAllOrdered}
            className={`
              px-6 py-2 rounded-lg font-medium transition-colors focus-ring
              ${isAllOrdered 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
            aria-label="Complete activity"
          >
            Complete Activity
          </button>
        </div>
      </div>

      {/* Completion Status */}
      {isCompleted && (
        <div className="text-center py-4">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Activity completed!
          </div>
        </div>
      )}
    </div>
  );
};

export default SequenceActivity;
