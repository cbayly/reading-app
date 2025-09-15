/**
 * @deprecated This component has been deprecated in favor of EnhancedActivityPane.
 * Please use EnhancedActivityPane for new implementations.
 * This component will be removed in a future version.
 */

import React, { useState, useEffect } from 'react';
import { Activity } from './ActivityPane';

interface ActivityPaneProps {
  activities: Activity[];
  onJumpToContext: (anchorId: string) => void;
  onActivityUpdate: (activityId: string, answer: any) => void;
  className?: string;
}

export default function ActivityPane({ activities, onJumpToContext, onActivityUpdate, className = '' }: ActivityPaneProps) {
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [activityResponses, setActivityResponses] = useState<Record<string, any>>({});

  // Show deprecation warning in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'ActivityPane is deprecated. Please use EnhancedActivityPane instead. ' +
        'This component will be removed in a future version.'
      );
    }
  }, []);

  const handleActivityUpdate = (activityId: string, answer: any) => {
    setActivityResponses(prev => ({
      ...prev,
      [activityId]: answer
    }));
    onActivityUpdate(activityId, answer);
  };

  const handleNext = () => {
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentActivityIndex > 0) {
      setCurrentActivityIndex(prev => prev - 1);
    }
  };

  const currentActivity = activities[currentActivityIndex];
  const progress = ((currentActivityIndex + 1) / activities.length) * 100;

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Deprecation Notice */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.594c.75 1.336-.213 3.007-1.742 3.007H3.48c-1.53 0-2.492-1.67-1.743-3.007L8.257 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd"/>
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Deprecated Component
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              This component has been deprecated. Please use EnhancedActivityPane for new implementations.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Activity {currentActivityIndex + 1} of {activities.length}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Activity Content */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {currentActivity.title}
        </h2>
        <p className="text-gray-700 mb-4">{currentActivity.description}</p>
        
        {/* Render activity based on type */}
        {currentActivity.type === 'who' && (
          <WhoActivity 
            activity={currentActivity}
            onUpdate={(answer) => handleActivityUpdate(currentActivity.id, answer)}
            onJumpToContext={onJumpToContext}
          />
        )}
        {currentActivity.type === 'where' && (
          <WhereActivity 
            activity={currentActivity}
            onUpdate={(answer) => handleActivityUpdate(currentActivity.id, answer)}
            onJumpToContext={onJumpToContext}
          />
        )}
        {currentActivity.type === 'sequence' && (
          <SequenceActivity 
            activity={currentActivity}
            onUpdate={(answer) => handleActivityUpdate(currentActivity.id, answer)}
            onJumpToContext={onJumpToContext}
          />
        )}
        {currentActivity.type === 'main-idea' && (
          <MainIdeaActivity 
            activity={currentActivity}
            onUpdate={(answer) => handleActivityUpdate(currentActivity.id, answer)}
            onJumpToContext={onJumpToContext}
          />
        )}
        {currentActivity.type === 'vocabulary' && (
          <VocabularyActivity 
            activity={currentActivity}
            onUpdate={(answer) => handleActivityUpdate(currentActivity.id, answer)}
            onJumpToContext={onJumpToContext}
          />
        )}
        {currentActivity.type === 'predict' && (
          <PredictActivity 
            activity={currentActivity}
            onUpdate={(answer) => handleActivityUpdate(currentActivity.id, answer)}
            onJumpToContext={onJumpToContext}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentActivityIndex === 0}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <span className="text-sm text-gray-500">
          {currentActivityIndex + 1} / {activities.length}
        </span>
        
        <button
          onClick={handleNext}
          disabled={currentActivityIndex === activities.length - 1}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Import legacy activity components
import WhoActivity from './WhoActivity';
import WhereActivity from './WhereActivity';
import SequenceActivity from './SequenceActivity';
import MainIdeaActivity from './MainIdeaActivity';
import VocabularyActivity from './VocabularyActivity';
import PredictActivity from './PredictActivity';

export interface Activity {
  id: string;
  type: 'who' | 'where' | 'sequence' | 'main-idea' | 'vocabulary' | 'predict';
  title: string;
  description: string;
  content: any;
  options?: any[];
}
