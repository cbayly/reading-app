import React from 'react';
import { Plan } from '@/types/weekly-plan';

interface PlanHeaderProps {
  plan: Plan;
  onBackToDashboard?: () => void;
  onPlanComplete?: () => void;
  canComplete?: boolean;
  isCompleting?: boolean;
}

export default function PlanHeader({ 
  plan, 
  onBackToDashboard, 
  onPlanComplete, 
  canComplete = false,
  isCompleting = false 
}: PlanHeaderProps) {
  const completedDays = plan.days.filter(day => day.state === 'complete').length;
  const totalDays = plan.days.length;
  const progressPercentage = (completedDays / totalDays) * 100;

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {plan.name}
            </h1>
            <p className="text-gray-600 mb-3">
              {plan.student?.name}&apos;s {plan.theme} Adventure
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            {/* Progress Text */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                Day {completedDays} of {totalDays} completed
              </span>
              <span>
                {Math.round(progressPercentage)}% complete
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 ml-4">
            {canComplete && (
              <button
                onClick={onPlanComplete}
                disabled={isCompleting}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  isCompleting 
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title="Complete this plan and generate a new one"
              >
                {isCompleting ? 'Completing...' : 'Complete Plan'}
              </button>
            )}
            
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
        
        {/* Plan Status */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Status: <span className={`font-medium ${
                  plan.status === 'active' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {plan.status === 'active' ? 'In Progress' : 'Completed'}
                </span>
              </span>
              
              {plan.story && (
                <span className="text-sm text-gray-500">
                  Story: <span className="font-medium text-gray-700">
                    {plan.story.title}
                  </span>
                </span>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              Created: {new Date(plan.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
