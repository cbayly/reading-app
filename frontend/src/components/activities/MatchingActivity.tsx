import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Activity } from '@/types/weekly-plan';

interface MatchingActivityProps {
  activity: Activity;
  onUpdate: (responses: any) => void;
  isReadOnly?: boolean;
}

interface MatchingPair {
  id: string;
  word: string;
  definition: string;
  isMatched: boolean;
  matchedWith?: string;
}

interface WordItem {
  id: string;
  word: string;
  pairId: string;
  isMatched: boolean;
  matchedWith?: string;
}

interface DefinitionItem {
  id: string;
  definition: string;
  pairId: string;
  isMatched: boolean;
  matchedWith?: string;
}

export default function MatchingActivity({ activity, onUpdate, isReadOnly = false }: MatchingActivityProps) {
  const [words, setWords] = useState<WordItem[]>([]);
  const [definitions, setDefinitions] = useState<DefinitionItem[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hasNotifiedCompletion, setHasNotifiedCompletion] = useState(false);

  // Initialize words and definitions from activity data
  useEffect(() => {
    if (activity.data?.pairs) {
      const initialWords: WordItem[] = activity.data.pairs.map((pair: any, index: number) => {
        // Handle both vocabulary matching (word/definition) and comprehension matching (prompt/answer)
        const isVocabularyMatching = pair.word && pair.definition;
        const isComprehensionMatching = pair.prompt && pair.answer;
        
        if (isVocabularyMatching) {
          return {
            id: `word-${index}`,
            word: pair.word,
            pairId: `pair-${index}`,
            isMatched: false
          };
        } else if (isComprehensionMatching) {
          return {
            id: `word-${index}`,
            word: pair.prompt,
            pairId: `pair-${index}`,
            isMatched: false
          };
        }
        return null;
      }).filter((item): item is WordItem => item !== null);

      const initialDefinitions: DefinitionItem[] = activity.data.pairs.map((pair: any, index: number) => {
        const isVocabularyMatching = pair.word && pair.definition;
        const isComprehensionMatching = pair.prompt && pair.answer;
        
        if (isVocabularyMatching) {
          return {
            id: `def-${index}`,
            definition: pair.definition,
            pairId: `pair-${index}`,
            isMatched: false
          };
        } else if (isComprehensionMatching) {
          return {
            id: `def-${index}`,
            definition: pair.answer,
            pairId: `pair-${index}`,
            isMatched: false
          };
        }
        return null;
      }).filter((item): item is DefinitionItem => item !== null);

      setWords(initialWords);
      
      // Shuffle definitions
      const shuffledDefinitions = [...initialDefinitions].sort(() => Math.random() - 0.5);
      setDefinitions(shuffledDefinitions);
    }
  }, [activity.data]);

  // Check if all pairs are matched
  useEffect(() => {
    const allMatched = words.every(word => word.isMatched);
    setIsComplete(allMatched && words.length > 0);
  }, [words]);

  // Memoize the response to prevent infinite loops
  const completionResponse = useMemo(() => {
    if (!isComplete) return null;
    
    return {
      completed: true,
      matches: words.map(word => {
        const definition = definitions.find(d => d.pairId === word.pairId);
        return {
          word: word.word,
          definition: definition?.definition || '',
          isCorrect: word.isMatched
        };
      })
    };
  }, [isComplete, words, definitions]);

  // Handle word selection
  const handleWordClick = (wordId: string) => {
    if (isReadOnly) return;
    
    if (selectedWord === wordId) {
      setSelectedWord(null);
    } else {
      setSelectedWord(wordId);
      setSelectedDefinition(null);
    }
  };

  // Handle definition selection
  const handleDefinitionClick = (definitionId: string) => {
    if (isReadOnly) return;
    
    if (selectedDefinition === definitionId) {
      setSelectedDefinition(null);
    } else {
      setSelectedDefinition(definitionId);
    }
  };

  // Handle matching
  useEffect(() => {
    if (selectedWord && selectedDefinition) {
      const wordItem = words.find(w => w.id === selectedWord);
      const definitionItem = definitions.find(d => d.id === selectedDefinition);
      
      console.log('Matching attempt:', {
        selectedWord,
        selectedDefinition,
        wordItem,
        definitionItem
      });
      
      if (wordItem && definitionItem) {
        // Check if this is a correct match - they should have the same pairId
        const isCorrect = wordItem.pairId === definitionItem.pairId;
        
        console.log('Match result:', { 
          isCorrect, 
          wordPairId: wordItem.pairId,
          definitionPairId: definitionItem.pairId
        });
        
        if (isCorrect) {
          // Mark both as matched
          setWords(prev => prev.map(w => 
            w.id === selectedWord
              ? { ...w, isMatched: true, matchedWith: selectedDefinition }
              : w
          ));
          
          setDefinitions(prev => prev.map(d => 
            d.id === selectedDefinition
              ? { ...d, isMatched: true, matchedWith: selectedWord }
              : d
          ));
        }
        
        // Clear selections
        setSelectedWord(null);
        setSelectedDefinition(null);
      }
    }
  }, [selectedWord, selectedDefinition, words, definitions]);

  const getWordStatus = (wordId: string) => {
    const word = words.find(w => w.id === wordId);
    if (!word) return 'default';
    
    if (word.isMatched) return 'matched';
    if (selectedWord === wordId) return 'selected';
    return 'default';
  };

  const getDefinitionStatus = (definitionId: string) => {
    const definition = definitions.find(d => d.id === definitionId);
    if (!definition) return 'default';
    
    if (definition.isMatched) return 'matched';
    if (selectedDefinition === definitionId) return 'selected';
    return 'default';
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'matched':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'selected':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50';
    }
  };

  // Update parent component when complete - only once
  useEffect(() => {
    if (isComplete && completionResponse && !hasNotifiedCompletion) {
      onUpdate(completionResponse);
      setHasNotifiedCompletion(true);
    }
  }, [isComplete, completionResponse, hasNotifiedCompletion, onUpdate]);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How to Play</h4>
        <p className="text-sm text-blue-800">
          {isReadOnly 
            ? "This activity has been completed. You can review the matches below."
            : "Click on a word, then click on its matching definition. Correct matches will turn green and stay matched. Match all pairs to complete the activity!"
          }
        </p>
        {isReadOnly && (
          <div className="mt-2 p-2 bg-blue-100 rounded border border-blue-200">
            <div className="flex items-center text-blue-800">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Read-only mode - Activity completed</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Matched: {words.filter(w => w.isMatched).length} of {words.length}
        </span>
        {isComplete && (
          <span className="text-sm font-medium text-green-600">
            ✅ All matches complete!
          </span>
        )}
      </div>

      {/* Matching Game */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Words Column */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Words</h4>
          <div className="space-y-2">
            {words.map((word) => (
              <button
                key={word.id}
                onClick={() => handleWordClick(word.id)}
                disabled={word.isMatched || isReadOnly}
                className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${getStatusClasses(getWordStatus(word.id))} ${
                  word.isMatched || isReadOnly ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                {word.word}
              </button>
            ))}
          </div>
        </div>

        {/* Definitions Column */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Definitions</h4>
          <div className="space-y-2">
            {definitions.map((def) => (
              <button
                key={def.id}
                onClick={() => handleDefinitionClick(def.id)}
                disabled={def.isMatched || isReadOnly}
                className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${getStatusClasses(getDefinitionStatus(def.id))} ${
                  def.isMatched || isReadOnly ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                {def.definition}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
