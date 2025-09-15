'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useActivityProgress } from '../../hooks/useActivityProgress';

interface Character {
  id: string;
  name: string;
  blurb: string;
  inChapter: boolean;
}

interface WhoActivityEnhancedProps {
  content: {
    type: 'who';
    content: {
      realCharacters?: Array<{ id?: string; name?: string; [k: string]: any }>;
      decoyCharacters?: Array<{ id?: string; name?: string; [k: string]: any }>;
      [k: string]: any;
    };
  };
  studentId?: string;
  planId?: string;
  dayIndex?: number;
  onCompleteActivity?: (activityType: string, answers: any[], responses?: any[]) => void;
  onProgressUpdate?: (activityType: string, status: 'in_progress' | 'completed' | 'not_started', timeSpent?: number) => void;
  onNext?: () => void;
}

const cn = (...xs: any[]) => xs.filter(Boolean).join(" ");

// Simple Fisher–Yates shuffle to randomize character order once per load
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

// Deterministic string hash for stable IDs/localStorage keys
function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const chr = value.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm text-blue-900">{children}</p>
    </div>
  );
}

function CharacterCard({ 
  data, 
  selected, 
  checked, 
  showHints,
  onToggle,
  disabled
}: { 
  data: Character; 
  selected: boolean; 
  checked: boolean; 
  showHints: boolean;
  onToggle: () => void; 
  disabled?: boolean;
}) {
  const isReal = data.inChapter;
  const isSel = selected;

  // Visual palette - using blue theme to match existing design
  let palette;
  if (checked && showHints) {
    if (isReal && isSel) palette = "border-green-300 bg-green-50";
    else if (isReal && !isSel) palette = "border-amber-300 bg-amber-50";
    else if (!isReal && isSel) palette = "border-red-300 bg-red-50";
    else palette = "border-gray-200 bg-white";
  } else {
    palette = isSel ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white";
  }

  // Small icon after check for non-color cue
  let badge = null;
  if (checked && showHints) {
    if (isReal && isSel) badge = "✅";
    else if (isReal && !isSel) badge = "⚠️";
    else if (!isReal && isSel) badge = "✗";
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!isSel}
      onClick={onToggle}
      className={cn(
        "w-full rounded-lg border p-4 text-left shadow-sm transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        palette
      )}
    >
      <div className="mb-1 text-base font-semibold text-gray-900">
        {data.name} {checked && badge && <span className="ml-1">{badge}</span>}
      </div>
      <div className="text-sm text-gray-600">{data.blurb}</div>
    </button>
  );
}

