'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlan, getPlanByStudentId, completePlan, getStudent } from '@/lib/api';
import PlanHeader from '@/components/PlanHeader';
import DayList from '@/components/DayList';
import CompletionCelebration from '@/components/CompletionCelebration';
import WeeklyPlanLoadingScreen from '@/components/WeeklyPlanLoadingScreen';
import { Plan, Day, Activity } from '@/types/weekly-plan';

export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingPlan, setCompletingPlan] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingStudentName, setLoadingStudentName] = useState('');

  // Define the loading screen completion callback
  const handleLoadingComplete = useCallback(() => {
    console.log('Plan loading screen onComplete called');
    setShowLoadingScreen(false);
    setCompletingPlan(false);
  }, []);



  const handlePlanComplete = useCallback(async () => {
    try {
      setCompletingPlan(true);
      setError(null);
      
      // Get student name for loading screen
      try {
        const studentData = await getStudent(plan?.studentId || 0);
        setLoadingStudentName(studentData.name);
      } catch (err) {
        setLoadingStudentName('Student');
      }
      
      setShowLoadingScreen(true);
      console.log('Completing plan:', plan?.id);
      
      if (!plan) {
        throw new Error('Plan not available for completion');
      }
      
      const result = await completePlan(plan.id);
      console.log('Plan completion result:', result);
      
      // If a new plan was generated, navigate to it
      if (result.newPlan) {
        router.push(`/plan/${result.newPlan.id}`);
        return;
      }
      
      // Otherwise, update the current plan
      setPlan(result.plan);
      
      // Call loading screen completion manually when generation is actually done
      handleLoadingComplete();
      
    } catch (err: any) {
      console.error('Error completing plan:', err);
      console.log('Plan completion error response:', err?.response);
      setShowLoadingScreen(false);
      setCompletingPlan(false);
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to complete plan');
      }
    }
  }, [plan, router]);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        // First try to get the plan by ID (in case it's a plan ID)
        let planData;
        try {
          planData = await getPlan(Number(params.id));
        } catch (planError: any) {
          // If plan not found by ID, try to get it by student ID
          if (planError?.response?.status === 404) {
            console.log('Plan not found by ID, trying to get by student ID...');
            const studentPlanResponse = await getPlanByStudentId(Number(params.id));
            planData = studentPlanResponse.plan;
          } else {
            throw planError;
          }
        }
        setPlan(planData);
      } catch (err: any) {
        console.log('Error fetching plan:', err);
        console.log('Error response:', err?.response);
        console.log('Error status:', err?.response?.status);
        
        if (err?.response?.status === 404) {
          setError('Plan not found. Please create a new plan from the dashboard.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load plan');
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPlan();
    }
  }, [params.id]);

  // Refetch plan data when user returns to this page (e.g., after completing a day)
  useEffect(() => {
    const handleFocus = async () => {
      if (params.id && !loading) {
        console.log('Refreshing plan data on focus...');
        try {
          let planData;
          try {
            planData = await getPlan(Number(params.id));
          } catch (planError: any) {
            if (planError?.response?.status === 404) {
              const studentPlanResponse = await getPlanByStudentId(Number(params.id));
              planData = studentPlanResponse.plan;
            } else {
              throw planError;
            }
          }
          setPlan(planData);
        } catch (err: any) {
          console.error('Error refreshing plan data:', err);
        }
      }
    };

    // Listen for when the window regains focus
    window.addEventListener('focus', handleFocus);
    
    // Also refetch when the page becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [params.id, loading]);

  // Cleanup effect to ensure loading screen is hidden when component unmounts
  useEffect(() => {
    return () => {
      setShowLoadingScreen(false);
      setCompletingPlan(false);
    };
  }, []);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleRetry = () => {
    setError(null);
    if (params.id) {
      setLoading(true);
      // Refetch the plan
      getPlan(Number(params.id))
        .then(setPlan)
        .catch((err: any) => {
          if (err?.response?.data?.message) {
            setError(err.response.data.message);
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to load plan');
          }
        })
        .finally(() => setLoading(false));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your reading plan...</p>
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
              onClick={handleRetry}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={handleBackToDashboard}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your reading plan...</p>
        </div>
      </div>
    );
  }

  // Show loading screen if completing plan
  if (showLoadingScreen) {
    return (
      <WeeklyPlanLoadingScreen
        studentName={loadingStudentName}
        isVisible={showLoadingScreen}
        onComplete={handleLoadingComplete}
        estimatedDuration={90000} // 90 seconds for plan completion and new plan generation
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <PlanHeader
        plan={plan}
        onBackToDashboard={handleBackToDashboard}
        onPlanComplete={handlePlanComplete}
        canComplete={plan.days.every(day => day.state === 'complete')}
        isCompleting={completingPlan}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <DayList
          days={plan.days}
          planId={plan.id}
        />
      </div>



    </div>
  );
} 