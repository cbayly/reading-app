'use client';

import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PrintableWeeklyPlan } from '@/lib/pdfUtils.tsx';
import { WeeklyPlan, DailyActivity, WeeklyPlanViewProps } from '@/types/weekly-plan';

export default function WeeklyPlanView({ plan, onActivityResponse }: WeeklyPlanViewProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [viewMode, setViewMode] = useState<'daily' | 'overview'>('daily');
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

  const currentActivity = plan.dailyActivities.find(activity => activity.dayOfWeek === selectedDay);

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
  };

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

  const renderActivityContent = (activity: DailyActivity) => {
    const content = activity.content;
    
    // Handle different activity types
    switch (activity.activityType) {
      case 'Story Kickoff':
        return (
          <div className="space-y-6">
            {/* Prediction Warm-Up */}
            {content.predictionWarmUp && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">{content.predictionWarmUp.title}</h3>
                <p className="text-blue-800 mb-3">{content.predictionWarmUp.prompt}</p>
                <textarea 
                  className="w-full p-2 border border-blue-300 rounded"
                  placeholder="Write your prediction here..."
                  rows={3}
                  value={getActivityResponse(activity.id)?.predictionWarmUp || ''}
                  onChange={(e) => handleActivityResponse(activity.id, {
                    ...getActivityResponse(activity.id),
                    predictionWarmUp: e.target.value
                  })}
                />
              </div>
            )}

            {/* Chapter 1 */}
            {content.chapter1 && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">{content.chapter1.title}</h3>
                <div className="prose max-w-none mb-4">
                  <p className="text-gray-700 leading-relaxed">{content.chapter1.content}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600"><strong>Summary:</strong> {content.chapter1.summary}</p>
                </div>
              </div>
            )}

            {/* Vocabulary in Context */}
            {content.vocabularyInContext && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">Vocabulary in Context</h3>
                <div className="space-y-3">
                  {content.vocabularyInContext.map((vocab: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <p className="font-medium mb-2">{vocab.text}</p>
                                             {vocab.options && (
                         <div className="space-y-2">
                           {vocab.options.map((option: string, optIndex: number) => (
                             <label key={optIndex} className="flex items-center">
                               <input 
                                 type="radio" 
                                 name={`vocab-${activity.id}-${index}`} 
                                 className="mr-2"
                                 checked={getActivityResponse(activity.id)?.vocabularyInContext?.[index] === option}
                                 onChange={() => handleActivityResponse(activity.id, {
                                   ...getActivityResponse(activity.id),
                                   vocabularyInContext: {
                                     ...getActivityResponse(activity.id)?.vocabularyInContext,
                                     [index]: option
                                   }
                                 })}
                               />
                               {option}
                             </label>
                           ))}
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comprehension Questions */}
            {content.comprehensionQuestions && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-3">Comprehension Questions</h3>
                <div className="space-y-4">
                  {content.comprehensionQuestions.map((question: any, index: number) => (
                    <div key={index} className="bg-white p-4 rounded border">
                      <p className="font-medium mb-3">{question.text}</p>
                                             <div className="space-y-2">
                         {question.options.map((option: string, optIndex: number) => (
                           <label key={optIndex} className="flex items-center">
                             <input 
                               type="radio" 
                               name={`comp-${activity.id}-${index}`} 
                               className="mr-2"
                               checked={getActivityResponse(activity.id)?.comprehensionQuestions?.[index] === option}
                               onChange={() => handleActivityResponse(activity.id, {
                                 ...getActivityResponse(activity.id),
                                 comprehensionQuestions: {
                                   ...getActivityResponse(activity.id)?.comprehensionQuestions,
                                   [index]: option
                                 }
                               })}
                             />
                             {option}
                           </label>
                         ))}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reflection Prompt */}
            {content.reflectionPrompt && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">{content.reflectionPrompt.title}</h3>
                <p className="text-yellow-800 mb-3">{content.reflectionPrompt.prompt}</p>
                <textarea 
                  className="w-full p-2 border border-yellow-300 rounded"
                  placeholder="Write your reflection here..."
                  rows={4}
                  value={getActivityResponse(activity.id)?.reflectionPrompt || ''}
                  onChange={(e) => handleActivityResponse(activity.id, {
                    ...getActivityResponse(activity.id),
                    reflectionPrompt: e.target.value
                  })}
                />
              </div>
            )}
          </div>
        );

      case 'Building Connections':
        return (
          <div className="space-y-6">
            {/* Chapter 1 Review */}
            {content.chapter1Review && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">{content.chapter1Review.title}</h3>
                <div className="space-y-3">
                  {content.chapter1Review.questions.map((question: string, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border">
                      <p className="mb-2">{question}</p>
                      <textarea 
                        className="w-full p-2 border border-blue-300 rounded text-sm"
                        placeholder="Your answer..."
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chapter 2 */}
            {content.chapter2 && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">{content.chapter2.title}</h3>
                <div className="prose max-w-none mb-4">
                  <p className="text-gray-700 leading-relaxed">{content.chapter2.content}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600"><strong>Summary:</strong> {content.chapter2.summary}</p>
                </div>
              </div>
            )}

            {/* Character Spotlight */}
            {content.characterSpotlight && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">{content.characterSpotlight.title}</h3>
                <p className="text-orange-800 mb-3">{content.characterSpotlight.prompt}</p>
                <textarea 
                  className="w-full p-2 border border-orange-300 rounded"
                  placeholder="Write your question here..."
                  rows={3}
                />
              </div>
            )}
          </div>
        );

      case 'Story Climax':
        return (
          <div className="space-y-6">
            {/* Chapter 3 */}
            {content.chapter3 && (
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">{content.chapter3.title}</h3>
                <div className="prose max-w-none mb-4">
                  <p className="text-gray-700 leading-relaxed">{content.chapter3.content}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600"><strong>Summary:</strong> {content.chapter3.summary}</p>
                </div>
              </div>
            )}

            {/* Quick Retell */}
            {content.quickRetell && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">{content.quickRetell.title}</h3>
                <p className="text-green-800 mb-3">{content.quickRetell.prompt}</p>
                <textarea 
                  className="w-full p-2 border border-green-300 rounded"
                  placeholder="Write your retell here..."
                  rows={4}
                />
              </div>
            )}
          </div>
        );

      default:
        // For other activity types (games, creative activities)
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Activity Content</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {JSON.stringify(content, null, 2)}
              </pre>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div className="space-y-6">
              {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'daily'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Daily View
          </button>
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
        </div>
      </div>

        {viewMode === 'daily' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Day Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Weekly Schedule</h3>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const activity = plan.dailyActivities.find(a => a.dayOfWeek === day);
                    const isOptional = day > 5;
                    return (
                      <button
                        key={day}
                        onClick={() => handleDaySelect(day)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedDay === day
                            ? 'bg-blue-100 border-blue-300 border'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Day {day}</span>
                          {isOptional && (
                            <span className="text-xs text-gray-500">Optional</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {activity?.activityType || 'Loading...'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Activity Content */}
            <div className="lg:col-span-3">
              {currentActivity ? (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Day {selectedDay}: {currentActivity.activityType}
                    </h2>
                    {selectedDay > 5 && (
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
                        Optional Activity
                      </span>
                    )}
                  </div>

                  {renderActivityContent(currentActivity)}

                  {/* Navigation */}
                  <div className="flex justify-between mt-8 pt-6 border-t">
                    <button
                      onClick={() => handleDaySelect(Math.max(1, selectedDay - 1))}
                      disabled={selectedDay === 1}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedDay === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Previous Day
                    </button>
                    <button
                      onClick={() => handleDaySelect(Math.min(7, selectedDay + 1))}
                      disabled={selectedDay === 7}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedDay === 7
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Next Day
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Activity Found</h2>
                    <p className="text-gray-600">The selected day's activity could not be loaded.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Overview Mode */
          <div className="space-y-6">
            {/* Story Overview */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
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
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Weekly Schedule Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                {plan.dailyActivities.map((activity) => (
                  <div key={activity.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 mb-2">Day {activity.dayOfWeek}</div>
                      <div className="text-sm text-gray-600 mb-2">{activity.activityType}</div>
                      {activity.dayOfWeek > 5 && (
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