import { useState, useEffect, useCallback } from 'react';
import { Activity, ActivityAnswers } from '@/types/plan3';

export interface DayCompletionState {
  isCompleted: boolean;
  activitiesCompleted: number;
  totalActivities: number;
  completionProgress: number;
  canComplete: boolean;
  isCompleting: boolean;
  error: string | null;
}

export interface UseDayCompletionOptions {
  activities: Activity[];
  answers: ActivityAnswers;
  onComplete?: (dayIndex: number) => Promise<void>;
  onError?: (error: Error) => void;
}

export function useDayCompletion(
  dayIndex: number,
  options: UseDayCompletionOptions
): DayCompletionState & {
  completeDay: () => Promise<void>;
  resetCompletion: () => void;
} {
  const { activities, answers, onComplete, onError } = options;
  
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if all activities are completed
  const checkActivityCompletion = useCallback((activity: Activity): boolean => {
    switch (activity.type) {
      case 'who':
        return Array.isArray(answers.who) && answers.who.length > 0;
      case 'where':
        return typeof answers.where === 'string' && answers.where.trim().length > 0;
      case 'sequence':
        return Array.isArray(answers.sequence) && answers.sequence.length > 0;
      case 'main_idea':
        return typeof answers.main_idea === 'string' && answers.main_idea.trim().length > 0;
      case 'predict':
        return typeof answers.predict === 'string' && answers.predict.trim().length > 0;
      default:
        return false;
    }
  }, [answers]);

  // Calculate completion state
  const calculateCompletion = useCallback(() => {
    const totalActivities = activities.length;
    const activitiesCompleted = activities.filter(checkActivityCompletion).length;
    const completionProgress = totalActivities > 0 ? (activitiesCompleted / totalActivities) * 100 : 0;
    const canComplete = activitiesCompleted === totalActivities && totalActivities > 0;

    return {
      activitiesCompleted,
      totalActivities,
      completionProgress,
      canComplete
    };
  }, [activities, checkActivityCompletion]);

  const { activitiesCompleted, totalActivities, completionProgress, canComplete } = calculateCompletion();

  // Complete day function
  const completeDay = useCallback(async () => {
    if (!canComplete || isCompleting) {
      return;
    }

    try {
      setIsCompleting(true);
      setError(null);

      if (onComplete) {
        await onComplete(dayIndex);
      }

      setIsCompleted(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete day';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsCompleting(false);
    }
  }, [canComplete, isCompleting, onComplete, onError, dayIndex]);

  // Reset completion
  const resetCompletion = useCallback(() => {
    setIsCompleted(false);
    setIsCompleting(false);
    setError(null);
  }, []);

  // Update completion state when activities or answers change
  useEffect(() => {
    calculateCompletion();
  }, [calculateCompletion]);

  return {
    isCompleted,
    activitiesCompleted,
    totalActivities,
    completionProgress,
    canComplete,
    isCompleting,
    error,
    completeDay,
    resetCompletion
  };
}
