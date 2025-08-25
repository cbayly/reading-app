'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlanById, getPlanByStudentId, updateDayActivities } from '@/lib/api';
import { Plan, Day, Activity } from '@/types/weekly-plan';
import ReadingPanel from '@/components/ReadingPanel';
import ActivitiesPanel from '@/components/ActivitiesPanel';
import CompletionCelebration from '@/components/CompletionCelebration';

export default function DayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [currentDay, setCurrentDay] = useState<Day | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const planId = Number(params.id);
  const dayIndex = Number(params.index);

  // Fetch plan data
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        // First try to get the plan by ID (in case it's a plan ID)
        let planData: any;
        try {
          planData = await getPlanById(planId);
        } catch (planError: any) {
          // If plan not found by ID, try to get it by student ID
          if (planError?.response?.status === 404) {
            console.log('Plan not found by ID, trying to get by student ID...');
            const studentPlanResponse = await getPlanByStudentId(planId);
            if (!studentPlanResponse) {
              throw new Error('No plan found for this student');
            }
            planData = studentPlanResponse.plan;
          } else {
            throw planError;
          }
        }
        
        setPlan(planData);
        
        // Find the current day
        const day = planData.days.find((d: any) => d.dayIndex === dayIndex);
        if (!day) {
          setError(`Day ${dayIndex} not found`);
          return;
        }
        
        console.log('Fetched day data:', {
          dayIndex,
          dayState: day.state,
          dayCompletedAt: day.completedAt,
          activities: day.activities?.map((a: any) => ({
            id: a.id,
            type: a.type,
            hasResponse: !!a.response,
            responseCompleted: a.response?.completed,
            isValid: a.isValid
          }))
        });
        
        setCurrentDay(day);
      } catch (err: any) {
        console.error('Error fetching plan:', err);
        if (err?.response?.data?.message) {
          setError(err.response.data.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load day details');
        }
      } finally {
        setLoading(false);
      }
    };

    if (planId && dayIndex) {
      fetchPlan();
    }
  }, [planId, dayIndex]);

  const handleActivityUpdate = useCallback((activityId: string, response: any) => {
    if (!currentDay) return;

    // Update the activity response in local state
    setCurrentDay(prevDay => {
      if (!prevDay) return prevDay;
      return {
        ...prevDay,
        activities: prevDay.activities.map(activity =>
          activity.id.toString() === activityId
            ? { ...activity, response }
            : activity
        )
      };
    });
  }, [currentDay]);

  const handleCompleteDay = useCallback(async () => {
    if (!currentDay || !plan) return;

    console.log('Starting day completion process...', {
      planId: plan.id,
      dayIndex,
      currentDay,
      activities: currentDay.activities
    });

    // Validate that all required activities are completed
    const incompleteActivities = currentDay.activities.filter(activity => {
      // For multi-select activities, check if minimum required are completed
      if (activity.type === 'multi-select' && activity.data.minRequired) {
        const completedCount = activity.response?.selectedActivities?.length || 0;
        return completedCount < activity.data.minRequired;
      }
      
      // For other activities, check if they have a response
      if (!activity.response) return true;
      
      // Check if response is marked as completed
      if (activity.response.completed !== true) return true;
      
      return false;
    });

    console.log('Activity validation results:', {
      totalActivities: currentDay.activities.length,
      incompleteActivitiesCount: incompleteActivities.length,
      incompleteActivities
    });

    if (incompleteActivities.length > 0) {
      setError(`Please complete all required activities before marking this day as complete.`);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare activities with responses
      const activitiesWithResponses = currentDay.activities.map(activity => ({
        id: parseInt(activity.id.toString()),
        response: activity.response
      }));

      console.log('Sending activities to API:', activitiesWithResponses);

      const result = await updateDayActivities(plan.id, dayIndex, activitiesWithResponses);
      
      console.log('API response received:', result);
      
      // Update the plan with the new data
      setPlan(result.plan);
      
      // Find the updated day
      const updatedDay = result.plan.days.find(d => d.dayIndex === dayIndex);
      setCurrentDay(updatedDay || null);

      console.log('Updated day state:', updatedDay);

      // Show celebration if day was completed
      if (result.dayComplete) {
        console.log('Day completed successfully! Showing celebration...');
        setShowCelebration(true);
      } else {
        console.log('Day not marked as complete. API response:', result);
      }

    } catch (err: any) {
      console.error('Error completing day:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // If the day is already complete, refresh the data to show correct state
      if (err?.response?.data?.error === 'DAY_ALREADY_COMPLETE') {
        console.log('Day is already complete, refreshing data...');
        // Refresh the plan data to get the current state
        try {
          let planData: any;
          try {
            planData = await getPlanById(planId);
          } catch (planError: any) {
            if (planError?.response?.status === 404) {
              const studentPlanResponse = await getPlanByStudentId(planId);
              if (!studentPlanResponse) {
                throw new Error('No plan found for this student');
              }
              planData = studentPlanResponse.plan;
            } else {
              throw planError;
            }
          }
          
          setPlan(planData);
          
          // Find the updated day
          const updatedDay = planData.days.find((d: any) => d.dayIndex === dayIndex);
          if (updatedDay) {
            setCurrentDay(updatedDay);
            console.log('Day data refreshed, current state:', updatedDay.state);
          }
        } catch (refreshError) {
          console.error('Error refreshing day data:', refreshError);
        }
      }
      
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to complete day activities');
      }
    } finally {
      setSaving(false);
    }
  }, [currentDay, plan, dayIndex]);

  const handleBackToPlan = () => {
    router.push(`/plan/${planId}`);
  };

  const handleNextDay = () => {
    if (dayIndex < 5) {
      router.push(`/plan/${planId}/day/${dayIndex + 1}`);
    }
  };

  const handlePreviousDay = () => {
    if (dayIndex > 1) {
      router.push(`/plan/${planId}/day/${dayIndex - 1}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading day {dayIndex}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="p-4 border rounded-lg bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200 mb-4" role="alert">
            <div className="flex items-start">
              <svg className="h-5 w-5 mt-0.5 me-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.336-.213 3.007-1.742 3.007H3.48c-1.53 0-2.492-1.67-1.743-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd"/></svg>
              <div>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={handleBackToPlan}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!plan || !currentDay) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Day not found</p>
          <button
            onClick={handleBackToPlan}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Plan
          </button>
        </div>
      </div>
    );
  }

  // Check if day is locked
  if (currentDay.state === 'locked') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Day {dayIndex} is Locked</h2>
          <p className="text-gray-600 mb-4">
            Complete previous days to unlock this day.
          </p>
          <button
            onClick={handleBackToPlan}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Day {dayIndex}: {getDayTitle(dayIndex)}
              </h1>
              <p className="text-gray-600">
                {plan.student?.name}&apos;s {plan.theme} Adventure
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBackToPlan}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Back to Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <button
              onClick={handlePreviousDay}
              disabled={dayIndex <= 1}
              className={`px-3 py-1 rounded text-sm font-medium ${
                dayIndex <= 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              ← Day {dayIndex - 1}
            </button>
            
            <span className="text-sm text-gray-500">
              Day {dayIndex} of 5
            </span>
            
            <button
              onClick={handleNextDay}
              disabled={dayIndex >= 5}
              className={`px-3 py-1 rounded text-sm font-medium ${
                dayIndex >= 5
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              Day {dayIndex + 1} →
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reading Panel */}
          <div>
            <ReadingPanel 
              day={currentDay}
              story={plan.story}
              isReadOnly={currentDay.state === 'complete'}
            />
          </div>
          
          {/* Activities Panel */}
          <div>
            <ActivitiesPanel
              day={currentDay}
              onActivityUpdate={handleActivityUpdate}
              onCompleteDay={handleCompleteDay}
              isReadOnly={currentDay.state === 'complete'}
              isLoading={saving}
              error={error || undefined}
            />
          </div>
        </div>
      </div>

      {/* Completion Celebration */}
      <CompletionCelebration
        isVisible={showCelebration}
        dayNumber={dayIndex}
        activityType="Day"
        onClose={() => setShowCelebration(false)}
        onContinue={handleBackToPlan}
      />
    </div>
  );
}

// Helper function to get day title
function getDayTitle(dayIndex: number): string {
  const titles = [
    'Vocabulary Matching',
    'Comprehension Matching',
    'Reflection',
    'Writing',
    'Creative Activities'
  ];
  return titles[dayIndex - 1] || `Day ${dayIndex}`;
}
