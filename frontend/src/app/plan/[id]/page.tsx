'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlan, saveActivityResponse, generatePlan, generateDayActivity } from '@/lib/api';
import WeeklyPlanView from '@/components/WeeklyPlanView';
import CompletionCelebration from '@/components/CompletionCelebration';
import { WeeklyPlan, DailyActivity, Chapter } from '@/types/weekly-plan';

export default function WeeklyPlanPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingActivity, setSavingActivity] = useState<number | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planNotFound, setPlanNotFound] = useState(false);
  const [generatingActivity, setGeneratingActivity] = useState(false);
  const [generatingDay, setGeneratingDay] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedActivity, setCompletedActivity] = useState<{ dayNumber: number; activityType: string } | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const planData = await getPlan(Number(params.id));
        setPlan(planData);
        setPlanNotFound(false);
        
        // Auto-trigger Day 1 activity generation if no activities exist
        if (planData && planData.dailyActivities.length === 0) {
          console.log('Auto-triggering Day 1 activity generation');
          setTimeout(() => {
            handleGenerateActivity(1);
          }, 1000); // Small delay to ensure plan is fully loaded
        }
      } catch (err: any) {
        console.log('Error fetching plan:', err);
        console.log('Error response:', err?.response);
        console.log('Error status:', err?.response?.status);
        
        if (err?.response?.status === 404) {
          setPlanNotFound(true);
          setError('No weekly plan found for this student. Would you like to generate one?');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load weekly plan');
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPlan();
    }
  }, [params.id]);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleGeneratePlan = async () => {
    try {
      setGeneratingPlan(true);
      setError(null);
      console.log('Generating plan for student:', params.id);
      const result = await generatePlan(Number(params.id));
      console.log('Plan generation result:', result);
      setPlan(result.plan);
      setPlanNotFound(false);
    } catch (err: any) {
      console.error('Error generating plan:', err);
      console.log('Generate plan error response:', err?.response);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate weekly plan');
      }
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleActivityResponse = async (activityId: number, response: any) => {
    try {
      setSavingActivity(activityId);
      await saveActivityResponse(activityId, response);
      
      // Update the plan state with the new response
      if (plan) {
        setPlan(prevPlan => {
          if (!prevPlan) return prevPlan;
          return {
            ...prevPlan,
            dailyActivities: prevPlan.dailyActivities.map(activity =>
              activity.id === activityId
                ? { ...activity, studentResponse: response }
                : activity
            )
          };
        });
      }
    } catch (err) {
      console.error('Error saving activity response:', err);
      setError('Failed to save your response. Please try again.');
    } finally {
      setSavingActivity(null);
    }
  };

  const handleGenerateActivity = async (dayOfWeek: number) => {
    if (!plan) return;
    
    try {
      setGeneratingActivity(true);
      setGeneratingDay(dayOfWeek);
      setGenerationError(null);
      
      // Determine activity type based on day
      const activityTypes = ['Comprehension', 'Vocabulary', 'Creative', 'Game', 'Writing', 'Review', 'Reflection'];
      const activityType = activityTypes[dayOfWeek - 1] || 'Comprehension';
      
      const result = await generateDayActivity(plan.id, dayOfWeek, activityType);
      
      // Update the plan with the new activity
      setPlan(prevPlan => {
        if (!prevPlan) return prevPlan;
        return {
          ...prevPlan,
          dailyActivities: [...prevPlan.dailyActivities, result.activity]
        };
      });
      
    } catch (err: any) {
      console.error('Error generating activity:', err);
      setGenerationError(err.message || 'Failed to generate activity. Please try again.');
    } finally {
      setGeneratingActivity(false);
      setGeneratingDay(null);
    }
  };

  const handleActivityComplete = async (activityId: number) => {
    try {
      setSavingActivity(activityId);
      await saveActivityResponse(activityId, null, true); // Mark as completed
      
      // Find the completed activity for celebration
      const completedActivity = plan?.dailyActivities.find(a => a.id === activityId);
      
      // Update the plan state
      if (plan) {
        setPlan(prevPlan => {
          if (!prevPlan) return prevPlan;
          return {
            ...prevPlan,
            dailyActivities: prevPlan.dailyActivities.map(activity =>
              activity.id === activityId
                ? { ...activity, completed: true, completedAt: new Date().toISOString() }
                : activity
            )
          };
        });
      }
      
      // Show celebration
      if (completedActivity) {
        setCompletedActivity({
          dayNumber: completedActivity.dayOfWeek,
          activityType: completedActivity.activityType
        });
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('Error completing activity:', err);
      setError('Failed to mark activity as complete. Please try again.');
    } finally {
      setSavingActivity(null);
    }
  };

  const handleRetryGeneration = () => {
    if (generatingDay) {
      handleGenerateActivity(generatingDay);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your weekly plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex justify-center space-x-4">
            {planNotFound && (
              <button
                onClick={handleGeneratePlan}
                disabled={generatingPlan}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {generatingPlan ? 'Generating Plan...' : 'Generate Plan'}
              </button>
            )}
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">No Plan Found</h2>
          <p className="text-gray-600 mb-4">The weekly plan could not be loaded.</p>
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboard
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
                Weekly Reading Plan
              </h1>
              <p className="text-gray-600">
                {plan.student?.name}&apos;s {plan.interestTheme} Adventure
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <WeeklyPlanView 
          plan={plan}
          onActivityResponse={handleActivityResponse}
          onGenerateActivity={handleGenerateActivity}
          onActivityComplete={handleActivityComplete}
          isGeneratingActivity={generatingActivity}
          generatingDay={generatingDay || undefined}
          error={generationError || undefined}
          onRetry={handleRetryGeneration}
        />
      </div>

      {/* Completion Celebration */}
      <CompletionCelebration
        isVisible={showCelebration}
        dayNumber={completedActivity?.dayNumber || 1}
        activityType={completedActivity?.activityType || 'Activity'}
        onClose={() => setShowCelebration(false)}
      />
    </div>
  );
} 