'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlan, saveActivityResponse, generatePlan, generateDayActivity, getStudent, regeneratePlan } from '@/lib/api';
import WeeklyPlanView from '@/components/WeeklyPlanView';
import CompletionCelebration from '@/components/CompletionCelebration';
import WeeklyPlanLoadingScreen from '@/components/WeeklyPlanLoadingScreen';
import { WeeklyPlan, DailyActivity, Chapter } from '@/types/weekly-plan';

export default function WeeklyPlanPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingActivity, setSavingActivity] = useState<number | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatingActivity, setGeneratingActivity] = useState(false);
  const [generatingDay, setGeneratingDay] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedActivity, setCompletedActivity] = useState<{ dayNumber: number; activityType: string } | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingStudentName, setLoadingStudentName] = useState('');
  const [hasAttemptedDay1Generation, setHasAttemptedDay1Generation] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Define the loading screen completion callback
  const handleLoadingComplete = useCallback(() => {
    console.log('Weekly plan loading screen onComplete called');
    setShowLoadingScreen(false);
    setGeneratingPlan(false);
  }, []);

  const handleAutoGeneratePlan = useCallback(async () => {
    try {
      setGeneratingPlan(true);
      setError(null);
      
      // Get student name for loading screen
      try {
        const studentData = await getStudent(Number(params.id));
        setLoadingStudentName(studentData.name);
      } catch (err) {
        setLoadingStudentName('Student');
      }
      
      setShowLoadingScreen(true);
      console.log('Auto-generating plan for student:', params.id);
      const result = await generatePlan(Number(params.id));
      console.log('Plan generation result:', result);
      setPlan(result.plan);
      
      // Call loading screen completion manually when generation is actually done
      handleLoadingComplete();
    } catch (err: any) {
      console.error('Error auto-generating plan:', err);
      console.log('Generate plan error response:', err?.response);
      setShowLoadingScreen(false);
      setGeneratingPlan(false);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate weekly plan');
      }
    }
  }, [params.id]);

  const handleGenerateActivity = useCallback(async (dayOfWeek: number) => {
    // Prevent multiple simultaneous requests
    if (generatingActivity) {
      console.log('Activity generation already in progress, skipping...');
      return;
    }
    
    try {
      setGeneratingActivity(true);
      setGeneratingDay(dayOfWeek);
      setError(null);
      
      console.log('Generating activity for day:', dayOfWeek);
      
      // Use plan.id instead of params.id (student ID)
      if (!plan) {
        throw new Error('Plan not available for activity generation');
      }
      
      const result = await generateDayActivity(plan.id, dayOfWeek);
      console.log('Activity generation result:', result);
      
      // Update the plan with the new activity
      if (plan) {
        setPlan(prevPlan => {
          if (!prevPlan) return prevPlan;
          return {
            ...prevPlan,
            dailyActivities: prevPlan.dailyActivities.map(activity =>
              activity.dayOfWeek === dayOfWeek
                ? { ...activity, ...result.activity }
                : activity
            )
          };
        });
      }
    } catch (err: any) {
      console.error('Error generating activity:', err);
      console.log('Generate activity error response:', err?.response);
      
      // Handle specific error cases
      if (err?.response?.status === 409) {
        // Activity already exists - this is not an error, just refresh the plan
        console.log('Activity already exists, refreshing plan...');
        try {
          const updatedPlan = await getPlan(Number(params.id));
          setPlan(updatedPlan);
        } catch (refreshErr) {
          console.error('Error refreshing plan:', refreshErr);
        }
        return; // Don't show error for 409
      }
      
      setGenerationError(err?.response?.data?.message || 'Failed to generate activity');
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate activity');
      }
    } finally {
      setGeneratingActivity(false);
      setGeneratingDay(undefined);
    }
  }, [plan, generatingActivity]);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const planData = await getPlan(Number(params.id));
        setPlan(planData);
        // Reset the Day 1 generation flag for new plans
        setHasAttemptedDay1Generation(false);
      } catch (err: any) {
        console.log('Error fetching plan:', err);
        console.log('Error response:', err?.response);
        console.log('Error status:', err?.response?.status);
        
        if (err?.response?.status === 404) {
          // Auto-generate plan instead of showing error
          console.log('No plan found, auto-generating...');
          setLoading(false); // Hide the basic loading spinner before starting generation
          await handleAutoGeneratePlan();
          return; // Don't set loading to false again in finally
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
  }, [params.id, handleAutoGeneratePlan]);

  // Separate effect to auto-trigger Day 1 activity generation when plan is loaded
  useEffect(() => {
    if (plan && plan.dailyActivities.length === 0 && !generatingActivity && !generatingPlan && !hasAttemptedDay1Generation) {
      console.log('Plan loaded, auto-triggering Day 1 activity generation');
      setHasAttemptedDay1Generation(true);
      // Small delay to ensure plan state is fully settled
      const timer = setTimeout(() => {
        handleGenerateActivity(1);
      }, 1000); // Increased delay to prevent race conditions
      
      return () => clearTimeout(timer);
    }
  }, [plan, generatingActivity, generatingPlan, hasAttemptedDay1Generation, handleGenerateActivity]);

  // Cleanup effect to ensure loading screen is hidden when component unmounts
  useEffect(() => {
    return () => {
      setShowLoadingScreen(false);
      setGeneratingPlan(false);
      setHasAttemptedDay1Generation(false);
    };
  }, []);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleGeneratePlan = async () => {
    try {
      setGeneratingPlan(true);
      setError(null);
      
      // Get student name for loading screen
      try {
        const studentData = await getStudent(Number(params.id));
        setLoadingStudentName(studentData.name);
      } catch (err) {
        setLoadingStudentName('Student');
      }
      
      setShowLoadingScreen(true);
      console.log('Generating plan for student:', params.id);
      const result = await generatePlan(Number(params.id));
      console.log('Plan generation result:', result);
      setPlan(result.plan);
      
      // Call loading screen completion manually when generation is actually done
      handleLoadingComplete();
    } catch (err: any) {
      console.error('Error generating plan:', err);
      console.log('Generate plan error response:', err?.response);
      setShowLoadingScreen(false);
      setGeneratingPlan(false);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to generate weekly plan');
      }
    }
  };

  const handleRegeneratePlan = async () => {
    if (!params.id || regenerating) return;
    try {
      setRegenerating(true);
      setError(null);

      // Load student name for the loading screen
      try {
        const studentData = await getStudent(Number(params.id));
        setLoadingStudentName(studentData.name);
      } catch (_) {
        setLoadingStudentName('Student');
      }

      // Show full-screen generation overlay
      setShowLoadingScreen(true);

      const result = await regeneratePlan(Number(params.id));
      setPlan(result.plan);
      // Hide loading via onComplete callback to keep animation smooth
      handleLoadingComplete();
      setHasAttemptedDay1Generation(false);
    } catch (err: any) {
      console.error('Error regenerating plan:', err);
      setShowLoadingScreen(false);
      setRegenerating(false);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to regenerate weekly plan');
      }
    } finally {
      setRegenerating(false);
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
          <button
            onClick={handleBackToDashboard}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating your weekly plan...</p>
        </div>
      </div>
    );
  }



  // Show loading screen if generating plan
  if (showLoadingScreen) {
    return (
      <WeeklyPlanLoadingScreen
        studentName={loadingStudentName}
        isVisible={showLoadingScreen}
        onComplete={handleLoadingComplete}
      />
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
                onClick={handleRegeneratePlan}
                disabled={regenerating}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${regenerating ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                title="Regenerate a brand new weekly plan"
              >
                {regenerating ? 'Regenerating…' : 'Regenerate Plan'}
              </button>
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