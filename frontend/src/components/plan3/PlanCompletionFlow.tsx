import React, { useState, useEffect } from 'react';
import { Plan3, Plan3Progress } from '@/types/plan3';

export interface PlanCompletionFlowProps {
  plan: Plan3;
  progress: Plan3Progress;
  onComplete?: () => void;
  onGenerateNewPlan?: () => void;
  className?: string;
}

const PlanCompletionFlow: React.FC<PlanCompletionFlowProps> = ({
  plan,
  progress,
  onComplete,
  onGenerateNewPlan,
  className = ''
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Show celebration when plan is completed
  useEffect(() => {
    if (progress.overallProgress === 100) {
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setShowSummary(true);
      }, 3000); // Show celebration for 3 seconds
    }
  }, [progress.overallProgress]);

  const handleGenerateNewPlan = async () => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      onGenerateNewPlan?.();
    } catch (error) {
      console.error('Failed to generate new plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    onComplete?.();
  };

  if (!showCelebration && !showSummary) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {showCelebration && (
          <div className="p-8 text-center animate-in zoom-in duration-500">
            {/* Celebration Animation */}
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-bounce">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🎉 Congratulations! 🎉
            </h2>
            
            <p className="text-xl text-gray-600 mb-6">
              You've completed your reading plan!
            </p>
            
            <div className="flex justify-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{progress.totalDays}</div>
                <div className="text-sm text-gray-500">Days Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{progress.completedDays}</div>
                <div className="text-sm text-gray-500">Activities Done</div>
              </div>
            </div>
          </div>
        )}

        {showSummary && (
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Plan Complete!
              </h2>
              <p className="text-gray-600">
                Great job completing your 3-day reading journey
              </p>
            </div>

            {/* Progress Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
              
              <div className="space-y-4">
                {Object.entries(progress.dayProgress).map(([dayIndex, dayData]) => (
                  <div key={dayIndex} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        dayData.completed 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {dayData.completed ? '✓' : dayIndex}
                      </div>
                      <span className="text-gray-700">Day {dayIndex}</span>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {dayData.activitiesCompleted}/{dayData.totalActivities} activities
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Progress */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-bold text-gray-900">{Math.round(progress.overallProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress.overallProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleComplete}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus-ring transition-colors font-medium"
              >
                Close
              </button>
              
              <button
                onClick={handleGenerateNewPlan}
                disabled={isGenerating}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-ring transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Generating...
                  </div>
                ) : (
                  'Start New Plan'
                )}
              </button>
            </div>

            {/* Encouragement */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Keep up the great reading habits! 📚
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanCompletionFlow;
