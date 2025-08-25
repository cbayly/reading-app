import { useState, useEffect, useCallback, useRef } from 'react';
import { ActivityProgress, ActivityResponse, ActivityState } from '../types/enhancedActivities';

interface UseActivityProgressOptions {
  studentId: string;
  planId: string;
  dayIndex: number;
  activityType: string;
  autoSave?: boolean;
  offlineFallback?: boolean;
}

interface UseActivityProgressReturn {
  // State
  progress: ActivityProgress | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  lastSaved: Date | null;
  
  // Actions
  updateProgress: (status: ActivityProgress['status'], timeSpent?: number) => Promise<void>;
  saveResponse: (response: ActivityResponse) => Promise<void>;
  completeActivity: (responses: ActivityResponse[], timeSpent: number) => Promise<void>;
  resetProgress: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  syncCrossDevice: () => Promise<void>;
  
  // Utilities
  getActivityState: () => ActivityState;
  hasUnsavedChanges: boolean;
  isOffline: boolean;
}

const STORAGE_KEY_PREFIX = 'activity_progress_';
const SYNC_QUEUE_KEY = 'activity_sync_queue';

interface SyncQueueItem {
  id: string;
  action: 'update' | 'save' | 'complete' | 'reset';
  data: any;
  timestamp: number;
}

