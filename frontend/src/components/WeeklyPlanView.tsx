'use client';

import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PrintableWeeklyPlan } from '@/lib/pdfUtils.tsx';
import { WeeklyPlan, DailyActivity, WeeklyPlanViewProps } from '@/types/weekly-plan';
import StoryDisplay from './StoryDisplay';
import DailyActivityCard from './DailyActivityCard';

export default function WeeklyPlanView({ plan, onActivityResponse }: WeeklyPlanViewProps) {
  const [viewMode, setViewMode] = useState<'story' | 'activities' | 'overview'>('story');
  const [studentResponses, setStudentResponses] = useState<Record<number, any>>({});
  const [savingResponse, setSavingResponse] = useState<number | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onBeforeGetContent: () => {
      setShowPrintPreview(true);
    },
    onAfterPrint: () => {
      setShowPrintPreview(false);
    },
  });

  const handleActivityResponse = (activityId: number, response: any) => {
    // Update local state
    setStudentResponses(prev => ({
      ...prev,
      [activityId]: response
    }));
    
    // Call parent callback if provided
    if (onActivityResponse) {
      onActivityResponse(activityId, response);
    }
  };

  const getActivityResponse = (activityId: number) => {
    return studentResponses[activityId] || plan.dailyActivities.find(a => a.id === activityId)?.studentResponse || null;
  };

  // Get plan status for activity generation logic
  const planStatus = (plan as any).planStatus;
  const dailyActivityStatus = (plan as any).dailyActivityStatus || [];

  const canGenerateActivity = (dayOfWeek: number) => {
    if (dayOfWeek === 1) return true;
    const previousDay = plan.dailyActivities.find(a => a.dayOfWeek === dayOfWeek - 1);
    return previousDay?.completed || false;
  };

  // Placeholder for activity generation handlers (will be implemented by parent)
  const handleGenerateActivity = (dayOfWeek: number) => {
    // This will be handled by the parent component
    console.log(`Generate activity for day ${dayOfWeek}`);
  };

  const handleActivityComplete = (activityId: number) => {
    // This will be handled by the parent component
    console.log(`Complete activity ${activityId}`);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Print Button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Weekly Reading Plan</h1>
            <p className="text-gray-600 mt-1">
              {plan.student?.name && `For ${plan.student.name}`} • Theme: {plan.interestTheme}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📄 Print Plan
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center">
          <div className="bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('story')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'story'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📚 Story
            </button>
            <button
              onClick={() => setViewMode('activities')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'activities'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🎯 Activities
            </button>
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'overview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Overview
            </button>
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'story' && (
          <StoryDisplay 
            chapters={plan.chapters} 
            className="mb-8"
          />
        )}

        {viewMode === 'activities' && (
          <div className="space-y-6">
            {/* Progress indicator */}
            {planStatus && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Weekly Progress</h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {planStatus.completedDays}/{planStatus.totalDays}
                    </div>
                    <div className="text-sm text-gray-600">Days Completed</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${planStatus.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>0%</span>
                  <span>{planStatus.progress}%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Daily Activities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const activity = plan.dailyActivities.find(a => a.dayOfWeek === day);
                const canGenerate = canGenerateActivity(day);
                
                return (
                  <DailyActivityCard
                    key={day}
                    activity={activity || {
                      id: `placeholder-${day}`,
                      planId: plan.id,
                      dayOfWeek: day,
                      activityType: 'Loading...',
                      content: null,
                      completed: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    }}
                    onGenerate={() => handleGenerateActivity(day)}
                    onResponse={(response) => handleActivityResponse(activity?.id || 0, response)}
                    onComplete={handleActivityComplete}
                    canGenerate={canGenerate}
                    isGenerating={false}
                    isSubmitting={savingResponse === activity?.id}
                  />
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Story Overview */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Story Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plan.chapters.map((chapter) => (
                  <div key={chapter.id} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">{chapter.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{chapter.summary}</p>
                    <div className="text-xs text-gray-500">
                      {chapter.content.split(' ').length} words
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Schedule Overview */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Weekly Schedule Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                {plan.dailyActivities.map((activity) => (
                  <div key={activity.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 mb-2">Day {activity.dayOfWeek}</div>
                      <div className="text-sm text-gray-600 mb-2">{activity.activityType}</div>
                      {activity.completed && (
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          ✅ Completed
                        </span>
                      )}
                      {activity.dayOfWeek > 5 && !activity.completed && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          Optional
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Printable Component */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <PrintableWeeklyPlan plan={plan} />
        </div>
      </div>
    </>
  );
} 