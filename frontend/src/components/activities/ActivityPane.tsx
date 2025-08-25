import React, { useState, useEffect } from 'react';
import WhoActivity from './WhoActivity';
import WhereActivity from './WhereActivity';
import SequenceActivity from './SequenceActivity';
import MainIdeaActivity from './MainIdeaActivity';
import PredictActivity from './PredictActivity';

export interface Activity {
  id: string;
  type: 'who' | 'where' | 'sequence' | 'main_idea' | 'predict';
  prompt: string;
  answer?: any;
  choices?: string[];
  completed?: boolean;
}

export interface ActivityPaneProps {
  activities: Activity[];
  onJumpToContext?: (anchorId: string) => void;
  onActivityUpdate?: (activityId: string, answer: any) => void;
  onPeekReading?: () => void;
  className?: string;
}

const ActivityPane: React.FC<ActivityPaneProps> = ({
  activities,
  onJumpToContext,
  onActivityUpdate,
  onPeekReading,
  className = ''
}) => {
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set());

  // Update completion status when activities change
  useEffect(() => {
    const completed = new Set<string>();
    activities.forEach(activity => {
      if (activity.completed || (activity.answer && 
          (Array.isArray(activity.answer) ? activity.answer.length > 0 : 
           typeof activity.answer === 'string' ? activity.answer.trim().length > 0 : 
           activity.answer))) {
        completed.add(activity.id);
      }
    });
    setCompletedActivities(completed);
  }, [activities]);

  const handleActivityComplete = (activityId: string, answer: any) => {
    setCompletedActivities(prev => new Set([...prev, activityId]));
    onActivityUpdate?.(activityId, answer);
  };

  const handleNextActivity = () => {
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(prev => prev + 1);
    }
  };

  const handlePreviousActivity = () => {
    if (currentActivityIndex > 0) {
      setCurrentActivityIndex(prev => prev - 1);
    }
  };

  const getActivityTypeLabel = (type: string) => {
    const labels = {
      who: 'Who',
      where: 'Where',
      sequence: 'Sequence',
      main_idea: 'Main Idea',
      predict: 'Predict'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getActivityTypeIcon = (type: string) => {
    const icons = {
      who: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      ),
      where: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      ),
      sequence: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
      ),
      main_idea: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
      ),
      predict: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
      )
    };
    return icons[type as keyof typeof icons] || (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    );
  };

  if (!activities || activities.length === 0) {
    return (
      <div className={`p-4 md:p-6 bg-gray-50 h-full overflow-auto ${className}`} role="main" aria-label="Activities">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Activities</h2>
          </div>
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No activities available</div>
            <div className="text-gray-400 text-sm mt-2">Activities will appear here when available</div>
          </div>
        </div>
      </div>
    );
  }

  const currentActivity = activities[currentActivityIndex];
  const totalActivities = activities.length;

  return (
    <div className={`p-4 md:p-6 bg-gray-50 h-full overflow-auto ${className}`} role="main" aria-label="Activities">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Activities</h2>
        </div>



        {/* Activity Stepper */}
        <div className="mb-6">
          <div className="grid grid-cols-5 gap-6 sm:gap-8 max-w-3xl mx-auto" role="tablist" aria-label="Activity navigation">
            {activities.map((activity, index) => {
              const isCompleted = completedActivities.has(activity.id);
              const isCurrent = index === currentActivityIndex;
              const isAccessible = index <= currentActivityIndex || isCompleted;
              
              return (
                <button
                  key={activity.id}
                  onClick={() => setCurrentActivityIndex(index)}
                  disabled={!isAccessible}
                  className="inline-grid w-[88px] justify-items-center text-center focus-ring"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`${getActivityTypeLabel(activity.type)} activity ${index + 1}${isCompleted ? ' completed' : ''}`}
                  title={`${getActivityTypeLabel(activity.type)} activity ${index + 1}`}
                >
                  {/* number circle */}
                  <div className={`grid place-items-center h-10 w-10 rounded-full border-2 transition-all duration-200 ${
                    isCurrent 
                      ? 'border-blue-500 bg-blue-500 text-white shadow-lg' 
                      : isCompleted 
                        ? 'border-green-500 bg-green-500 text-white' 
                        : isAccessible 
                          ? 'border-gray-300 bg-white text-gray-600 hover:border-gray-400' 
                          : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  {/* label */}
                  <span className={`mt-2 max-w-[88px] text-xs font-medium leading-5 transition-colors ${
                    isCurrent ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {getActivityTypeLabel(activity.type)}
                  </span>
                </button>
              );
            })}
          </div>
          

        </div>

        {/* Current Activity */}
        {currentActivity && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Activity Header */}
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-lg mr-3 ${
                completedActivities.has(currentActivity.id) 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {getActivityTypeIcon(currentActivity.type)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {getActivityTypeLabel(currentActivity.type)} Activity {currentActivityIndex + 1}
                </h3>
                <p className="text-sm text-gray-500">
                  {completedActivities.has(currentActivity.id) ? 'Completed' : 'In Progress'}
                </p>
              </div>
            </div>

            {/* Activity Content */}
            <div className="mb-6">
              <p className="text-gray-700 mb-4">{currentActivity.prompt}</p>
              
              {/* Activity Components */}
              {currentActivity.type === 'who' && (
                <WhoActivity
                  activity={currentActivity}
                  onComplete={handleActivityComplete}
                  onJumpToContext={onJumpToContext}
                />
              )}
              
              {currentActivity.type === 'where' && (
                <WhereActivity
                  activity={currentActivity}
                  onComplete={handleActivityComplete}
                  onJumpToContext={onJumpToContext}
                />
              )}
              
              {currentActivity.type === 'sequence' && (
                <SequenceActivity
                  activity={currentActivity}
                  onComplete={handleActivityComplete}
                  onJumpToContext={onJumpToContext}
                />
              )}
              
              {currentActivity.type === 'main_idea' && (
                <MainIdeaActivity
                  activity={currentActivity}
                  onComplete={handleActivityComplete}
                  onJumpToContext={onJumpToContext}
                />
              )}
              
              {currentActivity.type === 'predict' && (
                <PredictActivity
                  activity={currentActivity}
                  onComplete={handleActivityComplete}
                  onJumpToContext={onJumpToContext}
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={handlePreviousActivity}
                disabled={currentActivityIndex === 0}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 focus-ring"
                aria-label="Previous activity"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Previous
              </button>
              
              <span className="text-sm text-gray-500">
                {currentActivityIndex + 1} of {totalActivities}
              </span>
              
              <button
                onClick={handleNextActivity}
                disabled={currentActivityIndex === totalActivities - 1}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 focus-ring"
                aria-label="Next activity"
              >
                Next
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPane;