export const useActivityProgress = ({
  studentId,
  planId,
  dayIndex,
  activityType,
  autoSave = true,
  offlineFallback = true
}: UseActivityProgressOptions): UseActivityProgressReturn => {
  const [progress, setProgress] = useState<ActivityProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  const syncQueueRef = useRef<SyncQueueItem[]>([]);
  const lastSyncRef = useRef<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate storage keys
  const storageKey = `${STORAGE_KEY_PREFIX}${studentId}_${planId}_${dayIndex}_${activityType}`;
  
  // Load sync queue from localStorage
  useEffect(() => {
    try {
      const queueData = localStorage.getItem(SYNC_QUEUE_KEY);
      if (queueData) {
        syncQueueRef.current = JSON.parse(queueData);
      }
    } catch (err) {
      console.warn('Failed to load sync queue from localStorage:', err);
    }
  }, []);

  // Save sync queue to localStorage
  const saveSyncQueue = useCallback(() => {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueueRef.current));
    } catch (err) {
      console.warn('Failed to save sync queue to localStorage:', err);
    }
  }, []);

  // Load progress from localStorage
  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (parsed.startedAt && typeof parsed.startedAt === 'string') {
          parsed.startedAt = new Date(parsed.startedAt);
        }
        if (parsed.completedAt && typeof parsed.completedAt === 'string') {
          parsed.completedAt = new Date(parsed.completedAt);
        }
        if (parsed.responses && Array.isArray(parsed.responses)) {
          parsed.responses = parsed.responses.map((r: any) => ({
            ...r,
            createdAt: r.createdAt && typeof r.createdAt === 'string' ? new Date(r.createdAt) : new Date()
          }));
        }
        return parsed as ActivityProgress;
      }
    } catch (err) {
      console.warn('Failed to load progress from localStorage:', err);
    }
    return null;
  }, [storageKey]);

  // Save progress to localStorage
  const saveToStorage = useCallback((progressData: ActivityProgress) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progressData));
      setLastSaved(new Date());
    } catch (err) {
      console.warn('Failed to save progress to localStorage:', err);
    }
  }, [storageKey]);

  // API call to fetch progress from server
  const fetchProgress = useCallback(async (): Promise<ActivityProgress | null> => {
    try {
      const response = await fetch(`/api/enhanced-activities/progress/${studentId}/${planId}/${dayIndex}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No progress found
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const serverProgress = data.progress?.[activityType];
      
      if (serverProgress) {
        // Convert server progress to ActivityProgress format
        return {
          id: `${studentId}_${planId}_${dayIndex}_${activityType}`,
          activityType: activityType as ActivityProgress['activityType'],
          status: serverProgress.status,
          startedAt: serverProgress.startedAt ? new Date(serverProgress.startedAt) : undefined,
          completedAt: serverProgress.completedAt ? new Date(serverProgress.completedAt) : undefined,
          timeSpent: serverProgress.timeSpent,
          attempts: serverProgress.attempts,
          responses: serverProgress.responses?.map((r: any) => ({
            ...r,
            createdAt: new Date(r.createdAt)
          })) || []
        };
      }
      
      return null;
    } catch (err) {
      console.warn('Failed to fetch progress from server:', err);
      return null;
    }
  }, [studentId, planId, dayIndex, activityType]);

  // API call to save progress to server
  const saveProgressToServer = useCallback(async (progressData: ActivityProgress): Promise<boolean> => {
    try {
      // Convert ActivityProgress to the format expected by the API
      const apiPayload = {
        planId,
        dayIndex,
        activityType,
        status: progressData.status,
        timeSpent: progressData.timeSpent,
        answers: progressData.responses.map(response => ({
          question: response.question,
          answer: response.answer,
          isCorrect: response.isCorrect,
          feedback: response.feedback,
          score: response.score,
          timeSpent: response.timeSpent
        }))
      };

      const response = await fetch('/api/enhanced-activities/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      console.warn('Failed to save progress to server:', err);
      return false;
    }
  }, [studentId, planId, dayIndex, activityType]);

  // Add item to sync queue
  const addToSyncQueue = useCallback((action: SyncQueueItem['action'], data: any) => {
    const queueItem: SyncQueueItem = {
      id: `${Date.now()}_${Math.random()}`,
      action,
      data,
      timestamp: Date.now()
    };
    
    syncQueueRef.current.push(queueItem);
    saveSyncQueue();
  }, [saveSyncQueue]);

  // Process sync queue
  const processSyncQueue = useCallback(async () => {
    if (syncQueueRef.current.length === 0) return;
    
    const queue = [...syncQueueRef.current];
    const successfulItems: string[] = [];
    
    for (const item of queue) {
      try {
        let success = false;
        
        switch (item.action) {
          case 'update':
            success = await saveProgressToServer(item.data);
            break;
          case 'save':
            success = await saveProgressToServer(item.data);
            break;
          case 'complete':
            success = await saveProgressToServer(item.data);
            break;
          case 'reset':
            // For reset, we need to clear the progress
            // Since the API doesn't have a DELETE endpoint, we'll mark as not_started
            const resetProgress: ActivityProgress = {
              id: `${studentId}_${planId}_${dayIndex}_${activityType}`,
              activityType: activityType as ActivityProgress['activityType'],
              status: 'not_started',
              attempts: 0,
              responses: []
            };
            success = await saveProgressToServer(resetProgress);
            break;
        }
        
        if (success) {
          successfulItems.push(item.id);
        }
      } catch (err) {
        console.warn('Failed to process sync queue item:', item, err);
      }
    }
    
    // Remove successful items from queue
    syncQueueRef.current = syncQueueRef.current.filter(item => !successfulItems.includes(item.id));
    saveSyncQueue();
  }, [saveProgressToServer, saveSyncQueue, studentId, planId, dayIndex, activityType]);

  // Initialize progress
  useEffect(() => {
    const initializeProgress = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to fetch from server first
        let serverProgress = null;
        if (!isOffline) {
          serverProgress = await fetchProgress();
        }
        
        // Load from localStorage as fallback
        const localProgress = loadFromStorage();
        
        // Use server progress if available, otherwise use local
        const initialProgress = serverProgress || localProgress;
        
        if (initialProgress) {
          setProgress(initialProgress);
          // If we have local progress but no server progress, queue for sync
          if (localProgress && !serverProgress && offlineFallback) {
            addToSyncQueue('update', localProgress);
          }
        } else {
          // Create new progress
          const newProgress: ActivityProgress = {
            id: `${studentId}_${planId}_${dayIndex}_${activityType}`,
            activityType: activityType as ActivityProgress['activityType'],
            status: 'not_started',
            attempts: 0,
            responses: []
          };
          setProgress(newProgress);
          if (autoSave) {
            saveToStorage(newProgress);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize progress');
        // Even if there's an error, try to load from localStorage as last resort
        const localProgress = loadFromStorage();
        if (localProgress) {
          setProgress(localProgress);
        } else {
          // Create new progress as fallback
          const newProgress: ActivityProgress = {
            id: `${studentId}_${planId}_${dayIndex}_${activityType}`,
            activityType: activityType as ActivityProgress['activityType'],
            status: 'not_started',
            attempts: 0,
            responses: []
          };
          setProgress(newProgress);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeProgress();
  }, [studentId, planId, dayIndex, activityType, isOffline, offlineFallback, autoSave, fetchProgress, loadFromStorage, addToSyncQueue, saveToStorage]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !progress || !hasUnsavedChanges) return;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveToStorage(progress);
      setHasUnsavedChanges(false);
    }, 2000); // Auto-save after 2 seconds of inactivity
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [progress, hasUnsavedChanges, autoSave, saveToStorage]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Process sync queue when coming back online
      processSyncQueue();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial network status
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processSyncQueue]);



  // Update progress status
  const updateProgress = useCallback(async (status: ActivityProgress['status'], timeSpent?: number) => {
    if (!progress) return;
    
    const updatedProgress: ActivityProgress = {
      ...progress,
      status,
      timeSpent: timeSpent || progress.timeSpent,
      startedAt: status === 'in_progress' && !progress.startedAt ? new Date() : progress.startedAt,
      completedAt: status === 'completed' ? new Date() : progress.completedAt
    };
    
    setProgress(updatedProgress);
    setHasUnsavedChanges(true);
    
    // Save to localStorage immediately
    saveToStorage(updatedProgress);
    
    // Try to save to server
    if (!isOffline) {
      const success = await saveProgressToServer(updatedProgress);
      if (!success && offlineFallback) {
        addToSyncQueue('update', updatedProgress);
      }
    } else if (offlineFallback) {
      addToSyncQueue('update', updatedProgress);
    }
  }, [progress, isOffline, offlineFallback, saveToStorage, saveProgressToServer, addToSyncQueue]);

  // Save individual response
  const saveResponse = useCallback(async (response: ActivityResponse) => {
    if (!progress) return;
    
    const updatedProgress: ActivityProgress = {
      ...progress,
      responses: [...progress.responses, response],
      attempts: progress.attempts + 1
    };
    
    setProgress(updatedProgress);
    setHasUnsavedChanges(true);
    
    // Save to localStorage immediately
    saveToStorage(updatedProgress);
    
    // Try to save to server
    if (!isOffline) {
      const success = await saveProgressToServer(updatedProgress);
      if (!success && offlineFallback) {
        addToSyncQueue('save', updatedProgress);
      }
    } else if (offlineFallback) {
      addToSyncQueue('save', updatedProgress);
    }
  }, [progress, isOffline, offlineFallback, saveToStorage, saveProgressToServer, addToSyncQueue]);

  // Complete activity
  const completeActivity = useCallback(async (responses: ActivityResponse[], timeSpent: number) => {
    if (!progress) return;
    
    const updatedProgress: ActivityProgress = {
      ...progress,
      status: 'completed',
      responses: [...progress.responses, ...responses],
      completedAt: new Date(),
      timeSpent,
      attempts: progress.attempts + 1
    };
    
    setProgress(updatedProgress);
    setHasUnsavedChanges(true);
    
    // Save to localStorage immediately
    saveToStorage(updatedProgress);
    
    // Try to save to server
    if (!isOffline) {
      const success = await saveProgressToServer(updatedProgress);
      if (!success && offlineFallback) {
        addToSyncQueue('complete', updatedProgress);
      }
    } else if (offlineFallback) {
      addToSyncQueue('complete', updatedProgress);
    }
  }, [progress, isOffline, offlineFallback, saveToStorage, saveProgressToServer, addToSyncQueue]);

  // Reset progress
  const resetProgress = useCallback(async () => {
    const newProgress: ActivityProgress = {
      id: `${studentId}_${planId}_${dayIndex}_${activityType}`,
      activityType: activityType as ActivityProgress['activityType'],
      status: 'not_started',
      attempts: 0,
      responses: []
    };
    
    setProgress(newProgress);
    setHasUnsavedChanges(false);
    
    // Clear localStorage
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.warn('Failed to clear localStorage:', err);
    }
    
    // Try to reset on server by saving the reset progress
    if (!isOffline) {
      const success = await saveProgressToServer(newProgress);
      
      if (!success && offlineFallback) {
        addToSyncQueue('reset', {});
      }
    } else if (offlineFallback) {
      addToSyncQueue('reset', {});
    }
  }, [studentId, planId, dayIndex, activityType, isOffline, offlineFallback, storageKey, addToSyncQueue, saveProgressToServer]);

  // Sync with server
  const syncWithServer = useCallback(async () => {
    if (isOffline) return;
    
    setIsSaving(true);
    try {
      await processSyncQueue();
      lastSyncRef.current = new Date();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync with server');
    } finally {
      setIsSaving(false);
    }
  }, [isOffline, processSyncQueue]);

  // Cross-device synchronization with conflict resolution
  const syncCrossDevice = useCallback(async () => {
    if (isOffline) return;
    
    setIsSaving(true);
    try {
      // Fetch latest progress from server
      const serverProgress = await fetchProgress();
      
      if (serverProgress && progress) {
        // Compare timestamps to resolve conflicts
        const serverLastUpdate = serverProgress.completedAt || serverProgress.startedAt;
        const localLastUpdate = progress.completedAt || progress.startedAt;
        
        if (serverLastUpdate && localLastUpdate) {
          const serverTime = new Date(serverLastUpdate).getTime();
          const localTime = new Date(localLastUpdate).getTime();
          
          // If server has more recent data, use it
          if (serverTime > localTime) {
            setProgress(serverProgress);
            saveToStorage(serverProgress);
            console.log('Synced with server progress (server was more recent)');
          } else if (localTime > serverTime) {
            // If local has more recent data, push to server
            const success = await saveProgressToServer(progress);
            if (success) {
              console.log('Pushed local progress to server (local was more recent)');
            }
          }
        } else if (serverProgress && !progress.completedAt && !progress.startedAt) {
          // If local has no progress but server does, use server
          setProgress(serverProgress);
          saveToStorage(serverProgress);
          console.log('Synced with server progress (local had no progress)');
        }
      } else if (serverProgress && !progress) {
        // If no local progress but server has some, use server
        setProgress(serverProgress);
        saveToStorage(serverProgress);
        console.log('Synced with server progress (no local progress)');
      }
      
      // Process any pending sync queue
      await processSyncQueue();
      lastSyncRef.current = new Date();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync cross-device');
    } finally {
      setIsSaving(false);
    }
  }, [isOffline, fetchProgress, progress, saveToStorage, saveProgressToServer, processSyncQueue]);

  // Get activity state
  const getActivityState = useCallback((): ActivityState => {
    if (!progress) {
      return {
        isLoading,
        error: error || undefined,
        isCompleted: false,
        currentAttempt: 0,
        timeSpent: 0,
        answers: []
      };
    }
    
    const lastResponse = progress.responses[progress.responses.length - 1];
    const feedback = lastResponse ? {
      isCorrect: lastResponse.isCorrect || false,
      score: lastResponse.score || 0,
      feedback: lastResponse.feedback || '',
    } : undefined;
    
    return {
      isLoading,
      error: error || undefined,
      isCompleted: progress.status === 'completed',
      currentAttempt: progress.attempts,
      timeSpent: progress.timeSpent || 0,
      answers: progress.responses.map(r => r.answer),
      feedback
    };
  }, [progress, isLoading, error]);

  return {
    // State
    progress,
    isLoading,
    error,
    isSaving,
    lastSaved,
    
    // Actions
    updateProgress,
    saveResponse,
    completeActivity,
    resetProgress,
    syncWithServer,
    syncCrossDevice,
    
    // Utilities
    getActivityState,
    hasUnsavedChanges,
    isOffline
  };
};