export default function WhoActivityEnhanced({
  content,
  studentId,
  planId,
  dayIndex,
  onCompleteActivity,
  onProgressUpdate,
  onNext
}: WhoActivityEnhancedProps) {
  const [selected, setSelected] = useState(new Set<string>());
  const [checked, setChecked] = useState(false);
  const [checks, setChecks] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [startTime] = useState(Date.now());

  // Transform backend data and persist randomized order
  const characters = useMemo(() => {
    const rawReal = (content?.content as any)?.realCharacters;
    const rawDecoy = (content?.content as any)?.decoyCharacters;
    
    // Handle legacy data formats and provide fallbacks
    let realCharacters = Array.isArray(rawReal) ? rawReal : [];
    let decoyCharacters = Array.isArray(rawDecoy) ? rawDecoy : [];
    
    // Fallback: Check for legacy keys if modern ones are empty
    if (realCharacters.length === 0) {
      const legacyReal = (content?.content as any)?.characters || (content?.content as any)?.people || [];
      if (Array.isArray(legacyReal)) {
        realCharacters = legacyReal;
      }
    }
    
    if (decoyCharacters.length === 0) {
      const legacyDecoy = (content?.content as any)?.decoyCharacters || (content?.content as any)?.fakeCharacters || [];
      if (Array.isArray(legacyDecoy)) {
        decoyCharacters = legacyDecoy;
      }
    }
    
    // Final fallback: Generate basic characters if still empty
    if (realCharacters.length === 0) {
      realCharacters = [
        { name: 'Main Character', role: 'protagonist', description: 'The main person in the story' },
        { name: 'Helper', role: 'supporting', description: 'Someone who helps the main character' }
      ];
    }
    
    if (decoyCharacters.length === 0) {
      decoyCharacters = [
        { name: 'Side Character', role: 'supporting', description: 'A character who could be in the story but isn\'t' }
      ];
    }

    const normalize = (arr: any[], markReal: boolean): Character[] => {
      return arr.map((item: any, idx: number) => {
        const isString = typeof item === 'string';
        const name = isString
          ? String(item)
          : (item?.name || item?.title || 'Unknown Character').toString();
        const role = isString
          ? 'character'
          : (item?.role || item?.type || 'character');
        const desc = isString
          ? ''
          : (item?.description || item?.blurb || '');
        const sourceId = isString ? undefined : (item?.id as string | undefined);
        const stableId = sourceId || `c_${hashString(`${name}:${idx}:${markReal ? 'r' : 'd'}`)}`;
        return {
          id: stableId,
          name,
          role,
          blurb: desc,
          inChapter: markReal
        } as Character;
      });
    };

    const baseList: Character[] = [...normalize(realCharacters, true), ...normalize(decoyCharacters, false)];

    try {
      const storageKey = `who-order:${String(planId || '')}:${String(dayIndex || 0)}`;
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(storageKey);
        const idToItem = new Map(baseList.map((c) => [c.id, c] as const));
        if (saved) {
          const savedIds: string[] = JSON.parse(saved);
          const ordered: Character[] = [];
          for (const id of savedIds) {
            const item = idToItem.get(id);
            if (item) ordered.push(item);
          }
          const missing = baseList.filter((c) => !savedIds.includes(c.id));
          if (missing.length > 0) {
            missing.sort((a, b) => a.id.localeCompare(b.id));
            ordered.push(...missing);
            window.localStorage.setItem(storageKey, JSON.stringify(ordered.map((c) => c.id)));
          }
          return ordered;
        }
        const shuffled = shuffle(baseList);
        window.localStorage.setItem(storageKey, JSON.stringify(shuffled.map((c) => c.id)));
        return shuffled;
      }
    } catch {
      return shuffle(baseList);
    }

    return baseList;
  }, [content.content.realCharacters, content.content.decoyCharacters, planId, dayIndex]);

  const realSet = useMemo(
    () => new Set(characters.filter((c) => c.inChapter).map((c) => c.id)),
    [characters]
  );

  const { missing, extra, mastered } = useMemo(() => {
    const missingIds = [...realSet].filter((id) => !selected.has(id));
    const extraIds = [...selected].filter((id) => !realSet.has(id));
    return {
      missing: missingIds.length,
      extra: extraIds.length,
      mastered: missingIds.length === 0 && extraIds.length === 0,
    };
  }, [realSet, selected]);

  // Integration with existing progress system
  const { progress, getLastAnswer, getActivityState, updateProgress, completeActivity } = useActivityProgress({
    studentId: String(studentId || ''),
    planId: planId || '',
    dayIndex: dayIndex || 0,
    activityType: 'who',
    autoSave: true,
    offlineFallback: true
  });

  // Rehydrate saved answers and lock if completed
  useEffect(() => {
    if (!progress) return;
    const state = getActivityState();
    const last = getLastAnswer();
    if (last && Array.isArray(last.answer)) {
      setSelected(new Set<string>(last.answer));
      // If there's a previous check, reflect it
      setChecked(true);
    }
    if (state.isCompleted || progress.status === 'completed') {
      // Ensure UI shows final state with hints and locked interactions
      setShowHints(true);
      setChecked(true);
    }
  }, [progress, getLastAnswer, getActivityState]);

  // Track progress when activity becomes active
  useEffect(() => {
    if (studentId) {
      updateProgress('in_progress').catch(() => {});
    }
  }, [studentId, updateProgress]);

  const toggle = (id: string) => {
    if (progress?.status === 'completed') return; // lock when completed
    setChecked(false);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCheck = () => {
    setChecked(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    const payload = {
      selectedIds: [...selected],
      missing,
      extra,
      checks: checks + 1,
      mastered,
    };
    
    const nextChecks = checks + 1;
    setChecks(nextChecks);
    if (!mastered && nextChecks >= 3) {
      setShowHints(true);
    }
    
    // Update progress
    if (studentId) {
      updateProgress('in_progress', timeSpent).catch(() => {});
    }
    
    // Call parent callbacks
    onProgressUpdate?.('who', 'in_progress', timeSpent);
    
    if (mastered) {
      // Mark as completed
      if (studentId) {
        completeActivity([{
          id: `who-response-${Date.now()}`,
          question: "Who are the characters in this chapter?",
          answer: [...selected],
          isCorrect: true,
          feedback: "Perfect! All characters identified.",
          score: 100,
          timeSpent,
          createdAt: new Date()
        }], timeSpent).catch(() => {});
      }
      
      onCompleteActivity?.('who', [...selected], [{
        id: `who-response-${Date.now()}`,
        question: "Who are the characters in this chapter?",
        answer: [...selected],
        isCorrect: true,
        feedback: "Perfect! All characters identified.",
        score: 100,
        timeSpent,
        createdAt: new Date()
      }]);
      
      // brief delay so students see the green state before auto-advancing
      setTimeout(() => {
        // Auto-advance logic would go here if needed
      }, 250);
    }
  };

  if (!characters.length) {
  return (
      <div className="p-4 text-sm text-gray-600">
        No characters found for this activity.
        <div className="mt-1 text-xs text-gray-500">
          Expected <code>content.realCharacters</code> as an array of strings or objects.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Who are the characters in this chapter?</h2>
      </div>

      <Info>
        Select the characters that appear in this story.
      </Info>

            <div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {characters.map((c) => (
            <CharacterCard
              key={c.id}
              data={c}
              selected={selected.has(c.id)}
              checked={checked}
              showHints={showHints}
              onToggle={() => toggle(c.id)}
              disabled={progress?.status === 'completed'}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="text-sm text-gray-700">
          {checked && mastered && (
            <span className="font-semibold text-green-700">Correct</span>
          )}
          {checked && !mastered && (
            <span className="font-semibold text-red-700">Incorrect</span>
          )}
        </div>
        {(() => {
          const isDisabled = !selected.size && !checked;
          const handleNextClick = () => {
            console.log('🚀 Who activity Next button clicked:', {
              hasOnNext: !!onNext,
              onNextType: typeof onNext,
              progress,
              mastered,
              checked
            });
            if (onNext) {
              onNext();
            } else {
              console.warn('⚠️ onNext callback is missing!');
            }
          };
          
          return (
            <button
              onClick={checked && mastered ? handleNextClick : handleCheck}
              className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm ${
                checked && mastered
                  ? 'text-white bg-green-600 hover:bg-green-700'
                  : isDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  : 'text-white bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isDisabled}
            >
              {checked && mastered ? 'Next' : 'Check'}
            </button>
          );
        })()}
      </div>
    </div>
  );
}
