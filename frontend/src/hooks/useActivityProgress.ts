import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
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
  isRestoring: boolean;
  restoredFrom: 'server' | 'local' | 'none' | 'session';
  
  // Actions
  updateProgress: (status: ActivityProgress['status'], timeSpent?: number) => Promise<void>;
  saveResponse: (response: ActivityResponse) => Promise<void>;
  completeActivity: (responses: ActivityResponse[], timeSpent: number) => Promise<void>;
  resetProgress: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  syncCrossDevice: () => Promise<void>;
  restoreProgress: () => Promise<void>;
  forceSync: () => Promise<void>;
  
  // Answer persistence and review
  getAnswerHistory: () => ActivityResponse[];
  getLastAnswer: () => ActivityResponse | null;
  getAnswersByType: (type: string) => ActivityResponse[];
  exportAnswers: () => string;
  
  // Session management
  saveSession: () => Promise<void>; // New: explicit session save
  recoverSession: () => Promise<void>; // New: recover from interruption
  clearSession: () => void; // New: clear session data
  getSessionInfo: () => SessionInfo; // New: get session information
  
  // Utilities
  getActivityState: () => ActivityState;
  hasUnsavedChanges: boolean;
  isOffline: boolean;
  canRestore: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  pendingSyncCount: number;
  lastSyncAttempt: Date | null;
  sessionInterrupted: boolean; // New: indicates if session was interrupted
  sessionRecovered: boolean; // New: indicates if session was recovered
}

const STORAGE_KEY_PREFIX = 'activity_progress_';
const SYNC_QUEUE_KEY = 'activity_sync_queue';
const SESSION_KEY_PREFIX = 'activity_session_';

interface SyncQueueItem {
  id: string;
  action: 'update' | 'save' | 'complete' | 'reset';
  data: any;
  timestamp: number;
}

interface SessionInfo {
  sessionId: string;
  startedAt: Date;
  lastActivity: Date;
  interruptedAt?: Date;
  recoveredAt?: Date;
  totalTimeSpent: number;
  activityCount: number;
  unsavedChanges: boolean;
}

