import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { EnhancedActivitiesResponse, ActivityResponse, ActivityProgress } from '../../types/enhancedActivities';
import { useActivityProgress } from '../../hooks/useActivityProgress';
import { ActivityStepper } from './shared/ActivityStepper';
import WhoActivityEnhanced from './WhoActivityEnhanced';
import WhereActivityEnhanced from './WhereActivityEnhanced';
import SequenceActivityEnhanced from './SequenceActivityEnhanced';
import MainIdeaActivityEnhanced from './MainIdeaActivityEnhanced';
import VocabularyActivityEnhanced from './VocabularyActivityEnhanced';
import PredictActivityEnhanced from './PredictActivityEnhanced';

interface ActivityStep {
  id: string;
  type: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  timeSpent?: number;
  attempts?: number;
  score?: number;
  lastAttempt?: Date;
}

interface EnhancedActivityPaneProps {
  data: EnhancedActivitiesResponse;
  onCompleteActivity?: (activityType: string, answers: any[], responses?: ActivityResponse[]) => void;
  onProgressUpdate?: (activityType: string, status: 'in_progress' | 'completed' | 'not_started', timeSpent?: number) => void;
  onJumpToContext?: (anchorId: string) => void;
  className?: string;
  studentId?: string | number;
}

const EnhancedActivityPane: React.FC<EnhancedActivityPaneProps> = ({
  data,
  onCompleteActivity,
  onJumpToContext,
  className = '',
  studentId
}) => {
  const activities = data.activities;
  const progress = data.progress;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [activityProgress, setActivityProgress] = useState<Record<string, ActivityProgress>>({});
  const rehydratedOnceRef = useRef(false);

  // Generate storage key for current activity index
  const currentIndexStorageKey = `current-activity-index:${data.planId}:${data.dayIndex}`;

  // Initialize progress from the data
  useEffect(() => {
    if (data.progress) {
      setActivityProgress(data.progress);
    }
  }, [data.progress]);

  // Restore current activity index from localStorage on mount
  useEffect(() => {
    try {
      const savedIndex = localStorage.getItem(currentIndexStorageKey);
      if (savedIndex !== null) {
        const index = parseInt(savedIndex, 10);
        if (!isNaN(index) && index >= 0) {
          setCurrentIndex(index);
        }
      }
    } catch (error) {
      console.warn('Failed to restore current activity index from localStorage:', error);
    }
  }, [currentIndexStorageKey]);

  // Save current activity index to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(currentIndexStorageKey, currentIndex.toString());
    } catch (error) {
      console.warn('Failed to save current activity index to localStorage:', error);
    }
  }, [currentIndex, currentIndexStorageKey]);

  // Merge server progress for stepper rehydration on mount
  useEffect(() => {
    let cancelled = false;
    const rehydrate = async () => {
      if (rehydratedOnceRef.current) return;
      try {
        // Use legacy route first to avoid by-plan 404 noise; by-plan as fallback
        let json: any;
        try {
          const { data: full } = await api.get(`/enhanced-activities/${data.planId}/${data.dayIndex}`);
          json = full;
        } catch {
          const { data: full } = await api.get(`/enhanced-activities/by-plan/${data.planId}/${data.dayIndex}`);
          json = full;
        }
        if (cancelled) return;
        const serverMap = json?.progress || {};
        // Conservative merge: never downgrade local status; prefer higher status
        const statusRank: Record<string, number> = { not_started: 0, in_progress: 1, completed: 2 };
        setActivityProgress(prev => {
          const merged: Record<string, ActivityProgress> = { ...prev };
          for (const key of Object.keys(serverMap)) {
            const server = serverMap[key] as ActivityProgress;
            const local = prev[key];
            if (!local) {
              merged[key] = server;
              continue;
            }
            const localRank = statusRank[local.status] ?? 0;
            const serverRank = statusRank[(server as any).status] ?? 0;
            merged[key] = serverRank > localRank ? { ...local, ...server } : local;
          }
          rehydratedOnceRef.current = true;
          return merged;
        });
      } catch {
        try {
          // Final attempt with alternate order
          let json: any;
          try {
            const { data: full } = await api.get(`/enhanced-activities/${data.planId}/${data.dayIndex}`);
            json = full;
          } catch {
            const { data: full } = await api.get(`/enhanced-activities/by-plan/${data.planId}/${data.dayIndex}`);
            json = full;
          }
          if (cancelled) return;
          const serverMap = json?.progress || {};
          const statusRank: Record<string, number> = { not_started: 0, in_progress: 1, completed: 2 };
          setActivityProgress(prev => {
            const merged: Record<string, ActivityProgress> = { ...prev };
            for (const key of Object.keys(serverMap)) {
              const server = serverMap[key] as ActivityProgress;
              const local = prev[key];
              if (!local) {
                merged[key] = server;
                continue;
              }
              const localRank = statusRank[local.status] ?? 0;
              const serverRank = statusRank[(server as any).status] ?? 0;
              merged[key] = serverRank > localRank ? { ...local, ...server } : local;
            }
            rehydratedOnceRef.current = true;
            return merged;
          });
        } catch {}
      }
    };
    if (studentId) rehydrate();
    return () => { cancelled = true; };
  }, [studentId, data.planId, data.dayIndex]);

  const steps: ActivityStep[] = useMemo(() => {
    const baseSteps = [
      { id: 'who', type: 'who', title: 'Who', description: 'Identify the main subject of the story.' },
      { id: 'where', type: 'where', title: 'Where', description: 'Determine the location of the story.' },
      { id: 'sequence', type: 'sequence', title: 'Sequence', description: 'Understand the sequence of events.' },
      { id: 'main-idea', type: 'main-idea', title: 'Main Idea', description: 'Identify the central message or theme.' },
      { id: 'vocabulary', type: 'vocabulary', title: 'Vocabulary', description: 'Learn key vocabulary words from the story.' },
      { id: 'predict', type: 'predict', title: 'Predict', description: 'Make predictions about the story.' }
    ];

    return baseSteps.map((baseStep, index) => ({
      ...baseStep,
      isCompleted: activityProgress[baseStep.id]?.status === 'completed',
      isCurrent: index === currentIndex,
      isLocked: index > currentIndex
    }));
  }, [activities, activityProgress, currentIndex]);

  const onStepClick = useCallback((index: number) => setCurrentIndex(index), []);

  const handleNext = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, steps.length]);

  const step = steps[currentIndex];

  // optional cross-device sync wiring
  const { updateProgress, completeActivity, syncCrossDevice, isSaving, isOffline, isRestoring, restoredFrom, canRestore, sessionInterrupted, sessionRecovered, saveSession, recoverSession, getSessionInfo } = useActivityProgress({
    studentId: String(studentId || ''),
    planId: data.planId,
    dayIndex: data.dayIndex,
    activityType: step?.type || 'who',
    autoSave: true,
    offlineFallback: true
  });

  const handleComplete = useCallback((activityType: string, answers: any[], responses?: ActivityResponse[]) => {
    if (studentId && responses && Array.isArray(responses)) {
      const timeSpent = responses.reduce((acc, r) => acc + (r.timeSpent || 0), 0);
      completeActivity(responses, timeSpent)
        .then(async () => {
          // Read-after-write confirmation: verify server reflects completion
          try {
            for (let i = 0; i < 3; i++) {
              let confirmJson: any;
              try {
                const { data: resp } = await api.get(`/enhanced-activities/${data.planId}/${data.dayIndex}`);
                confirmJson = resp;
              } catch {
                const { data: resp } = await api.get(`/enhanced-activities/by-plan/${data.planId}/${data.dayIndex}`);
                confirmJson = resp;
              }
              const serverMap = confirmJson?.progress || {};
              if (serverMap?.[activityType]?.status === 'completed') break;
              await new Promise(r => setTimeout(r, 250 * (i + 1)));
            }
          } catch {}
        })
        .catch(() => {});
    }
    
    // Update local progress state to show completion in stepper
    setActivityProgress(prev => ({
      ...prev,
      [activityType]: {
        ...prev[activityType],
        status: 'completed',
        completedAt: new Date()
      }
    }));
    
    onCompleteActivity?.(activityType, answers, responses);
  }, [onCompleteActivity, completeActivity, studentId, data.planId, data.dayIndex]);

  // Enhanced progress update handler that automatically saves progress
  const handleProgressUpdate = useCallback((activityType: string, status: 'in_progress' | 'completed' | 'not_started', timeSpent?: number) => {
    if (studentId) {
      updateProgress(status, timeSpent).catch(() => {});
    }
  }, [studentId, updateProgress]);

  useEffect(() => {
    if (!studentId || !step) return;
    // Automatically mark activity as in progress when it becomes active
    updateProgress('in_progress').catch(() => {});
  }, [studentId, step?.type, updateProgress, step]);

  useEffect(() => {
    if (!studentId) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncCrossDevice().catch(() => {});
      }
    };
    const onFocus = () => {
      syncCrossDevice().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [studentId, syncCrossDevice]);

  // Get restoration status message
  const getRestorationMessage = () => {
    if (isRestoring) {
      return 'Restoring your progress...';
    }
    if (restoredFrom === 'server') {
      return 'Progress restored from server';
    }
    if (restoredFrom === 'local') {
      return 'Progress restored from local storage';
    }
    if (restoredFrom === 'session') {
      return 'Progress restored from previous session';
    }
    return '';
  };

  const restorationMessage = getRestorationMessage();

  // Handle session recovery
  const handleSessionRecovery = useCallback(async () => {
    await recoverSession();
  }, [recoverSession]);

  // Get session information
  const sessionInfo = getSessionInfo();

  const renderCurrentActivity = () => {
    if (!step) return null;
    switch (step.type) {
      case 'who':
        return (
          <WhoActivityEnhanced
            content={{ type: 'who', content: activities.who! }}
            onCompleteActivity={handleComplete}
            onProgressUpdate={handleProgressUpdate}
            onNext={handleNext}
            studentId={String(studentId)}
            planId={data.planId}
            dayIndex={data.dayIndex}
          />
        );
      case 'where':
        return (
          <WhereActivityEnhanced
            content={{ type: 'where', content: activities.where! }}
            studentId={String(studentId)}
            planId={data.planId}
            dayIndex={data.dayIndex}
            onCompleteActivity={handleComplete}
            onProgressUpdate={handleProgressUpdate}
            onNext={handleNext}
          />
        );
      case 'sequence':
        return (
          <SequenceActivityEnhanced
            content={{ type: 'sequence', content: activities.sequence! }}
            progress={progress.sequence}
            onComplete={handleComplete}
            onProgressUpdate={handleProgressUpdate}
            onJumpToContext={onJumpToContext}
            onNext={handleNext}
            studentId={String(studentId)}
            planId={data.planId}
            dayIndex={data.dayIndex}
          />
        );
      case 'main-idea':
        return (
          <MainIdeaActivityEnhanced
            content={{ type: 'main-idea', content: activities['main-idea']! }}
            progress={progress['main-idea']}
            onComplete={handleComplete}
            onProgressUpdate={handleProgressUpdate}
            onJumpToContext={onJumpToContext}
          />
        );
      case 'vocabulary':
        return (
          <VocabularyActivityEnhanced
            content={{ type: 'vocabulary', content: activities.vocabulary! }}
            progress={progress.vocabulary}
            onComplete={handleComplete}
            onProgressUpdate={handleProgressUpdate}
            onJumpToContext={onJumpToContext}
          />
        );
      case 'predict':
        return (
          <PredictActivityEnhanced
            content={{ type: 'predict', content: activities.predict! }}
            progress={progress.predict}
            onComplete={handleComplete}
            onProgressUpdate={handleProgressUpdate}
            onJumpToContext={onJumpToContext}
            planId={data.planId}
            dayIndex={data.dayIndex}
          />
        );
      default:
        return null;
    }
  };

  // After rehydration, determine which activity to show
  useEffect(() => {
    if (!steps || steps.length === 0) return;
    
    // Check if all activities are completed
    const allCompleted = steps.every(s => s.isCompleted);
    if (allCompleted) {
      // If all activities are completed, go to the last activity and clear localStorage
      setCurrentIndex(steps.length - 1);
      try {
        localStorage.removeItem(currentIndexStorageKey);
      } catch (error) {
        console.warn('Failed to clear current activity index from localStorage:', error);
      }
      return;
    }
    
    // If current activity is completed, find the next incomplete activity
    if (steps[currentIndex]?.isCompleted) {
      const nextIncompleteIndex = steps.findIndex((s, index) => index >= currentIndex && !s.isCompleted);
      if (nextIncompleteIndex >= 0) {
        setCurrentIndex(nextIncompleteIndex);
      } else {
        // If all activities after current are completed, go to the last activity
        setCurrentIndex(steps.length - 1);
      }
    }
    // If no saved activity or current activity is not completed, stay on current
    // (which was restored from localStorage or defaults to 0)
  }, [steps, currentIndex, currentIndexStorageKey]);

  return (
    <div className={`w-full h-full overflow-auto ${className}`}>
      <div className="px-4 py-6 max-w-4xl mx-auto">
        {/* Activity Steps - Above the container */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activities</h2>
          <ActivityStepper 
            steps={steps} 
            currentIndex={currentIndex} 
            onStepClick={onStepClick}
            showProgress={false} // Remove progress bar
          />
        </div>

        {/* Activity Container */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          {/* Current Activity Content */}
          {renderCurrentActivity()}
          
          {isLoading && (
            <div role="status" aria-live="polite" className="px-4 py-3 rounded bg-gray-50 border border-gray-200 text-gray-700">
              Loading activity...
            </div>
          )}
          {error && (
            <div role="alert" className="px-4 py-3 rounded bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedActivityPane;


