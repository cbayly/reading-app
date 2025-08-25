import React, { useState, useEffect, useCallback } from 'react';
import { useDeviceDetector, getOptimalInteractionPattern } from './shared/DeviceDetector';
import { 
  EnhancedActivityProps, 
  EnhancedWhoContent, 
  EnhancedCharacter, 
  ActivityResponse,
  ActivityFeedback 
} from '../../types/enhancedActivities';

interface WhoActivityEnhancedProps extends EnhancedActivityProps {
  content: { type: 'who'; content: EnhancedWhoContent };
}

const WhoActivityEnhanced: React.FC<WhoActivityEnhancedProps> = ({
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
  
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  // Initialize from progress if available
  useEffect(() => {
    if (progress?.responses && progress.responses.length > 0) {
      const lastResponse = progress.responses[progress.responses.length - 1];
      if (lastResponse.answer && Array.isArray(lastResponse.answer)) {
        setSelectedCharacters(lastResponse.answer);
      }
      
      // Set feedback if activity is completed
      if (progress.status === 'completed' && lastResponse.feedback) {
        const finalFeedback: ActivityFeedback = {
          isCorrect: lastResponse.isCorrect || false,
          score: lastResponse.score || 0,
          feedback: lastResponse.feedback,
          suggestions: lastResponse.isCorrect ? undefined : [
            'Read the story carefully to identify all characters.',
            'Look for character names that are mentioned multiple times.',
            'Pay attention to character descriptions and actions.'
          ],
          nextSteps: lastResponse.isCorrect ? [
            'Great job! You can now move on to the next activity.',
            'Try to remember these characters for the other activities.'
          ] : [
            'Review the story to find the characters you missed.',
            'Make sure you only select characters that are actually mentioned in the story.'
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
      onProgressUpdate?.('who', 'in_progress');
    }
  }, [progress, onProgressUpdate]);

  const allCharacters = [...content.content.realCharacters, ...content.content.decoyCharacters];

  const handleCharacterSelect = useCallback((characterId: string) => {
    if (disabled) return;

    setSelectedCharacters(prev => {
      const isSelected = prev.includes(characterId);
      const newSelection = isSelected 
        ? prev.filter(id => id !== characterId)
        : [...prev, characterId];
      
      // Provide immediate feedback for each selection
      const character = allCharacters.find(c => c.name === characterId);
      if (character) {
        const isCorrect = character.isReal;
        const feedback: ActivityFeedback = {
          isCorrect,
          score: isCorrect ? 100 : 0,
          feedback: isCorrect 
            ? `Great! ${character.name} is a character from the story.`
            : `${character.name} is not a character from the story.`,
          suggestions: isCorrect ? undefined : ['Try looking for characters that are mentioned in the story.'],
          nextSteps: isCorrect ? ['Keep selecting other characters from the story.'] : ['Deselect this character and try again.']
        };
        setFeedback(feedback);
        setShowFeedback(true);
        
        // Hide feedback after 3 seconds
        setTimeout(() => setShowFeedback(false), 3000);
      }
      
      return newSelection;
    });
  }, [disabled, allCharacters]);

  const handleDragStart = (e: React.DragEvent, characterId: string) => {
    if (interactionPattern.dragPattern === 'touchDrag') return; // Disable drag on touch-only devices
    
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', characterId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (interactionPattern.dragPattern === 'touchDrag') return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (interactionPattern.dragPattern === 'touchDrag') return;
    
    e.preventDefault();
    setIsDragging(false);
    setDragOverId(null);
    
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== targetId) {
      // Reorder characters (this is optional for the who activity)
      // For now, we'll just handle the drop without reordering
    }
  };

  const handleDragEnter = (characterId: string) => {
    if (interactionPattern.dragPattern === 'touchDrag') return;
    setDragOverId(characterId);
  };

  const handleDragLeave = () => {
    if (interactionPattern.dragPattern === 'touchDrag') return;
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    if (interactionPattern.dragPattern === 'touchDrag') return;
    setIsDragging(false);
    setDragOverId(null);
  };

  const handleComplete = useCallback(() => {
    if (disabled) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const correctAnswers = selectedCharacters.filter(id => {
      const character = allCharacters.find(c => c.name === id);
      return character?.isReal;
    });
    
    const incorrectAnswers = selectedCharacters.filter(id => {
      const character = allCharacters.find(c => c.name === id);
      return !character?.isReal;
    });
    
    const missedRealCharacters = content.content.realCharacters.filter(
      char => !selectedCharacters.includes(char.name)
    );

    const score = Math.max(0, Math.round(
      ((correctAnswers.length - incorrectAnswers.length) / content.content.realCharacters.length) * 100
    ));

    const isCorrect = incorrectAnswers.length === 0 && missedRealCharacters.length === 0;
    
    const finalFeedback: ActivityFeedback = {
      isCorrect,
      score,
      feedback: isCorrect 
        ? 'Excellent! You correctly identified all the characters from the story.'
        : `You found ${correctAnswers.length} out of ${content.content.realCharacters.length} characters. ${
            incorrectAnswers.length > 0 
              ? `You selected ${incorrectAnswers.length} character(s) that weren't in the story. ` 
              : ''
          }${
            missedRealCharacters.length > 0 
              ? `You missed ${missedRealCharacters.length} character(s) from the story.` 
              : ''
          }`,
      suggestions: !isCorrect ? [
        'Read the story carefully to identify all characters.',
        'Look for character names that are mentioned multiple times.',
        'Pay attention to character descriptions and actions.'
      ] : undefined,
      nextSteps: isCorrect ? [
        'Great job! You can now move on to the next activity.',
        'Try to remember these characters for the other activities.'
      ] : [
        'Review the story to find the characters you missed.',
        'Make sure you only select characters that are actually mentioned in the story.'
      ]
    };

    setFeedback(finalFeedback);
    setShowFeedback(true);

    // Create responses for detailed tracking
    const responses: ActivityResponse[] = [
      {
        id: `who-response-${Date.now()}`,
        question: content.content.question,
        answer: selectedCharacters,
        isCorrect,
        feedback: finalFeedback.feedback,
        score,
        timeSpent,
        createdAt: new Date()
      }
    ];

    onComplete('who', selectedCharacters, responses);
    onProgressUpdate?.('who', 'completed', timeSpent);
  }, [disabled, selectedCharacters, allCharacters, content, startTime, onComplete, onProgressUpdate]);

  const getCharacterStatus = (character: EnhancedCharacter) => {
    const isSelected = selectedCharacters.includes(character.name);
    const isReal = character.isReal;
    
    if (!isSelected) return 'unselected';
    if (isReal) return 'correct';
    return 'incorrect';
  };

  const getCharacterStatusColor = (status: string) => {
    switch (status) {
      case 'correct':
        return 'border-green-500 bg-green-50 text-green-800';
      case 'incorrect':
        return 'border-red-500 bg-red-50 text-red-800';
      default:
        return 'border-gray-200 bg-white text-gray-900 hover:border-gray-300';
    }
  };

  const isCompleted = progress?.status === 'completed';
  const canComplete = selectedCharacters.length > 0 && !isCompleted;

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
              <li>• {interactionPattern.primaryInteraction === 'tap' ? 'Tap' : 'Click'} on character names to select them</li>
              {interactionPattern.dragPattern !== 'touchDrag' && (
                <li>• Drag and drop characters to reorder them (optional)</li>
              )}
              <li>• Select all the characters that appear in the story</li>
              <li>• You'll get immediate feedback for each selection</li>
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

      {/* Character Selection */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900">
          Select the characters from the story:
        </h4>
        
        <div className="grid gap-3">
          {allCharacters.map((character, index) => {
            const status = getCharacterStatus(character);
            const isSelected = selectedCharacters.includes(character.name);
            const isDragOver = dragOverId === character.name;
            
            return (
              <div
                key={character.name}
                draggable={interactionPattern.dragPattern !== 'touchDrag'}
                onDragStart={(e) => handleDragStart(e, character.name)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, character.name)}
                onDragEnter={() => handleDragEnter(character.name)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                className={`
                  relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 focus-ring
                  ${getCharacterStatusColor(status)}
                  ${isDragOver ? 'border-blue-400 bg-blue-50' : ''}
                  ${isDragging ? 'opacity-75' : ''}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => handleCharacterSelect(character.name)}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-pressed={isSelected}
                aria-label={`${character.name} - ${character.description}${isSelected ? ' (selected)' : ''}${character.isReal ? ' (from story)' : ' (not from story)'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCharacterSelect(character.name);
                  }
                }}
              >
                {/* Drag Handle */}
                {interactionPattern.dragPattern !== 'touchDrag' && (
                  <div className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path>
                    </svg>
                  </div>
                )}

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 left-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      status === 'correct' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {status === 'correct' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        )}
                      </svg>
                    </div>
                  </div>
                )}

                {/* Character Content */}
                <div className={`${isSelected ? 'ml-8' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-lg font-semibold">{character.name}</h5>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        character.isReal 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {character.role}
                      </span>
                      <span className="text-sm text-gray-500">#{index + 1}</span>
                    </div>
                  </div>
                  <p className="text-sm">{character.description}</p>
                </div>

                {/* Jump to Context Button */}
                {onJumpToContext && character.isReal && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToContext(`character-${character.name.toLowerCase().replace(/\s+/g, '-')}`);
                    }}
                    className="mt-3 inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors focus-ring"
                    aria-label={`Jump to context for ${character.name}`}
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

      {/* Selection Summary */}
      {selectedCharacters.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm font-medium text-green-800">
                {selectedCharacters.length} character{selectedCharacters.length !== 1 ? 's' : ''} selected
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

export default WhoActivityEnhanced;
