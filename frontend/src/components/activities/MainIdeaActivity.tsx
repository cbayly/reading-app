import React, { useState, useEffect } from 'react';

export interface MainIdeaActivityProps {
  activity: {
    id: string;
    prompt: string;
    answer?: string;
    hints?: string[];
    themes?: string[];
  };
  onComplete: (activityId: string, answer: string) => void;
  onJumpToContext?: (anchorId: string) => void;
  className?: string;
}

const MainIdeaActivity: React.FC<MainIdeaActivityProps> = ({
  activity,
  onComplete,
  onJumpToContext,
  className = ''
}) => {
  const [answer, setAnswer] = useState(activity.answer || '');
  const [showHints, setShowHints] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showValidation, setShowValidation] = useState(false);

  // Sample hints if none provided
  const hints = activity.hints || [
    'Think about what the story is really about',
    'Look for repeated ideas or messages',
    'Consider what the author wants readers to learn',
    'Focus on the deeper meaning, not just what happened'
  ];

  // Sample themes if none provided
  const themes = activity.themes || [
    'Friendship and loyalty',
    'Courage and bravery',
    'Discovery and adventure',
    'Family and love',
    'Overcoming challenges',
    'Learning and growth'
  ];

  // Validate answer
  useEffect(() => {
    const trimmedAnswer = answer.trim();
    const words = trimmedAnswer.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    
    // Require at least 5 words for a valid main idea
    setIsValid(trimmedAnswer.length >= 15 && words.length >= 5);
  }, [answer]);

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswer(e.target.value);
    setShowValidation(false);
  };

  const handleComplete = () => {
    if (isValid) {
      onComplete(activity.id, answer.trim());
    } else {
      setShowValidation(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleComplete();
    }
  };

  const handleThemeClick = (theme: string) => {
    setAnswer(prev => {
      const current = prev.trim();
      if (current === '') {
        return theme;
      } else if (current.includes(theme)) {
        return current;
      } else {
        return current + '. ' + theme;
      }
    });
  };

  const isCompleted = activity.answer && activity.answer.trim().length > 0;

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
              <li>• Think about the main message or lesson of the story</li>
              <li>• Consider what the author wants readers to understand</li>
              <li>• Write at least 5 words (minimum 15 characters)</li>
              <li>• Use Ctrl/Cmd + Enter to complete</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Idea Input */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900">What is the main idea or theme of the story?</h4>
        
        <div className="space-y-2">
          <textarea
            value={answer}
            onChange={handleAnswerChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe the main message, lesson, or theme of the story..."
            className={`
              w-full p-4 border-2 rounded-lg resize-none focus-ring transition-colors
              ${isValid 
                ? 'border-green-300 bg-green-50' 
                : showValidation 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }
            `}
            rows={4}
            aria-label="Main idea description"
            aria-describedby="word-count"
          />
          
          {/* Word Count and Validation */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span 
                id="word-count"
                className={`font-medium ${
                  isValid ? 'text-green-600' : showValidation ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {wordCount} word{wordCount !== 1 ? 's' : ''}
              </span>
              <span className={`font-medium ${
                answer.length >= 15 ? 'text-green-600' : showValidation ? 'text-red-600' : 'text-gray-500'
              }`}>
                {answer.length} characters
              </span>
            </div>
            
            {showValidation && !isValid && (
              <div className="text-red-600 text-sm font-medium">
                Please write at least 5 words (15+ characters)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme Suggestions */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-purple-900">Common story themes:</h4>
          <button
            onClick={() => setShowThemes(!showThemes)}
            className="text-sm text-purple-700 hover:text-purple-800 focus-ring"
            aria-expanded={showThemes}
            aria-controls="themes-content"
          >
            {showThemes ? 'Hide themes' : 'Show themes'}
          </button>
        </div>
        
        {showThemes && (
          <div id="themes-content" className="space-y-2">
            <p className="text-sm text-purple-800 mb-3">Click on a theme to add it to your answer:</p>
            <div className="flex flex-wrap gap-2">
              {themes.map((theme, index) => (
                <button
                  key={index}
                  onClick={() => handleThemeClick(theme)}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm hover:bg-purple-200 focus-ring transition-colors"
                  aria-label={`Add theme: ${theme}`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hints Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-yellow-900">Need help?</h4>
          <button
            onClick={() => setShowHints(!showHints)}
            className="text-sm text-yellow-700 hover:text-yellow-800 focus-ring"
            aria-expanded={showHints}
            aria-controls="hints-content"
          >
            {showHints ? 'Hide hints' : 'Show hints'}
          </button>
        </div>
        
        {showHints && (
          <div id="hints-content" className="space-y-2">
            {hints.map((hint, index) => (
              <div key={index} className="flex items-start">
                <span className="text-yellow-600 mr-2 mt-1">•</span>
                <span className="text-sm text-yellow-800">{hint}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Jump to Context */}
      {onJumpToContext && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Find theme clues in the story</h4>
              <p className="text-sm text-gray-600">Click the button to jump to relevant parts of the story</p>
            </div>
            <button
              onClick={() => onJumpToContext('chapter-1-para-3')}
              className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus-ring"
              aria-label="Jump to story context for theme analysis"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
              Find in Story
            </button>
          </div>
        </div>
      )}

      {/* Completion Button */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center space-x-2">
          {isValid && (
            <div className="flex items-center text-green-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-sm font-medium">Ready to complete</span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleComplete}
          disabled={!isValid}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors focus-ring
            ${isValid 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
          aria-label="Complete activity"
        >
          Complete Activity
        </button>
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

export default MainIdeaActivity;
