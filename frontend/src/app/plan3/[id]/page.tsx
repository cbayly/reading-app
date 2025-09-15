'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlan3ById } from '@/lib/api';

interface Plan3Day {
  id: string;
  plan3Id: string;
  index: number;
  state: 'locked' | 'available' | 'complete';
  completedAt: string | null;
  answers: any;
  createdAt: string;
  updatedAt: string;
}

interface Plan3Story {
  id: string;
  plan3Id: string;
  title: string;
  themes: string[];
  part1: string;
  part2: string;
  part3: string;
  createdAt: string;
}

interface Plan3 {
  id: string;
  studentId: number;
  name: string;
  theme: string;
  status: string; // may be 'generating', 'active', 'failed', 'completed'
  createdAt: string;
  updatedAt: string;
  student: {
    id: number;
    parentId: number;
    name: string;
    birthday: string;
    gradeLevel: number;
    interests: string;
    createdAt: string;
    updatedAt: string;
  };
  story?: Plan3Story | null;
  days?: Plan3Day[];
}

export default function Plan3Page() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan3 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const planData = await getPlan3ById(params.id as string);
      setPlan(planData);
    } catch (err: any) {
      console.log('Error fetching plan:', err);
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
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchPlan();
    }
  }, [params.id, fetchPlan]);

  // Poll while plan is generating
  useEffect(() => {
    if (!plan) return;
    if (plan.status === 'generating') {
      const interval = setInterval(() => {
        fetchPlan();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [plan, fetchPlan]);

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleDayClick = (day: Plan3Day) => {
    if (day.state === 'locked') return;
    router.push(`/plan3/${plan?.id}/day/${day.index}`);
  };

  const getCompletedDays = () => {
    return plan?.days?.filter(day => day.state === 'complete').length || 0;
  };

  const getTotalDays = () => {
    return plan?.days?.length || 0;
  };

  const getProgressPercentage = () => {
    if (!plan?.days || plan.days.length === 0) return 0;
    return Math.round((getCompletedDays() / getTotalDays()) * 100);
  };

  const getDayTitle = (dayIndex: number) => {
    const titles = [
      'Day 1: Story Introduction',
      'Day 2: Story Development', 
      'Day 3: Story Conclusion'
    ];
    return titles[dayIndex - 1] || `Day ${dayIndex}`;
  };

  const getDayDescription = (dayIndex: number) => {
    switch (dayIndex) {
      case 1:
        return 'Read the beginning of the story and complete activities';
      case 2:
        return 'Continue reading and explore the story further';
      case 3:
        return 'Finish the story and reflect on your journey';
      default:
        return 'Complete activities for this day';
    }
  };

  const getDayIcon = (dayIndex: number) => {
    const icons = [
      '📖', // Story Introduction
      '📚', // Story Development  
      '🎯'  // Story Conclusion
    ];
    return icons[dayIndex - 1] || '📖';
  };

  const getStateStyles = (state: string) => {
    switch (state) {
      case 'locked':
        return {
          card: 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60',
          icon: 'text-gray-400',
          title: 'text-gray-500',
          description: 'text-gray-400',
          status: 'text-gray-500 bg-gray-200'
        };
      case 'available':
        return {
          card: 'bg-white border-blue-300 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all duration-200',
          icon: 'text-blue-600',
          title: 'text-gray-900',
          description: 'text-gray-600',
          status: 'text-blue-700 bg-blue-100'
        };
      case 'complete':
        return {
          card: 'bg-gray-100 border-gray-300 cursor-pointer',
          icon: 'text-gray-400',
          title: 'text-gray-500',
          description: 'text-gray-400',
          status: 'text-green-700 bg-green-100'
        };
      default:
        return {
          card: 'bg-white border-gray-300',
          icon: 'text-gray-600',
          title: 'text-gray-900',
          description: 'text-gray-600',
          status: 'text-gray-600 bg-gray-100'
        };
    }
  };

  const getStatusText = (day: Plan3Day) => {
    switch (day.state) {
      case 'locked':
        return 'Locked';
      case 'available':
        return 'Available';
      case 'complete':
        return 'Complete';
      default:
        return 'Unknown';
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
              onClick={() => window.location.reload()}
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

  const storyTitle = plan.story?.title || '';
  const days = plan.days || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h1>
          <p className="text-gray-600 mb-4">{plan.student.name}'s {plan.theme} Adventure</p>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Day {getCompletedDays()} of {getTotalDays()} completed</span>
              <span>{getProgressPercentage()}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-6 text-sm">
            <span className="text-blue-600 flex items-center">
              <span>Status: {plan.status === 'generating' ? 'generating' : plan.status}</span>
              {plan.status === 'generating' && (
                <span className="ml-2 inline-flex">
                  <span className="h-3 w-3 mr-1 rounded-full bg-blue-400 animate-pulse"></span>
                  <span className="h-3 w-3 mr-1 rounded-full bg-blue-300 animate-pulse [animation-delay:150ms]"></span>
                  <span className="h-3 w-3 rounded-full bg-blue-200 animate-pulse [animation-delay:300ms]"></span>
                </span>
              )}
            </span>
            {storyTitle && <span className="text-gray-600">Story: {storyTitle}</span>}
          </div>
        </div>

        {plan.status !== 'generating' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your 3-Day Reading Journey
          </h2>

          {days.length === 0 ? (
            <div className="p-6 border rounded-lg bg-gray-50 text-gray-600">
              No days are available yet. Please wait while the plan is being prepared.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {days.map((day) => {
                const styles = getStateStyles(day.state);
                const isClickable = day.state !== 'locked';
                const shouldAnimate = day.state === 'available';

                return (
                  <div
                    key={day.id}
                    className={`border-2 rounded-lg p-4 ${styles.card} ${shouldAnimate ? 'hover:scale-105' : ''}`}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{getDayIcon(day.index)}</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles.status}`}>
                        {getStatusText(day)}
                      </span>
                    </div>

                    <h3 className={`font-semibold text-sm mb-2 ${styles.title}`}>
                      {getDayTitle(day.index)}
                    </h3>

                    <p className={`text-xs mb-3 ${styles.description}`}>
                      {getDayDescription(day.index)}
                    </p>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {day.state === 'locked' ? (
                        <p className="text-xs text-gray-400 italic">Complete previous days to unlock</p>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDayClick(day);
                          }}
                          className="text-xs text-green-600 font-medium hover:underline"
                        >
                          Start Day →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
