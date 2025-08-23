import React from 'react';
import { Day, Activity } from '@/types/weekly-plan';
import MatchingActivity from './activities/MatchingActivity';
import ReflectionActivity from './activities/ReflectionActivity';
import ChoiceReflectionActivity from './activities/ChoiceReflectionActivity';
import ConditionalWritingActivity from './activities/ConditionalWritingActivity';
import UploadActivity from './activities/UploadActivity';
import MultiSelectActivity from './activities/MultiSelectActivity';

interface ActivitiesPanelProps {
  day: Day;
  onActivityUpdate: (activityId: string, responses: any) => void;
  onCompleteDay: () => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
  error?: string;
}

export default function ActivitiesPanel({ 
  day, 
  onActivityUpdate, 
  onCompleteDay, 
  isReadOnly = false,
  isLoading = false,
  error
}: ActivitiesPanelProps) {
  const getActivityComponent = (activity: Activity) => {
    const commonProps = {
      activity,
      onUpdate: (responses: any) => onActivityUpdate(activity.id.toString(), responses),
      isReadOnly,
      planId: day.planId,
      dayIndex: day.dayIndex
    };

    switch (activity.type) {
      case 'matching':
        return <MatchingActivity key={activity.id} {...commonProps} />;
      case 'reflection':
        // Check if this is a choice-based reflection (has options) or regular reflection (has questions)
        if (activity.data?.options) {
          return <ChoiceReflectionActivity key={activity.id} {...commonProps} />;
        } else {
          return <ReflectionActivity key={activity.id} {...commonProps} />;
        }
      case 'writing':
        // Check if this is conditional writing (has conditionalPrompt) or regular writing
        if (activity.data?.conditionalPrompt) {
          return <ConditionalWritingActivity key={activity.id} {...commonProps} />;
        } else {
          return <ReflectionActivity key={activity.id} {...commonProps} />;
        }
      case 'upload':
        return <UploadActivity key={activity.id} {...commonProps} />;
      case 'multi-select':
        return <MultiSelectActivity key={activity.id} {...commonProps} />;
      default:
        return (
          <div key={activity.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">❓</div>
              <p className="text-gray-600">Unknown activity type: {activity.type}</p>
            </div>
          </div>
        );
    }
  };

  const getDayInstructions = (dayIndex: number) => {
    switch (dayIndex) {
      case 1:
        return {
          title: "Vocabulary Matching",
          description: "Match each vocabulary word with its correct definition from the story.",
          icon: "🔤"
        };
      case 2:
        return {
          title: "Comprehension Check",
          description: "Answer questions about the events and characters in the story.",
          icon: "📝"
        };
      case 3:
        return {
          title: "Story Reflection",
          description: "Share your thoughts about the story and its ending.",
          icon: "💭"
        };
      case 4:
        return {
          title: "Creative Writing",
          description: "Write about what you liked and what could be improved in the story.",
          icon: "✍️"
        };
      case 5:
        return {
          title: "Creative Activities",
          description: "Engage with the story through creative and interactive activities.",
          icon: "🎨"
        };
      default:
        return {
          title: "Activities",
          description: "Complete the activities for this day.",
          icon: "📚"
        };
    }
  };

  const getActivityTitle = (type: string, id: number) => {
    switch (type) {
      case 'matching': return 'Vocabulary Matching';
      case 'writing': return 'Creative Writing';
      case 'reflection': return 'Story Reflection';
      case 'multi-select': return 'Creative Activities';
      default: return `Activity ${id}`;
    }
  };

  const getActivityDescription = (type: string) => {
    switch (type) {
      case 'matching': return 'Match vocabulary words with their correct definitions.';
      case 'writing': return 'Write about your thoughts and experiences with the story.';
      case 'reflection': return 'Share your reflections on the story and characters.';
      case 'multi-select': return 'Choose from various creative activities to engage with the story.';
      default: return 'Complete this activity to continue.';
    }
  };

  const instructions = getDayInstructions(day.dayIndex);
  const isDayComplete = day.state === 'complete';
  const hasActivities = day.activities && day.activities.length > 0;

  // Check if all activities are completed
  const allActivitiesCompleted = React.useMemo(() => {
    if (!hasActivities) return false;
    
    const completionStatus = day.activities.map(activity => {
      // For multi-select activities, check if minimum required are completed
      if (activity.type === 'multi-select' && activity.data?.minRequired) {
        const completedCount = activity.response?.selectedActivities?.length || 0;
        const isComplete = completedCount >= activity.data.minRequired;
        return { id: activity.id, type: activity.type, isComplete, reason: `multi-select: ${completedCount}/${activity.data.minRequired}` };
      }
      
      // For upload activities, check if they're optional
      if (activity.type === 'upload' && activity.data?.isOptional) {
        // Optional upload activities don't block completion
        return { id: activity.id, type: activity.type, isComplete: true, reason: 'optional upload' };
      }
      
      // For other activities, check if they have a response and are marked as completed
      if (!activity.response) {
        return { id: activity.id, type: activity.type, isComplete: false, reason: 'no response' };
      }
      
      // Check if response is marked as completed
      const isComplete = activity.response.completed === true;
      return { id: activity.id, type: activity.type, isComplete, reason: `response.completed: ${activity.response.completed}` };
    });
    
    console.log('ActivitiesPanel Completion Debug:', {
      dayIndex: day.dayIndex,
      activities: completionStatus,
      allComplete: completionStatus.every(status => status.isComplete)
    });
    
    return completionStatus.every(status => status.isComplete);
  }, [day.activities, hasActivities]);

  // Determine if the Complete Day button should be disabled
  const isCompleteButtonDisabled = isLoading || !allActivitiesCompleted;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-2xl">{instructions.icon}</div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{instructions.title}</h2>
          <p className="text-gray-600">{instructions.description}</p>
        </div>
        {isDayComplete && (
          <div className="ml-auto">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Completed
            </span>
          </div>
        )}
      </div>

      {/* Activities */}
      {!hasActivities ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📚</div>
          <p className="text-gray-600">No activities available for this day</p>
        </div>
      ) : (
        <div className="space-y-6">
          {day.activities.map((activity) => (
            <div key={activity.id} className="border rounded-lg overflow-hidden">
              {/* Activity Header */}
              <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    {getActivityTitle(activity.type, activity.id)}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    activity.type === 'upload' && activity.data?.isOptional
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {activity.type === 'upload' && activity.data?.isOptional ? 'Optional' : 'Required'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getActivityDescription(activity.type)}
                </p>
              </div>

              {/* Activity Content */}
              <div className="p-4">
                {getActivityComponent(activity)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-red-900">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Complete Day Button */}
      {!isReadOnly && !isDayComplete && hasActivities && allActivitiesCompleted && (
        <div className="mt-6 pt-6 border-t">
          <button
            onClick={onCompleteDay}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
              isLoading
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Completing Day {day.dayIndex}...
              </div>
            ) : (
              `Complete Day ${day.dayIndex}`
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Make sure you've completed all activities before marking this day as complete.
          </p>
        </div>
      )}

      {/* Day Completion Status */}
      {isDayComplete && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-medium text-green-900">Day {day.dayIndex} Completed!</h4>
              <p className="text-sm text-green-700">
                Great job! You've completed all activities for this day.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Day {day.dayIndex} of 5</span>
          <span className="font-medium">
            {day.state === 'complete' ? 'Completed' : 
             day.state === 'available' ? 'In Progress' : 'Locked'}
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              day.state === 'complete' ? 'bg-green-500 w-full' : 
              day.state === 'available' ? 'bg-blue-500 w-1/2' : 'bg-gray-300 w-0'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
