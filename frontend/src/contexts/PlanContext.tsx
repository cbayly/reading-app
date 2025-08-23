import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Plan, Day, Activity } from '@/types/weekly-plan';

// State interface
interface PlanState {
  currentPlan: Plan | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

// Action types
type PlanAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_PLAN'; payload: Plan }
  | { type: 'UPDATE_DAY'; payload: { dayIndex: number; day: Day } }
  | { type: 'UPDATE_ACTIVITY'; payload: { dayIndex: number; activityId: string; response: any } }
  | { type: 'CLEAR_PLAN' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: PlanState = {
  currentPlan: null,
  loading: false,
  error: null,
  saving: false,
};

// Reducer function
function planReducer(state: PlanState, action: PlanAction): PlanState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error, // Clear error when loading starts
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
        saving: false,
      };

    case 'SET_SAVING':
      return {
        ...state,
        saving: action.payload,
        error: action.payload ? null : state.error, // Clear error when saving starts
      };

    case 'SET_PLAN':
      return {
        ...state,
        currentPlan: action.payload,
        loading: false,
        error: null,
      };

    case 'UPDATE_DAY':
      if (!state.currentPlan) return state;
      
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          days: state.currentPlan.days.map(day =>
            day.dayIndex === action.payload.dayIndex ? action.payload.day : day
          ),
        },
      };

    case 'UPDATE_ACTIVITY':
      if (!state.currentPlan) return state;
      
      return {
        ...state,
        currentPlan: {
          ...state.currentPlan,
          days: state.currentPlan.days.map(day => {
            if (day.dayIndex === action.payload.dayIndex) {
              return {
                ...day,
                activities: day.activities.map(activity =>
                  activity.id.toString() === action.payload.activityId
                    ? { ...activity, response: action.payload.response }
                    : activity
                ),
              };
            }
            return day;
          }),
        },
      };

    case 'CLEAR_PLAN':
      return {
        ...state,
        currentPlan: null,
        error: null,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context interface
interface PlanContextType {
  state: PlanState;
  dispatch: React.Dispatch<PlanAction>;
  // Convenience methods
  setPlan: (plan: Plan) => void;
  updateDay: (dayIndex: number, day: Day) => void;
  updateActivity: (dayIndex: number, activityId: string, response: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSaving: (saving: boolean) => void;
  clearPlan: () => void;
  resetState: () => void;
  // Computed values
  getDay: (dayIndex: number) => Day | undefined;
  getActivity: (dayIndex: number, activityId: string) => Activity | undefined;
  isDayComplete: (dayIndex: number) => boolean;
  isPlanComplete: () => boolean;
  getCompletedDaysCount: () => number;
}

// Create context
const PlanContext = createContext<PlanContextType | undefined>(undefined);

// Provider component
interface PlanProviderProps {
  children: ReactNode;
}

export function PlanProvider({ children }: PlanProviderProps) {
  const [state, dispatch] = useReducer(planReducer, initialState);

  // Convenience methods
  const setPlan = (plan: Plan) => {
    dispatch({ type: 'SET_PLAN', payload: plan });
  };

  const updateDay = (dayIndex: number, day: Day) => {
    dispatch({ type: 'UPDATE_DAY', payload: { dayIndex, day } });
  };

  const updateActivity = (dayIndex: number, activityId: string, response: any) => {
    dispatch({ type: 'UPDATE_ACTIVITY', payload: { dayIndex, activityId, response } });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const setSaving = (saving: boolean) => {
    dispatch({ type: 'SET_SAVING', payload: saving });
  };

  const clearPlan = () => {
    dispatch({ type: 'CLEAR_PLAN' });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  // Computed values
  const getDay = (dayIndex: number): Day | undefined => {
    if (!state.currentPlan) return undefined;
    return state.currentPlan.days.find(day => day.dayIndex === dayIndex);
  };

  const getActivity = (dayIndex: number, activityId: string): Activity | undefined => {
    const day = getDay(dayIndex);
    if (!day) return undefined;
    return day.activities.find(activity => activity.id.toString() === activityId);
  };

  const isDayComplete = (dayIndex: number): boolean => {
    const day = getDay(dayIndex);
    return day?.state === 'complete';
  };

  const isPlanComplete = (): boolean => {
    if (!state.currentPlan) return false;
    return state.currentPlan.days.every(day => day.state === 'complete');
  };

  const getCompletedDaysCount = (): number => {
    if (!state.currentPlan) return 0;
    return state.currentPlan.days.filter(day => day.state === 'complete').length;
  };

  const contextValue: PlanContextType = {
    state,
    dispatch,
    setPlan,
    updateDay,
    updateActivity,
    setLoading,
    setError,
    setSaving,
    clearPlan,
    resetState,
    getDay,
    getActivity,
    isDayComplete,
    isPlanComplete,
    getCompletedDaysCount,
  };

  return (
    <PlanContext.Provider value={contextValue}>
      {children}
    </PlanContext.Provider>
  );
}

// Custom hook to use the plan context
export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}

// Custom hook for optimistic updates
export function useOptimisticPlan() {
  const { state, updateDay, updateActivity } = usePlan();

  const optimisticUpdateDay = (dayIndex: number, updates: Partial<Day>) => {
    const currentDay = state.currentPlan?.days.find(day => day.dayIndex === dayIndex);
    if (currentDay) {
      const updatedDay = { ...currentDay, ...updates };
      updateDay(dayIndex, updatedDay);
    }
  };

  const optimisticUpdateActivity = (dayIndex: number, activityId: string, response: any) => {
    updateActivity(dayIndex, activityId, response);
  };

  return {
    optimisticUpdateDay,
    optimisticUpdateActivity,
  };
}

// Custom hook for plan operations
export function usePlanOperations() {
  const { state, setPlan, setLoading, setError, setSaving } = usePlan();

  const fetchPlan = async (planId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/plans/${planId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch plan: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPlan(data.plan);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch plan';
      setError(errorMessage);
    }
  };

  const completeDay = async (planId: number, dayIndex: number, activities: any[]) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/plans/${planId}/days/${dayIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activities }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to complete day: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPlan(data.plan);
      
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete day';
      setError(errorMessage);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const completePlan = async (planId: number) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/plans/${planId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to complete plan: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPlan(data.plan);
      
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete plan';
      setError(errorMessage);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    fetchPlan,
    completeDay,
    completePlan,
    currentPlan: state.currentPlan,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
  };
}
