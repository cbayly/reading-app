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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Blue Numbered Steps */}
      <div className="flex items-center justify-between w-full px-8">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center">
            {/* Step Circle */}
            <div
              className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 cursor-pointer ${
                step.isCompleted
                  ? 'bg-green-500 border-green-500 text-white'
                  : step.isCurrent
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg ring-4 ring-blue-100'
                  : step.isLocked
                  ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:bg-blue-50'
              }`}
              onClick={() => !step.isLocked && onStepClick(index)}
            >
              {step.isCompleted ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <span className="text-sm font-semibold">{index + 1}</span>
              )}
            </div>

            {/* Step Label - Under the circle */}
            <div className="mt-2 text-center min-w-0">
              <div className={`text-xs font-medium ${
                step.isCompleted ? 'text-green-600' :
                step.isCurrent ? 'text-blue-600 font-semibold' :
                step.isLocked ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {step.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
