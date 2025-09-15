import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDeviceDetector, getOptimalInteractionPattern } from './shared/DeviceDetector';
import {
  EnhancedActivityProps,
  EnhancedVocabularyContent,
  EnhancedVocabularyWord,
  ActivityResponse
} from '../../types/enhancedActivities';

interface VocabularyActivityEnhancedProps extends EnhancedActivityProps {
  content: { type: 'vocabulary'; content: EnhancedVocabularyContent };
}

type WordBankItem = {
  id: string;
  word: string;
  isReal: boolean;
};

type DefinitionBankItem = {
  id: string;
  definition: string;
  word: string; // canonical word this definition belongs to
  isReal: boolean;
};

const VocabularyActivityEnhanced: React.FC<VocabularyActivityEnhancedProps> = ({
  content,
  progress,
  onComplete,
  onProgressUpdate,
  onJumpToContext,
  className = '',
  disabled = false
}) => {
  // Debug: Log what we're receiving
  console.log('📚 Vocabulary activity received:', {
    content,
    hasContent: !!content?.content,
    realWords: content?.content?.realWords,
    decoyWords: content?.content?.decoyWords,
    question: content?.content?.question,
    instructions: content?.content?.instructions
  });
  const deviceInfo = useDeviceDetector();
  const interactionPattern = getOptimalInteractionPattern(deviceInfo);

  const [wordBank, setWordBank] = useState<WordBankItem[]>([]);
  const [definitionBank, setDefinitionBank] = useState<DefinitionBankItem[]>([]);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // wordId -> defId
  const [matchedWordIds, setMatchedWordIds] = useState<Set<string>>(new Set());
  const [matchedDefIds, setMatchedDefIds] = useState<Set<string>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(Date.now());

  const allWords: EnhancedVocabularyWord[] = useMemo(
    () => {
      // Add defensive programming to handle missing content
      if (!content?.content?.realWords || !content?.content?.decoyWords) {
        console.warn('⚠️ Vocabulary activity missing content:', {
          hasContent: !!content?.content,
          realWords: content?.content?.realWords,
          decoyWords: content?.content?.decoyWords
        });
        return [];
      }
      return [...content.content.realWords, ...content.content.decoyWords];
    },
    [content.content.realWords, content.content.decoyWords]
  );

  // Initialize banks and restore progress
  useEffect(() => {
    // Ensure we have exactly 6 words/definitions
    let wordsToUse = [...allWords];
    
    // If we have fewer than 6, duplicate some words to reach 6
    while (wordsToUse.length < 6) {
      wordsToUse = [...wordsToUse, ...allWords.slice(0, Math.min(6 - wordsToUse.length, allWords.length))];
    }
    
    // If we have more than 6, take only the first 6
    wordsToUse = wordsToUse.slice(0, 6);
    
    const words: WordBankItem[] = wordsToUse.map((w, idx) => ({
      id: `w-${idx}`,
      word: w.word,
      isReal: w.isReal
    }));

    // Build definitions from the same 6 words, then shuffle
    const defs: DefinitionBankItem[] = wordsToUse.map((w, idx) => ({
      id: `d-${idx}`,
      definition: w.definition,
      word: w.word,
      isReal: w.isReal
    }));

    const shuffledDefs = [...defs].sort(() => Math.random() - 0.5);
    setWordBank(words);
    setDefinitionBank(shuffledDefs);

    // Restore from progress
    if (progress?.responses && progress.responses.length > 0) {
      const lastResponse = progress.responses[progress.responses.length - 1];
      if (lastResponse.answer && Array.isArray(lastResponse.answer)) {
        // answer is array of { word: string, definition: string, isCorrect: boolean }
        const restoredMatches: Record<string, string> = {};
        const wordIds = new Map<string, string>();
        const defIds = new Map<string, string>();
        words.forEach(w => wordIds.set(w.word, w.id));
        shuffledDefs.forEach(d => defIds.set(d.definition, d.id));
        lastResponse.answer.forEach((pair: any) => {
          const wid = wordIds.get(pair.word);
          const did = defIds.get(pair.definition);
          if (wid && did) {
            restoredMatches[wid] = did;
          }
        });
        setMatches(restoredMatches);
        setMatchedWordIds(new Set(Object.keys(restoredMatches)));
        setMatchedDefIds(new Set(Object.values(restoredMatches)));
        
        // Show restoration notification if this is a restored session
        if (progress.status === 'in_progress' && Object.keys(restoredMatches).length > 0) {
          // Progress restored - no need for complex feedback
        }
      }
    }
  }, [allWords, progress]);

  // Update progress when activity starts
  useEffect(() => {
    if (!progress || progress.status === 'not_started') {
      onProgressUpdate?.('vocabulary', 'in_progress');
    }
  }, [progress, onProgressUpdate]);

  const isAllMatched = matchedWordIds.size === 6;

  const handleWordSelect = useCallback((wordId: string) => {
    if (disabled || matchedWordIds.has(wordId)) return;
    
    setSelectedWordId(wordId);
    
    // Update progress when student selects a word (intermediate step)
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onProgressUpdate?.('vocabulary', 'in_progress', timeSpent);
  }, [disabled, matchedWordIds, startTime, onProgressUpdate]);

  const handleDefinitionSelect = useCallback((defId: string) => {
    if (disabled || matchedDefIds.has(defId) || !selectedWordId) return;
    
    // Check if this is a correct match
    const word = wordBank.find(w => w.id === selectedWordId);
    const def = definitionBank.find(d => d.id === defId);
    const isCorrect = Boolean(word && def && word.word === def.word);

    if (isCorrect) {
      // Create the match immediately
      setMatches(prev => ({ ...prev, [selectedWordId]: defId }));
      setMatchedWordIds(prev => new Set([...Array.from(prev), selectedWordId]));
      setMatchedDefIds(prev => new Set([...Array.from(prev), defId]));
      
      // Reset feedback when new matches are made
      setShowFeedback(false);
    }
    
    // Clear selections regardless of correctness
    setSelectedWordId(null);
    
    // Update progress
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    onProgressUpdate?.('vocabulary', 'in_progress', timeSpent);
  }, [selectedWordId, wordBank, definitionBank, disabled, matchedDefIds, startTime, onProgressUpdate]);

  // Drag and drop for desktop: drag word onto a definition
  const onWordDragStart = (e: React.DragEvent, wordId: string) => {
    if (interactionPattern.dragPattern === 'touchDrag' || disabled) return;
    e.dataTransfer.setData('text/plain', wordId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDefinitionDragOver = (e: React.DragEvent) => {
    if (interactionPattern.dragPattern === 'touchDrag' || disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDefinitionDrop = (e: React.DragEvent, defId: string) => {
    if (interactionPattern.dragPattern === 'touchDrag' || disabled) return;
    e.preventDefault();
    const wordId = e.dataTransfer.getData('text/plain');
    if (!wordId) return;
    
    // Check if this definition is already matched
    if (matchedDefIds.has(defId)) return;
    
    // Check if this word is already matched
    if (matchedWordIds.has(wordId)) return;
    
    // Create the match directly
    const word = wordBank.find(w => w.id === wordId);
    const def = definitionBank.find(d => d.id === defId);
    if (word && def) {
      const isCorrect = word.word === def.word;
      
      // Add the match
      setMatches(prev => ({ ...prev, [wordId]: defId }));
      setMatchedWordIds(prev => new Set([...Array.from(prev), wordId]));
      setMatchedDefIds(prev => new Set([...Array.from(prev), defId]));
      
      // Reset feedback when new matches are made
      setShowFeedback(false);
      
      // Clear any selections
      setSelectedWordId(null);
      
      // Update progress
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      onProgressUpdate?.('vocabulary', 'in_progress', timeSpent);
    }
  };

  const handleComplete = useCallback(() => {
    if (disabled) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    // Build detailed answer array
    const answers = wordBank.map(w => {
      const defId = matches[w.id];
      const def = defId ? definitionBank.find(d => d.id === defId) : undefined;
      const isCorrect = !!def && def.word === w.word;
      return { word: w.word, definition: def?.definition || '', isCorrect };
    });

    const total = answers.length;
    const correctCount = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correctCount / Math.max(1, total)) * 100);
    const allCorrect = correctCount === total && total > 0;

    // Increment attempts
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    // Show feedback
    setShowFeedback(true);
    setIsCorrect(allCorrect);

    if (allCorrect) {
      // Mark as completed only when correct
      const responses: ActivityResponse[] = [
        {
          id: `vocabulary-response-${Date.now()}`,
          question: content.content.question,
          answer: answers,
          isCorrect: true,
          feedback: 'Excellent! You matched all vocabulary words correctly.',
          score,
          timeSpent,
          createdAt: new Date()
        }
      ];

      onComplete('vocabulary', answers, responses);
      onProgressUpdate?.('vocabulary', 'completed', timeSpent);
    } else {
      // Update progress for incorrect attempts
      onProgressUpdate?.('vocabulary', 'in_progress', timeSpent);
    }
  }, [disabled, startTime, wordBank, definitionBank, matches, content, onComplete, onProgressUpdate, attempts]);

  const isCompleted = progress?.status === 'completed';

  const handleClearMatch = useCallback((defId: string) => {
    const wordId = Object.entries(matches).find(([_, did]) => did === defId)?.[0];
    if (wordId) {
      setMatches(prev => {
        const newMatches = { ...prev };
        delete newMatches[wordId];
        return newMatches;
      });
      setMatchedWordIds(prev => new Set(Array.from(prev).filter(wid => wid !== wordId)));
      setMatchedDefIds(prev => new Set(Array.from(prev).filter(did => did !== defId)));
      
      // Reset feedback when matches are cleared
      setShowFeedback(false);
    }
  }, [matches]);

  // Don't render if no words are available
  if (allWords.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Vocabulary activity content is not available. Please try refreshing the page or contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Simple header like other activities */}
      <div>
        <h2 className="text-lg font-semibold">{content.content.question}</h2>
      </div>

      {/* Simple blue instruction box like other activities */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">Drag each word into the matching definition.</p>
      </div>

      {/* Word Bank */}
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Word bank</h3>
        <div className="flex flex-wrap gap-2">
          {wordBank.map(w => {
            const matchedDefId = matches[w.id];
            const matchedDef = matchedDefId ? definitionBank.find(d => d.id === matchedDefId) : null;
            const isWordCorrect = matchedDef && matchedDef.word === w.word;
            const showWordFeedback = attempts >= 3 && matchedDefId;
            
            return (
              <div
                key={w.id}
                className={`px-3 py-2 rounded-full text-sm font-medium cursor-grab active:cursor-grabbing ${
                  matchedWordIds.has(w.id) 
                    ? showWordFeedback 
                      ? isWordCorrect 
                        ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                        : 'bg-red-100 text-red-800 border-2 border-red-300'
                      : 'bg-gray-100 text-gray-800 opacity-50 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                draggable={!matchedWordIds.has(w.id) && !disabled && interactionPattern.dragPattern !== 'touchDrag'}
                onDragStart={(e) => onWordDragStart(e, w.id)}
                onClick={() => !matchedWordIds.has(w.id) && handleWordSelect(w.id)}
                role="button"
                tabIndex={disabled || matchedWordIds.has(w.id) ? -1 : 0}
                aria-label={`Word: ${w.word}${matchedWordIds.has(w.id) ? ' (matched)' : ''}`}
              >
                {w.word}
                {showWordFeedback && (
                  <span className="ml-1">
                    {isWordCorrect ? '✅' : '❌'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Definitions in Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {definitionBank.slice(0, Math.ceil(definitionBank.length / 2)).map(d => {
            const matched = matchedDefIds.has(d.id);
            const matchedWord = matched ? wordBank.find(w => matches[w.id] === d.id) : null;
            const isDefCorrect = matchedWord && matchedWord.word === d.word;
            const showDefFeedback = attempts >= 3 && matched;
            
            return (
              <div
                key={d.id}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  matched 
                    ? showDefFeedback 
                      ? isDefCorrect 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onDragOver={onDefinitionDragOver}
                onDrop={(e) => onDefinitionDrop(e, d.id)}
                onClick={() => !matched && handleDefinitionSelect(d.id)}
                role="button"
                tabIndex={disabled || matched ? -1 : 0}
                aria-label={`Definition: ${d.definition}${matched ? ' (matched)' : ''}`}
              >
                <p className="text-sm text-gray-800 mb-3">{d.definition}</p>
                
                {matched && matchedWord ? (
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      showDefFeedback 
                        ? isDefCorrect 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {matchedWord.word}
                      {showDefFeedback && (
                        <span className="ml-1">
                          {isDefCorrect ? '✅' : '❌'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearMatch(d.id);
                      }}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-gray-200 transition-colors"
                      aria-label="Clear match"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm italic">
                    Drag a word here
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {definitionBank.slice(Math.ceil(definitionBank.length / 2)).map(d => {
            const matched = matchedDefIds.has(d.id);
            const matchedWord = matched ? wordBank.find(w => matches[w.id] === d.id) : null;
            const isDefCorrect = matchedWord && matchedWord.word === d.word;
            const showDefFeedback = attempts >= 3 && matched;
            
            return (
              <div
                key={d.id}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  matched 
                    ? showDefFeedback 
                      ? isDefCorrect 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-red-500 bg-red-50'
                      : 'border-gray-300 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onDragOver={onDefinitionDragOver}
                onDrop={(e) => onDefinitionDrop(e, d.id)}
                onClick={() => !matched && handleDefinitionSelect(d.id)}
                role="button"
                tabIndex={disabled || matched ? -1 : 0}
                aria-label={`Definition: ${d.definition}${matched ? ' (matched)' : ''}`}
              >
                <p className="text-sm text-gray-800 mb-3">{d.definition}</p>
                
                {matched && matchedWord ? (
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      showDefFeedback 
                        ? isDefCorrect 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {matchedWord.word}
                      {showDefFeedback && (
                        <span className="ml-1">
                          {isDefCorrect ? '✅' : '❌'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearMatch(d.id);
                      }}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-gray-200 transition-colors"
                      aria-label="Clear match"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm italic">
                    Drag a word here
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress indicator and Check/Next Button like other activities */}
      <div className="space-y-4">
        <div className="text-center text-sm text-gray-600">
          {!isCompleted ? (
            <span>Matched: {matchedWordIds.size} of 6{attempts > 0 ? ` • Attempts: ${attempts}` : ''}</span>
          ) : (
            <span>All words matched correctly!</span>
          )}
        </div>
        
        {/* Simple feedback message like other activities */}
        {showFeedback && !isCompleted && (
          <div className="text-sm text-gray-700">
            {isCorrect ? (
              <span className="font-semibold text-green-700">Correct</span>
            ) : (
              <span className="font-semibold text-red-700">Incorrect</span>
            )}
          </div>
        )}
        
        <div className="flex justify-end">
          {!isCompleted ? (
            <button
              onClick={handleComplete}
              disabled={disabled || matchedWordIds.size < 6}
              className={`px-6 py-2 rounded-lg font-medium transition-colors focus-ring ${
                !disabled && matchedWordIds.size >= 6 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              aria-label="Check answers"
            >
              Check
            </button>
          ) : (
            <button
              onClick={() => onProgressUpdate?.('vocabulary', 'completed', Math.floor((Date.now() - startTime) / 1000))}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors focus-ring"
              aria-label="Next activity"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocabularyActivityEnhanced;

