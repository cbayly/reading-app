import React from 'react';
import { ActivityProgress } from '../../../types/enhancedActivities';

interface ActivityStep {
  type: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  timeSpent?: number;
  attempts?: number;
  score?: number;
  lastAttempt?: Date;
}

interface ActivityStepperProps {
  steps: ActivityStep[];
  currentIndex: number;
  onStepClick: (index: number) => void;
  showProgress?: boolean;
  showTimeSpent?: boolean;
  showAttempts?: boolean;
  showScores?: boolean;
  className?: string;
}

export const ActivityStepper: React.FC<ActivityStepperProps> = ({
  steps,
  currentIndex,
  onStepClick,
  showProgress = true,
  showTimeSpent = true,
  showAttempts = true,
  showScores = true,
  className = ''
}) => {
  const completedCount = steps.filter(step => step.isCompleted).length;
  const totalProgress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const formatTime = (seconds?: number) => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const getStepIcon = (step: ActivityStep) => {
    if (step.isLocked) {
      return (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
      );
    }
    
    if (step.isCompleted) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      );
    }
    
    if (step.isCurrent) {
      return (
        <svg className="w-5 h-5 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      );
    }
    
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Progress Bar */}
      {showProgress && (
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-500">{completedCount} of {steps.length} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {totalProgress.toFixed(0)}% complete
          </div>
        </div>
      )}

      {/* Activity Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`relative p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
              step.isCurrent 
                ? 'border-blue-300 bg-blue-50 shadow-sm' 
                : step.isCompleted 
                ? 'border-green-200 bg-green-50' 
                : step.isLocked
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
            onClick={() => !step.isLocked && onStepClick(index)}
          >
            <div className="flex items-start space-x-3">
              {/* Step Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step)}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-medium ${
                    step.isCompleted ? 'text-green-800' : 
                    step.isCurrent ? 'text-blue-800' : 
                    step.isLocked ? 'text-gray-500' : 'text-gray-900'
                  }`}>
                    {step.title}
                  </h3>
                  {step.isCurrent && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Current
                    </span>
                  )}
                </div>
                
                <p className={`text-sm mt-1 ${
                  step.isCompleted ? 'text-green-600' : 
                  step.isCurrent ? 'text-blue-600' : 
                  step.isLocked ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {step.description}
                </p>

                {/* Progress Details */}
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  {showTimeSpent && step.timeSpent !== undefined && (
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      {formatTime(step.timeSpent)}
                    </span>
                  )}
                  
                  {showAttempts && step.attempts !== undefined && (
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                      </svg>
                      {step.attempts} attempt{step.attempts !== 1 ? 's' : ''}
                    </span>
                  )}
                  
                  {showScores && step.score !== undefined && (
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                      {step.score}%
                    </span>
                  )}
                  
                  {step.lastAttempt && (
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      {step.lastAttempt.toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
