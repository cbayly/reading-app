'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useActivityProgress } from '../../hooks/useActivityProgress';

interface Setting {
  id: string;
  name: string;
  blurb: string;
  inChapter: boolean;
}

interface WhereActivityEnhancedProps {
  content: {
    type: 'where';
    content: {
      realSettings?: Array<{ id?: string; name?: string; [k: string]: any }>;
      decoySettings?: Array<{ id?: string; name?: string; [k: string]: any }>;
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

// Simple Fisher–Yates shuffle
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
    hash |= 0;
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

function SettingCard({ 
  data, 
  selected, 
  checked, 
  onToggle,
  showHints,
  disabled
}: { 
  data: Setting; 
  selected: boolean; 
  checked: boolean; 
  onToggle: () => void; 
  showHints: boolean;
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

export default function WhereActivityEnhanced({
  content,
  studentId,
  planId,
  dayIndex,
  onCompleteActivity,
  onProgressUpdate,
  onNext
}: WhereActivityEnhancedProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);
  const [checks, setChecks] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [startTime] = useState(Date.now());

  const { progress, getLastAnswer, getActivityState, updateProgress, completeActivity } = useActivityProgress({
    studentId: String(studentId || ''),
    planId: planId || '',
    dayIndex: dayIndex || 0,
    activityType: 'where',
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
      setChecked(true);
    }
    if (state.isCompleted || progress.status === 'completed') {
      setShowHints(true);
      setChecked(true);
    }
  }, [progress, getLastAnswer, getActivityState]);

  // Transform backend data and persist randomized order
  const settings = useMemo(() => {
    // Debug: Log what we're receiving
    console.log('🔍 Where activity content structure:', {
      hasContent: !!content?.content,
      realSettings: content?.content?.realSettings,
      decoySettings: content?.content?.decoySettings,
      legacySettings: content?.content?.settings,
      legacyLocations: content?.content?.locations,
      fullContent: content?.content
    });
    
    const rawReal = (content?.content as any)?.realSettings;
    const rawDecoy = (content?.content as any)?.decoySettings;
    
    // Handle legacy data formats and provide fallbacks
    let realSettings = Array.isArray(rawReal) ? rawReal : [];
    let decoySettings = Array.isArray(rawDecoy) ? rawDecoy : [];
    
    // Fallback: Check for legacy keys if modern ones are empty
    if (realSettings.length === 0) {
      const legacyReal = (content?.content as any)?.settings || (content?.content as any)?.locations || [];
      if (Array.isArray(legacyReal)) {
        realSettings = legacyReal;
      }
    }
    
    if (decoySettings.length === 0) {
      const legacyDecoy = (content?.content as any)?.decoySettings || (content?.content as any)?.fakeSettings || [];
      if (Array.isArray(legacyDecoy)) {
        decoySettings = legacyDecoy;
      }
    }
    
    // Final fallback: Generate basic settings if still empty
    if (realSettings.length === 0) {
      realSettings = [
        { name: 'Story Location', description: 'A place mentioned in the story' },
        { name: 'Character Home', description: 'Where characters live or stay' }
      ];
    }
    
    if (decoySettings.length === 0) {
      decoySettings = [
        { name: 'Similar Place', description: 'A location that could fit the story but doesn\'t appear' }
      ];
    }

    const normalize = (arr: any[], markReal: boolean): Setting[] => {
      return arr.map((item: any, idx: number) => {
        const isString = typeof item === 'string';
        const name = isString
          ? String(item)
          : (item?.name || item?.title || 'Unknown Setting').toString();
        const desc = isString
          ? ''
          : (item?.description || item?.blurb || '');
        const sourceId = isString ? undefined : (item?.id as string | undefined);
        const stableId = sourceId || `s_${hashString(`${name}:${idx}:${markReal ? 'r' : 'd'}`)}`;
        return {
          id: stableId,
          name,
          blurb: desc,
          inChapter: markReal
        } as Setting;
      });
    };

    const baseList: Setting[] = [...normalize(realSettings, true), ...normalize(decoySettings, false)];

    try {
      const storageKey = `where-order:${String(planId || '')}:${String(dayIndex || 0)}`;
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(storageKey);
        const idToItem = new Map(baseList.map((s) => [s.id, s] as const));
        if (saved) {
          const savedIds: string[] = JSON.parse(saved);
          const ordered: Setting[] = [];
          for (const id of savedIds) {
            const item = idToItem.get(id);
            if (item) ordered.push(item);
          }
          const missing = baseList.filter((s) => !savedIds.includes(s.id));
          if (missing.length > 0) {
            missing.sort((a, b) => a.id.localeCompare(b.id));
            ordered.push(...missing);
            window.localStorage.setItem(storageKey, JSON.stringify(ordered.map((s) => s.id)));
          }
          return ordered;
        }
        const shuffled = shuffle(baseList);
        window.localStorage.setItem(storageKey, JSON.stringify(shuffled.map((s) => s.id)));
        return shuffled;
      }
    } catch {
      return shuffle(baseList);
    }

    return baseList;
  }, [content.content.realSettings, content.content.decoySettings, planId, dayIndex]);

  const toggle = (id: string) => {
    if (progress?.status === 'completed') return;
    setChecked(false);
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCheck = () => {
    if (selected.size === 0) return;
    
    setChecked(true);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const realSet = new Set(settings.filter(s => s.inChapter).map(s => s.id));
    const missing = [...realSet].filter((id) => !selected.has(id)).length;
    const extra = [...selected].filter((id) => !realSet.has(id)).length;
    const mastered = missing === 0 && extra === 0;

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
    onProgressUpdate?.('where', 'in_progress', timeSpent);
    
    if (mastered) {
      // Mark as completed
      if (studentId) {
        completeActivity([{
          id: `where-response-${Date.now()}`,
          question: "Where does this chapter take place?",
          answer: [...selected],
          isCorrect: true,
          feedback: "Perfect! All settings identified.",
          score: 100,
          timeSpent,
          createdAt: new Date()
        }], timeSpent).catch(() => {});
      }
      
      onCompleteActivity?.('where', [...selected], [{
        id: `where-response-${Date.now()}`,
        question: "Where does this chapter take place?",
        answer: [...selected],
        isCorrect: true,
        feedback: "Perfect! All settings identified.",
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

  if (!settings.length) {
  return (
      <div className="p-4 text-sm text-gray-600">
        No settings found for this activity.
        <div className="mt-1 text-xs text-gray-500">
          Expected <code>content.realSettings</code> as an array of strings or objects.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Where does this chapter take place?</h2>
      </div>

      <Info>
        Select the settings that appear in this story.
      </Info>

            <div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {settings.map((s) => (
            <SettingCard
              key={s.id}
              data={s}
              selected={selected.has(s.id)}
              checked={checked}
              showHints={showHints}
              onToggle={() => toggle(s.id)}
              disabled={progress?.status === 'completed'}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="text-sm text-gray-700">
          {checked && settings.filter(s => s.inChapter).every(s => selected.has(s.id)) &&
           [...selected].every(id => settings.find(s => s.id === id)?.inChapter) && (
            <span className="font-semibold text-green-700">Correct</span>
          )}
          {checked && !(settings.filter(s => s.inChapter).every(s => selected.has(s.id)) &&
            [...selected].every(id => settings.find(s => s.id === id)?.inChapter)) && (
            <span className="font-semibold text-red-700">Incorrect</span>
          )}
        </div>
        {(() => {
          const realSetLocal = new Set(settings.filter(s => s.inChapter).map(s => s.id));
          const mastered = [...realSetLocal].every(id => selected.has(id)) && [...selected].every(id => realSetLocal.has(id));
          const isDisabled = !selected.size && !checked;
          return (
            <button
              onClick={checked && mastered ? onNext : handleCheck}
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
