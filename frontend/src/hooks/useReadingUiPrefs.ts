'use client';

import { useState, useEffect, useCallback } from 'react';

export type LayoutMode = 'reading' | 'split' | 'activity';

export interface ReadingUiPrefs {
  mode: LayoutMode;
  divider: number; // 0-1 fraction for split position
  fontSize?: number; // Font size multiplier (1.0 = default)
  lastTaskId?: string; // Resume point for activities
}

interface UseReadingUiPrefsOptions {
  planId: string;
  dayIndex: number;
  defaultPrefs?: Partial<ReadingUiPrefs>;
}

const DEFAULT_PREFS: ReadingUiPrefs = {
  mode: 'split',
  divider: 0.55, // 55% for reading pane, 45% for activities
  fontSize: 1.0,
  lastTaskId: undefined
};

/**
 * Hook for managing reading UI preferences with localStorage persistence
 * Key format: rb-v2:plan3:<planId>:day:<dayIndex>:ui
 */
export function useReadingUiPrefs({ 
  planId, 
  dayIndex, 
  defaultPrefs = {} 
}: UseReadingUiPrefsOptions) {
  // Generate the localStorage key
  const storageKey = `rb-v2:plan3:${planId}:day:${dayIndex}:ui`;
  
  // Initialize state with default preferences
  const [prefs, setPrefs] = useState<ReadingUiPrefs>(() => {
    const merged = { ...DEFAULT_PREFS, ...defaultPrefs };
    
    // Try to load from localStorage on initial render
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as ReadingUiPrefs;
          // Validate the parsed data and merge with defaults
          return {
            mode: ['reading', 'split', 'activity'].includes(parsed.mode) ? parsed.mode : merged.mode,
            divider: typeof parsed.divider === 'number' && parsed.divider >= 0 && parsed.divider <= 1 
              ? parsed.divider 
              : merged.divider,
            fontSize: typeof parsed.fontSize === 'number' && parsed.fontSize >= 0.5 && parsed.fontSize <= 2.0
              ? parsed.fontSize
              : merged.fontSize,
            lastTaskId: typeof parsed.lastTaskId === 'string' ? parsed.lastTaskId : merged.lastTaskId
          };
        }
      } catch (error) {
        console.warn('Failed to parse reading UI preferences from localStorage:', error);
      }
    }
    
    return merged;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(prefs));
      } catch (error) {
        console.warn('Failed to save reading UI preferences to localStorage:', error);
      }
    }
  }, [storageKey, prefs]);

  // Update specific preference values
  const updatePrefs = useCallback((updates: Partial<ReadingUiPrefs>) => {
    setPrefs(current => ({ ...current, ...updates }));
  }, []);

  // Update layout mode
  const setMode = useCallback((mode: LayoutMode) => {
    updatePrefs({ mode });
  }, [updatePrefs]);

  // Update divider position
  const setDivider = useCallback((divider: number) => {
    // Clamp divider value between 0 and 1
    const clampedDivider = Math.max(0, Math.min(1, divider));
    updatePrefs({ divider: clampedDivider });
  }, [updatePrefs]);

  // Update font size
  const setFontSize = useCallback((fontSize: number) => {
    // Clamp font size between 0.5x and 2.0x
    const clampedFontSize = Math.max(0.5, Math.min(2.0, fontSize));
    updatePrefs({ fontSize: clampedFontSize });
  }, [updatePrefs]);

  // Update last task ID for resume functionality
  const setLastTaskId = useCallback((taskId: string | undefined) => {
    updatePrefs({ lastTaskId: taskId });
  }, [updatePrefs]);

  // Reset to defaults
  const resetPrefs = useCallback(() => {
    const merged = { ...DEFAULT_PREFS, ...defaultPrefs };
    setPrefs(merged);
  }, [defaultPrefs]);

  // Clear localStorage for this key
  const clearStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Failed to clear reading UI preferences from localStorage:', error);
      }
    }
    resetPrefs();
  }, [storageKey, resetPrefs]);

  return {
    // Current preferences
    prefs,
    
    // Individual preference getters
    mode: prefs.mode,
    divider: prefs.divider,
    fontSize: prefs.fontSize,
    lastTaskId: prefs.lastTaskId,
    
    // Setters
    updatePrefs,
    setMode,
    setDivider,
    setFontSize,
    setLastTaskId,
    
    // Utilities
    resetPrefs,
    clearStorage,
    storageKey
  };
}

/**
 * Hook for managing global reading preferences (across all plans/days)
 * Key format: rb-v2:global:reading-ui
 */
export function useGlobalReadingPrefs() {
  const storageKey = 'rb-v2:global:reading-ui';
  
  const [globalPrefs, setGlobalPrefs] = useState<Partial<ReadingUiPrefs>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          return JSON.parse(stored) as Partial<ReadingUiPrefs>;
        }
      } catch (error) {
        console.warn('Failed to parse global reading preferences from localStorage:', error);
      }
    }
    return {};
  });

  // Save to localStorage whenever global preferences change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(globalPrefs));
      } catch (error) {
        console.warn('Failed to save global reading preferences to localStorage:', error);
      }
    }
  }, [storageKey, globalPrefs]);

  const updateGlobalPrefs = useCallback((updates: Partial<ReadingUiPrefs>) => {
    setGlobalPrefs(current => ({ ...current, ...updates }));
  }, []);

  return {
    globalPrefs,
    updateGlobalPrefs,
    storageKey
  };
}
