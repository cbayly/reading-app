'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlan3ById, getPlan3DayDetails } from '@/lib/api';
import api from '@/lib/api';
import GenericSplitLayout from '@/components/layout/GenericSplitLayout';
import EnhancedReadingPane from '@/components/reading/EnhancedReadingPane';
import Plan3ActivityWrapper from '@/components/activities/Plan3ActivityWrapper';
import { LayoutMode } from '@/components/layout/LayoutBar';

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
  activities: any[]; // Updated to use enhanced activity format
  chapter: string;
}

export default function Plan3DayPage() {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan3 | null>(null);
  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [showActivityReady, setShowActivityReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultView, setDefaultView] = useState<LayoutMode>('reading');
  const scrollToAnchorRef = useRef<null | ((anchorId: string, options?: any) => boolean)>(null);

  const planId = params.id as string;
  const dayIndex = Number(params.index);

  // Function to check if any activities are completed
  const checkForCompletedActivities = async (planId: string, dayIndex: number): Promise<boolean> => {
    try {
      const { data: enhancedData } = await api.get(`/enhanced-activities/${planId}/${dayIndex}`);
      const progress = enhancedData?.progress || {};
      
      // Check if any activity has status 'completed'
      const activityTypes = ['who', 'where', 'sequence', 'main-idea', 'vocabulary', 'predict'];
      return activityTypes.some(activityType => progress[activityType]?.status === 'completed');
    } catch (error) {
      console.warn('Failed to check activity completion status:', error);
      return false;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setActivitiesLoading(false);
        setShowActivityReady(false);
        
        // Fetch plan data first (this includes the story content)
        const planData = await getPlan3ById(planId);
        setPlan(planData);
        
        // Set loading to false so reading view can be shown immediately
        setLoading(false);
        
        // Begin activities fetch and disable Split/Activity immediately
        setActivitiesLoading(true);
        const startTime = Date.now();

        // Fetch day details (this may trigger generation on the backend)
        const dayData = await getPlan3DayDetails(planId, dayIndex);
        const loadTime = Date.now() - startTime;

        // Check if any activities are completed to determine default view
        const hasCompletedActivities = await checkForCompletedActivities(planId, dayIndex);
        setDefaultView(hasCompletedActivities ? 'split' : 'reading');

        // Update UI with fetched activities
        setDayDetails(dayData);

        // If activities were cached (fast load), remove the loading state quickly
        if (loadTime <= 1000) {
          setActivitiesLoading(false);
        } else {
          // Keep the loading state visible for a minimum duration for UX feedback
          const minLoadingTime = 1500;
          const remainingTime = Math.max(0, minLoadingTime - loadTime);
          if (remainingTime > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingTime));
          }
          // Notify only when generation likely occurred
          if (loadTime > 2000) {
            setShowActivityReady(true);
            setTimeout(() => setShowActivityReady(false), 3000);
          }
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
        setLoading(false);
      } finally {
        // Ensure we don't leave the loader stuck on
        setActivitiesLoading(false);
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
    // If we have a direct chapter anchor, forward it
    const scrollFn = scrollToAnchorRef.current;
    if (!scrollFn) return;

    // Map sequence event IDs to approximate chapter anchors
    // Expected incoming format from activities: "event-<eventId>"
    if (anchorId?.startsWith('event-') && dayDetails?.activities) {
      const eventId = anchorId.slice('event-'.length);
      const seq = dayDetails.activities.find((a: any) => a.type === 'sequence');
      const events: Array<{ id: string; order?: number; sourceParagraph?: number }> = seq?.data?.events || [];
      const found = events.find((e) => e.id === eventId);
      
      if (found) {
        // Use sourceParagraph if available (new AI-generated data), otherwise fallback to order or intelligent mapping
        let paragraphIndex;
        if (found.sourceParagraph) {
          paragraphIndex = found.sourceParagraph;
        } else if (found.order) {
          paragraphIndex = found.order;
        } else {
          // Map event position to story paragraphs more intelligently (fallback for old data)
          const eventIndex = events.findIndex((e) => e.id === eventId);
          const totalEvents = events.length;
          
          // Distribute events across the story more evenly
          // First event -> early paragraph, last event -> later paragraph
          if (totalEvents <= 3) {
            paragraphIndex = eventIndex + 1;
          } else if (totalEvents === 5) {
            // For 5 events, distribute across the story more evenly
            // Event 1 -> early, Event 5 -> late, others distributed in between
            const distribution = [1, 3, 6, 9, 12]; // More realistic distribution
            paragraphIndex = distribution[eventIndex] || eventIndex + 1;
          } else {
            // For other numbers of events, use a more intelligent distribution
            const maxParagraphs = 15; // Assume stories have up to 15 paragraphs
            const step = Math.max(1, Math.floor(maxParagraphs / totalEvents));
            paragraphIndex = Math.min((eventIndex * step) + 1, maxParagraphs);
          }
        }
        
        const chapterId = `day-${dayIndex}`;
        const targetAnchor = `chapter-${chapterId}-para-${paragraphIndex}`;
        scrollFn(targetAnchor, { highlight: true, announce: true, scrollBehavior: 'smooth', block: 'center' });
        return;
      }
    }

    // Fallback: treat provided value as a direct anchor id
    scrollFn(anchorId, { highlight: true, announce: true, scrollBehavior: 'smooth', block: 'center' });
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

  if (!plan) {
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

  return (
    <>
      {/* Activity Ready Notification */}
      {showActivityReady && (
        <div className="fixed top-20 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-3 shadow-lg transition-all duration-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-800">Activities ready!</span>
          </div>
        </div>
      )}

      <GenericSplitLayout
      readingContent={
        <EnhancedReadingPane
          chapter={chapterContent}
          fontSize={16}
          onScrollToAnchor={(fn) => {
            scrollToAnchorRef.current = fn;
          }}
          layoutMode="reading"
          className="h-full"
        />
      }
      activityContent={
        dayDetails ? (
          <Plan3ActivityWrapper
            planId={planId}
            dayIndex={dayIndex}
            studentId={plan.studentId.toString()}
            dayDetails={dayDetails}
            onJumpToContext={handleJumpToContext}
            className="h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading activities...</p>
            </div>
          </div>
        )
      }
      title={plan.name}
      subtitle={`Day ${dayIndex}`}
      onBack={handleBackToPlan}
      activityLoading={activitiesLoading}
      loadingMessage={`Generating activities for Day ${dayIndex}...`}
      defaultView={defaultView}
      printConfig={{
        readingPrintable: false,
        activitiesPrintable: false
      }}
     />
     </>
   );
 }
