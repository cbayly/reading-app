import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDeviceDetector, getOptimalInteractionPattern } from './shared/DeviceDetector';
import {
  EnhancedActivityProps,
  EnhancedVocabularyContent,
  EnhancedVocabularyWord,
  ActivityResponse,
  ActivityFeedback
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
  const deviceInfo = useDeviceDetector();
  const interactionPattern = getOptimalInteractionPattern(deviceInfo);

  const [wordBank, setWordBank] = useState<WordBankItem[]>([]);
  const [definitionBank, setDefinitionBank] = useState<DefinitionBankItem[]>([]);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // wordId -> defId
  const [matchedWordIds, setMatchedWordIds] = useState<Set<string>>(new Set());
  const [matchedDefIds, setMatchedDefIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [draggingWordId, setDraggingWordId] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  const allWords: EnhancedVocabularyWord[] = useMemo(
    () => [...content.content.realWords, ...content.content.decoyWords],
    [content.content.realWords, content.content.decoyWords]
  );

  // Initialize banks and restore progress
  useEffect(() => {
    const words: WordBankItem[] = allWords.map((w, idx) => ({
      id: `w-${idx}`,
      word: w.word,
      isReal: w.isReal
    }));

    // Build definitions from real + decoys, then shuffle
    const defs: DefinitionBankItem[] = allWords.map((w, idx) => ({
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
      }

      if (progress.status === 'completed' && lastResponse.feedback) {
        const finalFeedback: ActivityFeedback = {
          isCorrect: lastResponse.isCorrect || false,
          score: lastResponse.score || 0,
          feedback: lastResponse.feedback,
          suggestions: lastResponse.isCorrect ? undefined : [
            'Revisit each vocabulary word and reread its context sentence.',
            'Focus on root words and prefixes to infer meaning.',
            'Try eliminating obviously unrelated definitions first.'
          ],
          nextSteps: lastResponse.isCorrect ? [
            'Excellent! Move on to the next activity.',
            'Try using each word in your own sentence.'
          ] : [
            'Review the story section containing these words.',
            'Look for contextual clues near each vocabulary word.'
          ]
        };
        setFeedback(finalFeedback);
        setShowFeedback(true);
      }
    }
  }, [allWords, progress]);

  // Update progress when activity starts
  useEffect(() => {
    if (!progress || progress.status === 'not_started') {
      onProgressUpdate?.('vocabulary', 'in_progress');
    }
  }, [progress, onProgressUpdate]);

  const isAllMatched = matchedWordIds.size > 0 && matchedWordIds.size === wordBank.length;

  const handleSelectWord = useCallback((wordId: string) => {
    if (disabled) return;
    setSelectedWordId(prev => (prev === wordId ? null : wordId));
  }, [disabled]);

  const handleSelectDefinition = useCallback((defId: string) => {
    if (disabled) return;
    setSelectedDefinitionId(prev => (prev === defId ? null : defId));
  }, [disabled]);

  // When both a word and a definition are selected, attempt a match
  useEffect(() => {
    if (!selectedWordId || !selectedDefinitionId) return;
    const word = wordBank.find(w => w.id === selectedWordId);
    const def = definitionBank.find(d => d.id === selectedDefinitionId);
    if (!word || !def) return;

    const isCorrect = def.word === word.word;

    const immediateFeedback: ActivityFeedback = {
      isCorrect,
      score: isCorrect ? 100 : 0,
      feedback: isCorrect
        ? `Nice! “${word.word}” matches its definition.`
        : `Not quite. That definition does not match “${word.word}”.`,
      suggestions: isCorrect ? undefined : [
        'Re-read the context sentence for the word.',
        'Look for key clues that align with the word meaning.'
      ],
      nextSteps: isCorrect ? ['Match the remaining words.'] : ['Try another definition.']
    };
    setFeedback(immediateFeedback);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2500);

    if (isCorrect) {
      setMatches(prev => ({ ...prev, [selectedWordId]: selectedDefinitionId }));
      setMatchedWordIds(prev => new Set([...Array.from(prev), selectedWordId]));
      setMatchedDefIds(prev => new Set([...Array.from(prev), selectedDefinitionId]));
      setSelectedWordId(null);
      setSelectedDefinitionId(null);
    } else {
      // Keep word selected to let the user try a different definition
      setSelectedDefinitionId(null);
    }
  }, [selectedWordId, selectedDefinitionId, wordBank, definitionBank]);

  // Drag and drop for desktop: drag word onto a definition
  const onWordDragStart = (e: React.DragEvent, wordId: string) => {
    if (interactionPattern.dragPattern === 'touchDrag' || disabled) return;
    setDraggingWordId(wordId);
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
    setSelectedWordId(wordId);
    setSelectedDefinitionId(defId);
    setDraggingWordId(null);
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
    const isCorrect = correctCount === total && total > 0;

    const finalFeedback: ActivityFeedback = {
      isCorrect,
      score,
      feedback: isCorrect
        ? 'Excellent! You matched all vocabulary words correctly.'
        : `You matched ${correctCount} of ${total} words correctly. Keep practicing!`,
      suggestions: !isCorrect ? [
        'Review the context sentences for tricky words.',
        'Compare subtle differences between similar definitions.'
      ] : undefined,
      nextSteps: isCorrect ? [
        'Great job! Proceed to the next activity.',
        'Use each new word in a sentence of your own.'
      ] : [
        'Retry the unmatched words.',
        'Ask for hints or re-read the story section.'
      ]
    };

    setFeedback(finalFeedback);
    setShowFeedback(true);

    const responses: ActivityResponse[] = [
      {
        id: `vocabulary-response-${Date.now()}`,
        question: content.content.question,
        answer: answers,
        isCorrect,
        feedback: finalFeedback.feedback,
        score,
        timeSpent,
        createdAt: new Date()
      }
    ];

    onComplete('vocabulary', answers, responses);
    onProgressUpdate?.('vocabulary', 'completed', timeSpent);
  }, [disabled, startTime, wordBank, definitionBank, matches, content, onComplete, onProgressUpdate]);

  const isCompleted = progress?.status === 'completed';

  const getWordClasses = (id: string) => {
    const matched = matchedWordIds.has(id);
    const selected = selectedWordId === id;
    if (matched) return 'border-green-500 bg-green-50 text-green-800 cursor-default';
    if (selected) return 'border-blue-500 bg-blue-50 text-blue-800';
    return 'border-gray-200 bg-white text-gray-900 hover:border-gray-300';
  };

  const getDefClasses = (id: string) => {
    const matched = matchedDefIds.has(id);
    const selected = selectedDefinitionId === id;
    if (matched) return 'border-green-500 bg-green-50 text-green-800 cursor-default';
    if (selected) return 'border-blue-500 bg-blue-50 text-blue-800';
    return 'border-gray-200 bg-white text-gray-900 hover:border-gray-300';
  };

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
                  <li>• Tap a word, then tap its correct definition</li>
                  <li>• Correct matches will lock in place</li>
                </>
              ) : (
                <>
                  <li>• Drag a word and drop it on the correct definition</li>
                  <li>• Or click a word and then click a definition to match</li>
                </>
              )}
              <li>• Use context sentences mentally to verify meanings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {content.content.question}
        </h3>
        <p className="text-gray-600">{content.content.instructions}</p>
      </div>

      {/* Immediate Feedback */}
      {showFeedback && feedback && (
        <div className={`border rounded-lg p-4 transition-all duration-300 ${
          feedback.isCorrect ? 'border-green-200 bg-green-50 text-green-800' : 'border-yellow-200 bg-yellow-50 text-yellow-800'
        }`} role="status" aria-live="polite">
          <div className="flex items-start">
            <svg className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${feedback.isCorrect ? 'text-green-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  {feedback.suggestions.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Matching Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Words */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Word Bank</h4>
          <div className="space-y-2">
            {wordBank.map(w => (
              <div
                key={w.id}
                className={`p-3 border-2 rounded-lg transition-colors ${getWordClasses(w.id)} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={`Word: ${w.word}${matchedWordIds.has(w.id) ? ' (matched)' : selectedWordId === w.id ? ' (selected)' : ''}`}
                draggable={interactionPattern.dragPattern !== 'touchDrag' && !matchedWordIds.has(w.id) && !disabled}
                onDragStart={(e) => onWordDragStart(e, w.id)}
                onClick={() => handleSelectWord(w.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectWord(w.id);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{w.word}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${w.isReal ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{w.isReal ? 'Story Word' : 'Decoy'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Definitions */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Definitions</h4>
          <div className="space-y-2">
            {definitionBank.map(d => {
              const matched = matchedDefIds.has(d.id);
              const selected = selectedDefinitionId === d.id;
              const classes = getDefClasses(d.id);
              return (
                <div
                  key={d.id}
                  className={`p-3 border-2 rounded-lg transition-colors ${classes} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={`Definition: ${d.definition}${matched ? ' (matched)' : selected ? ' (selected)' : ''}`}
                  onClick={() => handleSelectDefinition(d.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectDefinition(d.id);
                    }
                  }}
                  onDragOver={onDefinitionDragOver}
                  onDrop={(e) => onDefinitionDrop(e, d.id)}
                >
                  <p className="text-sm text-gray-800">{d.definition}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress and Complete */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Matched: {matchedWordIds.size} of {wordBank.length}
        </span>
        {!isCompleted && (
          <button
            onClick={handleComplete}
            disabled={disabled || wordBank.length === 0}
            className={`px-4 py-2 rounded-lg font-medium transition-colors focus-ring ${
              !disabled ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500'
            }`}
            aria-label="Complete activity"
          >
            Complete Activity
          </button>
        )}
      </div>

      {/* Final Feedback */}
      {isCompleted && feedback && (
        <div className="text-center py-4">
          <div className={`inline-flex items-center px-4 py-2 rounded-full ${
            feedback.isCorrect ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
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

export default VocabularyActivityEnhanced;

