'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlan3ById, getPlan3DayDetails } from '@/lib/api';
import LayoutBar, { LayoutMode } from '@/components/layout/LayoutBar';
import EnhancedReadingPane from '@/components/reading/EnhancedReadingPane';
import ActivityPane, { Activity } from '@/components/activities/ActivityPane';

interface Plan3Day {
  id: string;
  plan3Id: string;
  index: number;
  state: 'locked' | 'available' | 'complete';
  completedAt: string | null;
  answers: any;
  createdAt: string;
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
  status: string;
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
  story: Plan3Story;
  days: Plan3Day[];
}

interface DayDetails {
  day: Plan3Day;
  activities: Activity[];
  chapter: string;
}

export default function Plan3DayPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan3 | null>(null);
  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('reading');
  const [activityResponses, setActivityResponses] = useState<Record<string, any>>({});

  const planId = params.id as string;
  const dayIndex = Number(params.index);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch plan data
        const planData = await getPlan3ById(planId);
        setPlan(planData);
        
        // Fetch day details with activities
        const dayData = await getPlan3DayDetails(planId, dayIndex);
        setDayDetails(dayData);
        
        // Initialize activity responses from existing answers
        if (dayData.day.answers) {
          setActivityResponses(dayData.day.answers);
        }
      } catch (err: any) {
        console.log('Error fetching data:', err);
        if (err?.response?.status === 404) {
          setError('Plan not found. Please create a new plan from the dashboard.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load plan data');
        }
      } finally {
        setLoading(false);
      }
    };

    if (planId && dayIndex) {
      fetchData();
    }
  }, [planId, dayIndex]);

  const handleBackToPlan = () => {
    router.push(`/plan3/${planId}`);
  };

  const handleJumpToContext = (anchorId: string) => {
    // This will be handled by the EnhancedReadingPane component
    console.log('Jumping to context:', anchorId);
  };

  const handleActivityUpdate = (activityId: string, answer: any) => {
    setActivityResponses(prev => ({
      ...prev,
      [activityId]: answer
    }));
    
    // TODO: Implement auto-save to backend
    console.log('Activity updated:', activityId, answer);
  };



  const getChapterContent = () => {
    if (!plan?.story) return null;
    
    const content = (() => {
      switch (dayIndex) {
        case 1:
          return plan.story.part1;
        case 2:
          return plan.story.part2;
        case 3:
          return plan.story.part3;
        default:
          return '';
      }
    })();
    
    return {
      id: `day-${dayIndex}`,
      title: `${plan.story.title} - Day ${dayIndex}`,
      content: content
    };
  };

  const getProgressPercentage = () => {
    if (!dayDetails?.activities) return 0;
    
    const completedCount = dayDetails.activities.filter(activity => 
      activityResponses[activity.id] && 
      (Array.isArray(activityResponses[activity.id]) ? 
        activityResponses[activity.id].length > 0 : 
        activityResponses[activity.id].trim().length > 0)
    ).length;
    
    return (completedCount / dayDetails.activities.length) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your reading day...</p>
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
              onClick={handleBackToPlan}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Plan
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!plan || !dayDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your reading day...</p>
        </div>
      </div>
    );
  }

  const chapterContent = getChapterContent();
  const progress = getProgressPercentage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Layout Bar */}
      <LayoutBar
        mode={layoutMode}
        onChangeMode={setLayoutMode}
        progress={progress}
        dayIndex={dayIndex}
        planName={plan.name}
        isLoading={loading}
      />

      {/* Main Content */}
      <div className="h-[calc(100vh-80px)]">
        {layoutMode === 'reading' && (
          <EnhancedReadingPane
            chapter={chapterContent}
            fontSize={16}
            onJumpToAnchor={handleJumpToContext}
            layoutMode={layoutMode}
            className="h-full"
          />
        )}

        {layoutMode === 'activity' && (
          <ActivityPane
            activities={dayDetails.activities}
            onJumpToContext={handleJumpToContext}
            onActivityUpdate={handleActivityUpdate}
            className="h-full"
          />
        )}

        {layoutMode === 'split' && (
          <div className="flex h-full">
            <div className="w-1/2 border-r border-gray-200">
              <EnhancedReadingPane
                chapter={chapterContent}
                fontSize={16}
                onJumpToAnchor={handleJumpToContext}
                layoutMode={layoutMode}
                className="h-full"
              />
            </div>
            <div className="w-1/2">
              <ActivityPane
                activities={dayDetails.activities}
                onJumpToContext={handleJumpToContext}
                onActivityUpdate={handleActivityUpdate}
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
