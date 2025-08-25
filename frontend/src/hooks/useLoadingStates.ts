import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  id: string;
  isLoading: boolean;
  message?: string;
  progress?: number;
  error?: Error;
  startTime?: number;
}

export interface UseLoadingStatesOptions {
  onStateChange?: (states: LoadingState[]) => void;
  autoCleanup?: boolean;
  cleanupDelay?: number;
}

export interface UseLoadingStatesReturn {
  states: LoadingState[];
  isLoading: boolean;
  startLoading: (id: string, message?: string) => void;
  stopLoading: (id: string, error?: Error) => void;
  updateProgress: (id: string, progress: number) => void;
  updateMessage: (id: string, message: string) => void;
  clearLoading: (id: string) => void;
  clearAll: () => void;
  getLoadingState: (id: string) => LoadingState | undefined;
  isAnyLoading: boolean;
  getLoadingMessage: () => string | undefined;
  getOverallProgress: () => number;
}

export function useLoadingStates(
  options: UseLoadingStatesOptions = {}
): UseLoadingStatesReturn {
  const { onStateChange, autoCleanup = true, cleanupDelay = 5000 } = options;
  
  const [states, setStates] = useState<LoadingState[]>([]);
  const cleanupTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Update states and notify callback
  const updateStates = useCallback((newStates: LoadingState[]) => {
    setStates(newStates);
    onStateChange?.(newStates);
  }, [onStateChange]);

  // Start loading state
  const startLoading = useCallback((id: string, message?: string) => {
    setStates(prev => {
      const existing = prev.find(s => s.id === id);
      if (existing && existing.isLoading) {
        return prev; // Already loading
      }

      const newState: LoadingState = {
        id,
        isLoading: true,
        message,
        startTime: Date.now()
      };

      const updated = existing 
        ? prev.map(s => s.id === id ? { ...s, ...newState } : s)
        : [...prev, newState];

      updateStates(updated);
      return updated;
    });

    // Clear any existing cleanup timeout
    const existingTimeout = cleanupTimeouts.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      cleanupTimeouts.current.delete(id);
    }
  }, [updateStates]);

  // Stop loading state
  const stopLoading = useCallback((id: string, error?: Error) => {
    setStates(prev => {
      const updated = prev.map(s => 
        s.id === id 
          ? { ...s, isLoading: false, error }
          : s
      );
      updateStates(updated);
      return updated;
    });

    // Auto-cleanup after delay
    if (autoCleanup) {
      const timeout = setTimeout(() => {
        clearLoading(id);
      }, cleanupDelay);
      cleanupTimeouts.current.set(id, timeout);
    }
  }, [updateStates, autoCleanup, cleanupDelay]);

  // Update progress for a loading state
  const updateProgress = useCallback((id: string, progress: number) => {
    setStates(prev => {
      const updated = prev.map(s => 
        s.id === id 
          ? { ...s, progress: Math.min(100, Math.max(0, progress)) }
          : s
      );
      updateStates(updated);
      return updated;
    });
  }, [updateStates]);

  // Update message for a loading state
  const updateMessage = useCallback((id: string, message: string) => {
    setStates(prev => {
      const updated = prev.map(s => 
        s.id === id 
          ? { ...s, message }
          : s
      );
      updateStates(updated);
      return updated;
    });
  }, [updateStates]);

  // Clear specific loading state
  const clearLoading = useCallback((id: string) => {
    setStates(prev => {
      const updated = prev.filter(s => s.id !== id);
      updateStates(updated);
      return updated;
    });

    // Clear cleanup timeout
    const timeout = cleanupTimeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      cleanupTimeouts.current.delete(id);
    }
  }, [updateStates]);

  // Clear all loading states
  const clearAll = useCallback(() => {
    setStates([]);
    updateStates([]);

    // Clear all cleanup timeouts
    cleanupTimeouts.current.forEach(timeout => clearTimeout(timeout));
    cleanupTimeouts.current.clear();
  }, [updateStates]);

  // Get specific loading state
  const getLoadingState = useCallback((id: string) => {
    return states.find(s => s.id === id);
  }, [states]);

  // Check if any state is loading
  const isAnyLoading = states.some(s => s.isLoading);

  // Get the most recent loading message
  const getLoadingMessage = useCallback(() => {
    const loadingStates = states.filter(s => s.isLoading);
    if (loadingStates.length === 0) return undefined;
    
    // Return the most recent loading state's message
    const mostRecent = loadingStates.sort((a, b) => 
      (b.startTime || 0) - (a.startTime || 0)
    )[0];
    
    return mostRecent.message;
  }, [states]);

  // Calculate overall progress
  const getOverallProgress = useCallback(() => {
    const loadingStates = states.filter(s => s.isLoading && s.progress !== undefined);
    if (loadingStates.length === 0) return 0;
    
    const totalProgress = loadingStates.reduce((sum, state) => sum + (state.progress || 0), 0);
    return Math.round(totalProgress / loadingStates.length);
  }, [states]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTimeouts.current.forEach(timeout => clearTimeout(timeout));
      cleanupTimeouts.current.clear();
    };
  }, []);

  return {
    states,
    isLoading: isAnyLoading,
    startLoading,
    stopLoading,
    updateProgress,
    updateMessage,
    clearLoading,
    clearAll,
    getLoadingState,
    isAnyLoading,
    getLoadingMessage,
    getOverallProgress
  };
}

// Specialized loading states for Plan3
export function usePlan3LoadingStates() {
  const loadingStates = useLoadingStates({
    autoCleanup: true,
    cleanupDelay: 3000
  });

  // Convenience methods for common Plan3 operations
  const startPlanLoading = useCallback((planId: string) => {
    loadingStates.startLoading(`plan_${planId}`, 'Loading reading plan...');
  }, [loadingStates]);

  const startDayLoading = useCallback((planId: string, dayIndex: number) => {
    loadingStates.startLoading(`day_${planId}_${dayIndex}`, 'Loading day content...');
  }, [loadingStates]);

  const startActivityLoading = useCallback((activityId: string) => {
    loadingStates.startLoading(`activity_${activityId}`, 'Saving activity...');
  }, [loadingStates]);

  const startStoryLoading = useCallback((storyId: string) => {
    loadingStates.startLoading(`story_${storyId}`, 'Generating story...');
  }, [loadingStates]);

  const startSaveLoading = useCallback((operation: string) => {
    loadingStates.startLoading(`save_${operation}`, 'Saving changes...');
  }, [loadingStates]);

  return {
    ...loadingStates,
    startPlanLoading,
    startDayLoading,
    startActivityLoading,
    startStoryLoading,
    startSaveLoading
  };
}

// Loading state for async operations
export function useAsyncLoadingState<T>(
  asyncFn: (...args: any[]) => Promise<T>,
  options: {
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
    loadingMessage?: string;
  } = {}
) {
  const { onSuccess, onError, loadingMessage = 'Loading...' } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn(...args);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const appError = err instanceof Error ? err : new Error('Operation failed');
      setError(appError);
      onError?.(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, [asyncFn, onSuccess, onError]);

  return {
    execute,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}
