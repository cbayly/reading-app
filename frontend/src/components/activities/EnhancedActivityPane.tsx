import React, { useState, useMemo, useCallback, useEffect } from 'react';
import ActivityStepper, { ActivityStep } from './shared/ActivityStepper';
import { EnhancedActivitiesResponse, ActivityResponse } from '../../types/enhancedActivities';
import { useActivityProgress } from '../../hooks/useActivityProgress';
import WhoActivityEnhanced from './WhoActivityEnhanced';
import WhereActivityEnhanced from './WhereActivityEnhanced';
import SequenceActivityEnhanced from './SequenceActivityEnhanced';
import MainIdeaActivityEnhanced from './MainIdeaActivityEnhanced';
import VocabularyActivityEnhanced from './VocabularyActivityEnhanced';
import PredictActivityEnhanced from './PredictActivityEnhanced';

interface EnhancedActivityPaneProps {
  data: EnhancedActivitiesResponse;
  onCompleteActivity?: (activityType: string, answers: any[], responses?: ActivityResponse[]) => void;
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

  const steps: ActivityStep[] = useMemo(() => {
    const list: ActivityStep[] = [];
    if (activities.who) list.push({ id: 'who', type: 'who', label: 'Who', completed: progress.who?.status === 'completed' });
    if (activities.where) list.push({ id: 'where', type: 'where', label: 'Where', completed: progress.where?.status === 'completed' });
    if (activities.sequence) list.push({ id: 'sequence', type: 'sequence', label: 'Sequence', completed: progress.sequence?.status === 'completed' });
    if (activities['main-idea']) list.push({ id: 'main-idea', type: 'main-idea', label: 'Main Idea', completed: progress['main-idea']?.status === 'completed' });
    if (activities.vocabulary) list.push({ id: 'vocabulary', type: 'vocabulary', label: 'Vocabulary', completed: progress.vocabulary?.status === 'completed' });
    if (activities.predict) list.push({ id: 'predict', type: 'predict', label: 'Predict', completed: progress.predict?.status === 'completed' });
    return list;
  }, [activities, progress]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const onStepClick = useCallback((index: number) => setCurrentIndex(index), []);

  const step = steps[currentIndex];

  // optional cross-device sync wiring
  const { updateProgress, completeActivity, syncCrossDevice, isSaving, isOffline, isRestoring, restoredFrom, canRestore } = useActivityProgress({
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
      completeActivity(responses, timeSpent).catch(() => {});
    }
    onCompleteActivity?.(activityType, answers, responses);
  }, [onCompleteActivity, completeActivity, studentId]);

  // Enhanced progress update handler that automatically saves progress
  const handleProgressUpdate = useCallback((activityType: string, status: 'in_progress' | 'completed', timeSpent?: number) => {
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
    return '';
  };

  const restorationMessage = getRestorationMessage();

  const renderActivity = () => {
    if (!step) return null;
    switch (step.type) {
      case 'who':
        return (
          <WhoActivityEnhanced
            content={{ type: 'who', content: activities.who! }}
            progress={progress.who}
            onComplete={handleComplete}
            onProgressUpdate={handleProgressUpdate}
            onJumpToContext={onJumpToContext}
          />
        );
      case 'where':
        return (
          <WhereActivityEnhanced
            content={{ type: 'where', content: activities.where! }}
            progress={progress.where}
            onComplete={handleComplete}
            onProgressUpdate={handleProgressUpdate}
            onJumpToContext={onJumpToContext}
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <ActivityStepper steps={steps} currentIndex={currentIndex} onStepClick={onStepClick} />
      {studentId && (
        <div className="text-xs text-gray-600 space-y-1">
          {isOffline ? 'Offline - changes will sync when back online' : (isSaving ? 'Syncing…' : '')}
          {restorationMessage && (
            <div className={`text-sm px-3 py-2 rounded-lg border ${
              isRestoring 
                ? 'bg-blue-50 border-blue-200 text-blue-800' 
                : restoredFrom === 'server'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}>
              <div className="flex items-center">
                {isRestoring ? (
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                ) : restoredFrom === 'server' ? (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                )}
                {restorationMessage}
              </div>
            </div>
          )}
        </div>
      )}
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
      <div>{renderActivity()}</div>
    </div>
  );
};

export default EnhancedActivityPane;


