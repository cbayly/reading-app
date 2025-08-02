import { useRef } from 'react';
import { WeeklyPlan, DailyActivity, Chapter } from '@/types/weekly-plan';

export const generatePlanPDF = (planData: WeeklyPlan) => {
  // This function will be used with react-to-print
  // It returns a ref that can be attached to a printable component
  return useRef<HTMLDivElement>(null);
};

export const PrintableWeeklyPlan = ({ plan }: { plan: WeeklyPlan }) => {
  const formatActivityContent = (activity: DailyActivity) => {
    const content = activity.content;
    
    switch (activity.activityType) {
      case 'Story Kickoff':
        return (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">Day {activity.dayOfWeek}: Story Kickoff</h3>
            
            {content.predictionWarmUp && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{content.predictionWarmUp.title}</h4>
                <p className="mb-2">{content.predictionWarmUp.prompt}</p>
                <div className="border-b-2 border-gray-300 pb-2">
                  <span className="text-gray-500">Student Response: </span>
                  {activity.studentResponse?.predictionWarmUp || '_________________'}
                </div>
              </div>
            )}

            {content.chapter1 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{content.chapter1.title}</h4>
                <div className="text-sm leading-relaxed mb-2">
                  {content.chapter1.content}
                </div>
                <p className="text-xs text-gray-600"><strong>Summary:</strong> {content.chapter1.summary}</p>
              </div>
            )}

            {content.vocabularyInContext && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Vocabulary in Context</h4>
                {content.vocabularyInContext.map((vocab: any, index: number) => (
                  <div key={index} className="mb-2">
                    <p className="font-medium">{vocab.text}</p>
                    {vocab.options && (
                      <div className="ml-4">
                        {vocab.options.map((option: string, optIndex: number) => (
                          <div key={optIndex} className="flex items-center">
                            <input 
                              type="radio" 
                              name={`vocab-${activity.id}-${index}`} 
                              disabled
                              checked={activity.studentResponse?.vocabularyInContext?.[index] === option}
                              className="mr-2"
                            />
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {content.comprehensionQuestions && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Comprehension Questions</h4>
                {content.comprehensionQuestions.map((question: any, index: number) => (
                  <div key={index} className="mb-3">
                    <p className="font-medium mb-2">{question.text}</p>
                    <div className="ml-4">
                      {question.options.map((option: string, optIndex: number) => (
                        <div key={optIndex} className="flex items-center">
                          <input 
                            type="radio" 
                            name={`comp-${activity.id}-${index}`} 
                            disabled
                            checked={activity.studentResponse?.comprehensionQuestions?.[index] === option}
                            className="mr-2"
                          />
                          {option}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {content.reflectionPrompt && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{content.reflectionPrompt.title}</h4>
                <p className="mb-2">{content.reflectionPrompt.prompt}</p>
                <div className="border-b-2 border-gray-300 pb-2">
                  <span className="text-gray-500">Student Response: </span>
                  {activity.studentResponse?.reflectionPrompt || '_________________'}
                </div>
              </div>
            )}
          </div>
        );

      case 'Building Connections':
        return (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">Day {activity.dayOfWeek}: Building Connections</h3>
            
            {content.chapter1Review && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{content.chapter1Review.title}</h4>
                {content.chapter1Review.questions.map((question: string, index: number) => (
                  <div key={index} className="mb-2">
                    <p className="mb-1">{question}</p>
                    <div className="border-b-2 border-gray-300 pb-2">
                      <span className="text-gray-500">Answer: </span>
                      {activity.studentResponse?.chapter1Review?.[index] || '_________________'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {content.chapter2 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{content.chapter2.title}</h4>
                <div className="text-sm leading-relaxed mb-2">
                  {content.chapter2.content}
                </div>
                <p className="text-xs text-gray-600"><strong>Summary:</strong> {content.chapter2.summary}</p>
              </div>
            )}

            {content.characterSpotlight && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{content.characterSpotlight.title}</h4>
                <p className="mb-2">{content.characterSpotlight.prompt}</p>
                <div className="border-b-2 border-gray-300 pb-2">
                  <span className="text-gray-500">Student Response: </span>
                  {activity.studentResponse?.characterSpotlight || '_________________'}
                </div>
              </div>
            )}
          </div>
        );

      case 'Story Climax':
        return (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">Day {activity.dayOfWeek}: Story Climax</h3>
            
            {content.chapter3 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{content.chapter3.title}</h4>
                <div className="text-sm leading-relaxed mb-2">
                  {content.chapter3.content}
                </div>
                <p className="text-xs text-gray-600"><strong>Summary:</strong> {content.chapter3.summary}</p>
              </div>
            )}

            {content.quickRetell && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2">{content.quickRetell.title}</h4>
                <p className="mb-2">{content.quickRetell.prompt}</p>
                <div className="border-b-2 border-gray-300 pb-2">
                  <span className="text-gray-500">Student Response: </span>
                  {activity.studentResponse?.quickRetell || '_________________'}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">Day {activity.dayOfWeek}: {activity.activityType}</h3>
            <div className="text-sm">
              <pre className="whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="print-content bg-white p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Weekly Reading Plan
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          {plan.student?.name} • {plan.interestTheme}
        </p>
        <p className="text-sm text-gray-500">
          Generated on {new Date(plan.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Table of Contents */}
      <div className="mb-8 page-break">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Table of Contents</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Story Overview</span>
            <span>1</span>
          </div>
          <div className="flex justify-between">
            <span>Weekly Schedule</span>
            <span>2</span>
          </div>
          {plan.dailyActivities
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((activity, index) => (
              <div key={activity.id} className="flex justify-between">
                <span>Day {activity.dayOfWeek}: {activity.activityType}</span>
                <span>{index + 3}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Story Overview */}
      <div className="mb-8 page-break">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Story Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plan.chapters.map((chapter) => (
            <div key={chapter.id} className="border border-gray-300 p-4 rounded">
              <h3 className="font-semibold text-gray-900 mb-2">{chapter.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{chapter.summary}</p>
              <p className="text-xs text-gray-500">
                {chapter.content.split(' ').length} words
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="mb-8 page-break">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Weekly Schedule</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2 mb-6">
          {plan.dailyActivities.map((activity) => (
            <div key={activity.id} className="border border-gray-300 p-3 rounded text-center">
              <div className="font-bold text-gray-900">Day {activity.dayOfWeek}</div>
              <div className="text-sm text-gray-600">{activity.activityType}</div>
              {activity.dayOfWeek > 5 && (
                <span className="text-xs text-gray-500">(Optional)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Daily Activities */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Daily Activities</h2>
        {plan.dailyActivities
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((activity, index) => (
            <div key={activity.id} className={`mb-8 ${index > 0 ? 'page-break' : ''}`}>
              <div className="border-b border-gray-200 pb-6">
                {formatActivityContent(activity)}
              </div>
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center">
        <p className="text-sm text-gray-500">
          This weekly reading plan was generated specifically for {plan.student?.name} based on their interests and reading level.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          © Reading App - Personalized Learning Plans
        </p>
      </div>
    </div>
  );
}; 