interface SessionData {
  sessionId: string;
  studentId: string;
  planId: string;
  dayIndex: number;
  activityType: string;
  progress: ActivityProgress;
  startedAt: string;
  lastActivity: string;
  interruptedAt?: string;
  totalTimeSpent: number;
  activityCount: number;
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
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoredFrom, setRestoredFrom] = useState<'server' | 'local' | 'none' | 'session'>('none');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('offline');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);
  const [sessionInterrupted, setSessionInterrupted] = useState(false);
  const [sessionRecovered, setSessionRecovered] = useState(false);
  
  const syncQueueRef = useRef<SyncQueueItem[]>([]);
  const lastSyncRef = useRef<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTestRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const beforeUnloadHandlerRef = useRef<((event: BeforeUnloadEvent) => void) | null>(null);

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
    const shapeToProgress = (p: any): ActivityProgress | null => {
      if (!p) return null;
      const responses = Array.isArray(p.responses)
        ? p.responses.map((r: any) => ({
            id: r.id?.toString?.() || `${studentId}_${planId}_${dayIndex}_${activityType}_${Date.now()}`,
            question: r.question || '',
            answer: r.answer,
            isCorrect: r.isCorrect ?? undefined,
            feedback: r.feedback ?? undefined,
            score: r.score ?? undefined,
            timeSpent: r.timeSpent ?? undefined,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
          }))
        : [];
        return {
          id: `${studentId}_${planId}_${dayIndex}_${activityType}`,
          activityType: activityType as ActivityProgress['activityType'],
        status: (p.status as ActivityProgress['status']) || 'not_started',
        startedAt: p.startedAt ? new Date(p.startedAt) : undefined,
        completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
        timeSpent: p.timeSpent ?? 0,
        attempts: p.attempts ?? 0,
        responses
      };
    };
    try {
      // Temporary: use legacy route only to avoid 404s while by-plan alias is unavailable
      const res = await api.get(`/enhanced-activities/${planId}/${dayIndex}`);
      const full = res.data;
      const map = full?.progress || {};
      return shapeToProgress(map[activityType]);
    } catch {
      return null;
    }
  }, [studentId, planId, dayIndex, activityType]);

  // API call to save progress to server
  const saveProgressToServer = useCallback(async (progressData: ActivityProgress): Promise<boolean> => {
    try {
      const answers = progressData.responses?.map((r) => ({
        question: r.question,
        answer: r.answer,
        isCorrect: r.isCorrect,
        feedback: r.feedback,
        score: r.score,
        timeSpent: r.timeSpent
      })) || [];
      await api.post('/enhanced-activities/progress', {
        planId,
        dayIndex,
        activityType,
        status: progressData.status,
        timeSpent: progressData.timeSpent,
        answers
      });
      return true;
    } catch {
      return false;
    }
  }, [planId, dayIndex, activityType]);

  // Add item to sync queue
  const addToSyncQueue = useCallback((action: SyncQueueItem['action'], data: any) => {
    const queueItem: SyncQueueItem = {
      id: `${Date.now()}_${Math.random()}`,
      action,
      data,
      timestamp: Date.now()
    };
    
    syncQueueRef.current.push(queueItem);
    setPendingSyncCount(syncQueueRef.current.length);
    saveSyncQueue();
  }, [saveSyncQueue]);

  // Test connection quality
  const testConnectionQuality = useCallback(async (): Promise<'excellent' | 'good' | 'poor' | 'offline'> => {
    // Disabled for now since we're using Plan3 system
    // The enhanced activities health endpoint is not needed
    return 'good'; // Assume good connection
  }, []);

  // Monitor connection quality
  useEffect(() => {
    const updateConnectionQuality = async () => {
      const quality = await testConnectionQuality();
      setConnectionQuality(quality);
    };

    // Test immediately
    updateConnectionQuality();

    // Set up periodic testing
    connectionTestRef.current = setInterval(updateConnectionQuality, 30000); // Test every 30 seconds

    return () => {
      if (connectionTestRef.current) {
        clearInterval(connectionTestRef.current);
      }
    };
  }, [testConnectionQuality]);

  // Process sync queue with enhanced error handling
  const processSyncQueue = useCallback(async () => {
    if (syncQueueRef.current.length === 0) return;
    
    setLastSyncAttempt(new Date());
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
    setPendingSyncCount(syncQueueRef.current.length);
    saveSyncQueue();
  }, [saveProgressToServer, saveSyncQueue, studentId, planId, dayIndex, activityType]);

  // Enhanced network status monitoring
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const quality = await testConnectionQuality();
      setConnectionQuality(quality);
      
      // Process sync queue when coming back online with good connection
      if (quality !== 'offline' && quality !== 'poor') {
        setTimeout(() => {
          processSyncQueue();
        }, 1000); // Small delay to ensure connection is stable
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setConnectionQuality('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial network status
    setIsOffline(!navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processSyncQueue, testConnectionQuality]);

  // Initialize progress with enhanced restoration tracking
  useEffect(() => {
    const initializeProgress = async () => {
      setIsLoading(true);
      setError(null);
      setIsRestoring(true);
      setRestoredFrom('none');
      
      try {
        // Try to fetch from server first
        let serverProgress = null;
        let serverError = null;
        
        if (!isOffline) {
          try {
          serverProgress = await fetchProgress();
          } catch (err) {
            serverError = err;
            console.warn('Failed to fetch progress from server:', err);
          }
        }
        
        // Load from localStorage as fallback
        const localProgress = loadFromStorage();
        
        // Use server progress if available, otherwise use local
        const initialProgress = serverProgress || localProgress;
        
        if (initialProgress) {
          setProgress(initialProgress);
          setRestoredFrom(serverProgress ? 'server' : 'local');
          
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
          setRestoredFrom('none');
          if (autoSave) {
            saveToStorage(newProgress);
          }
        }
        
        // If there was a server error and no progress was found, set the error
        if (serverError && !initialProgress) {
          setError(serverError instanceof Error ? serverError.message : 'Failed to initialize progress');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize progress');
        // Even if there's an error, try to load from localStorage as last resort
        const localProgress = loadFromStorage();
        if (localProgress) {
          setProgress(localProgress);
          setRestoredFrom('local');
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
          setRestoredFrom('none');
        }
      } finally {
        setIsLoading(false);
        setIsRestoring(false);
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
      
      // Also try to save to server immediately for important changes
      if (!isOffline) {
        saveProgressToServer(progress).catch(() => {
          // If server save fails, add to sync queue
          if (offlineFallback) {
            addToSyncQueue('update', progress);
          }
        });
      } else if (offlineFallback) {
        addToSyncQueue('update', progress);
      }
    }, 1000); // Reduced from 2 seconds to 1 second for more responsive saving
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [progress, hasUnsavedChanges, autoSave, saveToStorage, isOffline, offlineFallback, saveProgressToServer, addToSyncQueue]);

  // Enhanced activity state tracking
  const getActivityState = useCallback((): ActivityState => {
    if (!progress) {
      return {
        isLoading,
        error: error || undefined,
        isCompleted: false,
        currentAttempt: 0,
        timeSpent: 0,
        answers: [],
        status: 'not_started',
        canProceed: false,
        isLocked: false
      };
    }
    
    const lastResponse = progress.responses[progress.responses.length - 1];
    const feedback = lastResponse ? {
      isCorrect: lastResponse.isCorrect || false,
      score: lastResponse.score || 0,
      feedback: lastResponse.feedback || '',
    } : undefined;
    
    // Determine if activity can proceed based on status and responses
    const canProceed = progress.status === 'completed' || 
                      (progress.status === 'in_progress' && progress.responses.length > 0);
    
    // Determine if activity is locked (e.g., too many attempts, time limit exceeded)
    const isLocked = progress.attempts >= 5 || // Lock after 5 attempts
                     (progress.timeSpent ? progress.timeSpent > 3600 : false); // Lock after 1 hour
    
    return {
      isLoading,
      error: error || undefined,
      isCompleted: progress.status === 'completed',
      currentAttempt: progress.attempts,
      timeSpent: progress.timeSpent || 0,
      answers: progress.responses.map(r => r.answer),
      feedback,
      status: progress.status,
      canProceed,
      isLocked
    };
  }, [progress, isLoading, error]);

  // Validate activity state transitions
  const validateStateTransition = useCallback((fromStatus: string, toStatus: string): boolean => {
    // Allow no-op transitions
    if (fromStatus === toStatus) return true;
    const validTransitions: Record<string, string[]> = {
      'not_started': ['in_progress'],
      'in_progress': ['completed', 'not_started'], // Allow reset
      'completed': ['not_started'] // Allow reset
    };
    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }, []);

  // Enhanced progress update with state validation
  const updateProgress = useCallback(async (status: ActivityProgress['status'], timeSpent?: number) => {
    if (!progress) return;
    
    // Validate state transition
    // Ignore attempts to move from completed back to in_progress silently
    if (progress.status === 'completed' && status === 'in_progress') {
      return;
    }
    if (!validateStateTransition(progress.status, status)) {
      console.warn(`Invalid state transition from ${progress.status} to ${status}`);
      return;
    }
    
    // If status is unchanged and no time update, no-op
    if (progress.status === status && (timeSpent === undefined || timeSpent === progress.timeSpent)) {
      return;
    }
    
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
    
    // Try to save to server immediately for status changes
    if (!isOffline) {
      const success = await saveProgressToServer(updatedProgress);
      if (!success && offlineFallback) {
        addToSyncQueue('update', updatedProgress);
      }
    } else if (offlineFallback) {
      addToSyncQueue('update', updatedProgress);
    }
  }, [progress, isOffline, offlineFallback, saveToStorage, saveProgressToServer, addToSyncQueue, validateStateTransition]);

  // Save individual response with immediate saving
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
    
    // Try to save to server immediately for response saves
    if (!isOffline) {
      const success = await saveProgressToServer(updatedProgress);
      if (!success && offlineFallback) {
        addToSyncQueue('save', updatedProgress);
      }
    } else if (offlineFallback) {
      addToSyncQueue('save', updatedProgress);
    }
  }, [progress, isOffline, offlineFallback, saveToStorage, saveProgressToServer, addToSyncQueue]);

  // Complete activity with immediate saving
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
    
    // Try to save to server immediately for completion
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

  // Restore progress from server or local
  const restoreProgress = useCallback(async () => {
    setIsRestoring(true);
    setRestoredFrom('none');
    setError(null);
    
    try {
      const serverProgress = await fetchProgress();
      if (serverProgress) {
        setProgress(serverProgress);
        setRestoredFrom('server');
        console.log('Progress restored from server');
      } else {
        const localProgress = loadFromStorage();
        if (localProgress) {
          setProgress(localProgress);
          setRestoredFrom('local');
          console.log('Progress restored from local');
        } else {
          setRestoredFrom('none');
          console.log('No progress found to restore');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore progress');
      setRestoredFrom('none');
    } finally {
      setIsRestoring(false);
    }
  }, [fetchProgress, loadFromStorage]);

  // Force immediate sync
  const forceSync = useCallback(async () => {
    setIsSaving(true);
    try {
      await processSyncQueue();
      lastSyncRef.current = new Date();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to force sync');
    } finally {
      setIsSaving(false);
    }
  }, [processSyncQueue]);

  // Answer persistence and review
  const getAnswerHistory = useCallback((): ActivityResponse[] => {
    return progress?.responses || [];
  }, [progress]);

  const getLastAnswer = useCallback((): ActivityResponse | null => {
    return progress?.responses[progress?.responses.length - 1] || null;
  }, [progress]);

  const getAnswersByType = useCallback((type: string) => {
    return progress?.responses.filter(r => r.question.includes(type)) || [];
  }, [progress]);

  const exportAnswers = useCallback(() => {
    if (!progress) return '';
    return JSON.stringify(progress.responses, null, 2);
  }, [progress]);

  // Session management
  const saveSession = useCallback(async () => {
    try {
      const sessionId = `${SESSION_KEY_PREFIX}${Date.now()}`;
      const sessionData: SessionData = {
        sessionId,
        studentId,
        planId,
        dayIndex,
        activityType,
        progress: progress || {
          id: `${studentId}_${planId}_${dayIndex}_${activityType}`,
          activityType: activityType as ActivityProgress['activityType'],
          status: 'not_started',
          attempts: 0,
          responses: []
        },
        startedAt: progress?.startedAt ? progress.startedAt.toISOString() : new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        interruptedAt: sessionInterrupted ? new Date().toISOString() : undefined,
        totalTimeSpent: progress?.timeSpent || 0,
        activityCount: progress?.attempts || 0
      };
      localStorage.setItem(sessionId, JSON.stringify(sessionData));
      setSessionInterrupted(false); // Reset interrupted state
      setSessionRecovered(false); // Reset recovered state
      console.log('Session saved:', sessionId);
    } catch (err) {
      console.warn('Failed to save session:', err);
    }
  }, [studentId, planId, dayIndex, activityType, progress, sessionInterrupted]);

  const recoverSession = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem('currentSessionId');
      if (!sessionId) {
        console.warn('No session ID found for recovery.');
        return;
      }

      const sessionData = localStorage.getItem(sessionId);
      if (!sessionData) {
        console.warn('Session data not found for recovery:', sessionId);
        return;
      }

      const parsedSessionData = JSON.parse(sessionData);
      const recoveredProgress: ActivityProgress = {
        id: parsedSessionData.progress.id,
        activityType: parsedSessionData.activityType as ActivityProgress['activityType'],
        status: parsedSessionData.progress.status,
        startedAt: parsedSessionData.progress.startedAt ? new Date(parsedSessionData.progress.startedAt) : undefined,
        completedAt: parsedSessionData.progress.completedAt ? new Date(parsedSessionData.progress.completedAt) : undefined,
        timeSpent: parsedSessionData.progress.timeSpent,
        attempts: parsedSessionData.progress.attempts,
        responses: parsedSessionData.progress.responses?.map((r: any) => ({
          ...r,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
        })) || []
      };

      setProgress(recoveredProgress);
      setHasUnsavedChanges(false); // No unsaved changes in recovered session
      setRestoredFrom('session');
      setSessionRecovered(true);
      console.log('Session recovered:', sessionId);
    } catch (err) {
      console.warn('Failed to recover session:', err);
      setSessionRecovered(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    const sessionId = localStorage.getItem('currentSessionId');
    if (sessionId) {
      localStorage.removeItem(sessionId);
      localStorage.removeItem('currentSessionId');
      console.log('Session cleared:', sessionId);
    }
    setProgress(null);
    setHasUnsavedChanges(false);
    setRestoredFrom('none');
    setSessionInterrupted(false);
    setSessionRecovered(false);
  }, []);

  const getSessionInfo = useCallback((): SessionInfo => {
    const sessionId = localStorage.getItem('currentSessionId');
    if (!sessionId) {
      return {
        sessionId: 'N/A',
        startedAt: new Date(),
        lastActivity: new Date(),
        interruptedAt: undefined,
        recoveredAt: undefined,
        totalTimeSpent: 0,
        activityCount: 0,
        unsavedChanges: hasUnsavedChanges,
      };
    }

    const sessionData = localStorage.getItem(sessionId);
    if (!sessionData) {
      return {
        sessionId: sessionId,
        startedAt: new Date(),
        lastActivity: new Date(),
        interruptedAt: undefined,
        recoveredAt: undefined,
        totalTimeSpent: 0,
        activityCount: 0,
        unsavedChanges: false,
      };
    }

    const parsedSessionData = JSON.parse(sessionData);
    return {
      sessionId: parsedSessionData.sessionId,
      startedAt: parsedSessionData.startedAt ? new Date(parsedSessionData.startedAt) : new Date(),
      lastActivity: parsedSessionData.lastActivity ? new Date(parsedSessionData.lastActivity) : new Date(),
      interruptedAt: parsedSessionData.interruptedAt ? new Date(parsedSessionData.interruptedAt) : undefined,
      recoveredAt: parsedSessionData.recoveredAt ? new Date(parsedSessionData.recoveredAt) : undefined,
      totalTimeSpent: parsedSessionData.totalTimeSpent || 0,
      activityCount: parsedSessionData.activityCount || 0,
      unsavedChanges: parsedSessionData.unsavedChanges || false,
    };
  }, [hasUnsavedChanges]);

  // Session management event handlers
  useEffect(() => {
    // Create session ID if not exists
    if (!sessionIdRef.current) {
      sessionIdRef.current = `${SESSION_KEY_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('currentSessionId', sessionIdRef.current);
    }

    // Check for interrupted session on mount
    const checkForInterruptedSession = () => {
      const currentSessionId = localStorage.getItem('currentSessionId');
      if (currentSessionId && currentSessionId !== sessionIdRef.current) {
        const sessionData = localStorage.getItem(currentSessionId);
        if (sessionData) {
          try {
            const parsedSessionData = JSON.parse(sessionData);
            if (parsedSessionData.interruptedAt) {
              setSessionInterrupted(true);
              console.log('Interrupted session detected:', currentSessionId);
            }
          } catch (err) {
            console.warn('Failed to parse interrupted session data:', err);
          }
        }
      }
    };

    checkForInterruptedSession();

    // Beforeunload handler to save session before page unload
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || progress?.status === 'in_progress') {
        // Save session immediately
        saveSession();
        
        // Show warning to user
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    // Visibility change handler to save session when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && (hasUnsavedChanges || progress?.status === 'in_progress')) {
        saveSession();
      }
    };

    // Page focus handler to recover session when page becomes visible
    const handlePageFocus = () => {
      if (sessionInterrupted) {
        recoverSession();
      }
    };

    // Add event listeners
    beforeUnloadHandlerRef.current = handleBeforeUnload;
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handlePageFocus);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handlePageFocus);
    };
  }, [hasUnsavedChanges, progress?.status, sessionInterrupted, saveSession, recoverSession]);

  // Auto-save session periodically
  useEffect(() => {
    const autoSaveSession = () => {
      if (progress && (hasUnsavedChanges || progress.status === 'in_progress')) {
        saveSession();
      }
    };

    const intervalId = setInterval(autoSaveSession, 30000); // Auto-save every 30 seconds

    return () => clearInterval(intervalId);
  }, [progress, hasUnsavedChanges, saveSession]);

  return {
    // State
    progress,
    isLoading,
    error,
    isSaving,
    lastSaved,
    isRestoring,
    restoredFrom,
    
    // Actions
    updateProgress,
    saveResponse,
    completeActivity,
    resetProgress,
    syncWithServer,
    syncCrossDevice,
    restoreProgress,
    forceSync,
    
    // Answer persistence and review
    getAnswerHistory,
    getLastAnswer,
    getAnswersByType,
    exportAnswers,
    
    // Session management
    saveSession,
    recoverSession,
    clearSession,
    getSessionInfo,
    
    // Utilities
    getActivityState,
    hasUnsavedChanges,
    isOffline,
    canRestore: restoredFrom !== 'none',
    connectionQuality,
    pendingSyncCount,
    lastSyncAttempt,
    sessionInterrupted,
    sessionRecovered
  };
};
