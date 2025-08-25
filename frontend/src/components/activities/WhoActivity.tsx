import React, { useState, useEffect } from 'react';

export interface Character {
  id: string;
  name: string;
  description: string;
  matched?: boolean;
}

export interface WhoActivityProps {
  activity: {
    id: string;
    prompt: string;
    characters?: Character[];
    answer?: string[];
  };
  onComplete: (activityId: string, answer: string[]) => void;
  onJumpToContext?: (anchorId: string) => void;
  className?: string;
}

const WhoActivity: React.FC<WhoActivityProps> = ({
  activity,
  onComplete,
  onJumpToContext,
  className = ''
}) => {
  const [characters, setCharacters] = useState<Character[]>(activity.characters || []);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(activity.answer || []);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Use story-specific characters if provided, otherwise show loading state
  useEffect(() => {
    if (activity.characters && activity.characters.length > 0) {
      setCharacters(activity.characters);
    } else {
      // Show loading state instead of placeholder characters
      setCharacters([]);
    }
  }, [activity.characters]);

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacters(prev => {
      const isSelected = prev.includes(characterId);
      if (isSelected) {
        return prev.filter(id => id !== characterId);
      } else {
        return [...prev, characterId];
      }
    });
  };

  const handleDragStart = (e: React.DragEvent, characterId: string) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', characterId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setIsDragging(false);
    setDragOverId(null);
    
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== targetId) {
      // Reorder characters
      setCharacters(prev => {
        const draggedIndex = prev.findIndex(c => c.id === draggedId);
        const targetIndex = prev.findIndex(c => c.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return prev;
        
        const newCharacters = [...prev];
        const [draggedCharacter] = newCharacters.splice(draggedIndex, 1);
        newCharacters.splice(targetIndex, 0, draggedCharacter);
        
        return newCharacters;
      });
    }
  };

  const handleDragEnter = (characterId: string) => {
    setDragOverId(characterId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverId(null);
  };

  const handleComplete = () => {
    onComplete(activity.id, selectedCharacters);
  };

  const isCompleted = selectedCharacters.length > 0;

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
              <li>• Click on character names to select them</li>
              <li>• Drag and drop characters to reorder them</li>
              <li>• Select all the characters that appear in the story</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Character Selection */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900">Select the characters from the story:</h4>
        
        {characters.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-full">
              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Loading story characters...
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {characters.map((character, index) => {
            const isSelected = selectedCharacters.includes(character.id);
            const isDragOver = dragOverId === character.id;
            
            return (
              <div
                key={character.id}
                draggable
                onDragStart={(e) => handleDragStart(e, character.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, character.id)}
                onDragEnter={() => handleDragEnter(character.id)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                className={`
                  relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 focus-ring
                  ${isSelected 
                    ? 'border-green-500 bg-green-50 shadow-sm' 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }
                  ${isDragOver ? 'border-blue-400 bg-blue-50' : ''}
                  ${isDragging ? 'opacity-75' : ''}
                `}
                onClick={() => handleCharacterSelect(character.id)}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${character.name} - ${character.description}${isSelected ? ' (selected)' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCharacterSelect(character.id);
                  }
                }}
              >
                {/* Drag Handle */}
                <div className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path>
                  </svg>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 left-2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                )}

                {/* Character Content */}
                <div className={`${isSelected ? 'ml-8' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-lg font-semibold text-gray-900">{character.name}</h5>
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                  </div>
                  <p className="text-gray-600">{character.description}</p>
                </div>

                {/* Jump to Context Button */}
                {onJumpToContext && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToContext(`chapter-1-para-${index + 1}`);
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
        )}
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
            <button
              onClick={handleComplete}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus-ring transition-colors font-medium"
              aria-label="Complete activity"
            >
              Complete Activity
            </button>
          </div>
        </div>
      )}

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

export default WhoActivity;
