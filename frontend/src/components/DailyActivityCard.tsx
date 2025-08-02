import React, { useState } from 'react';
import { DailyActivity } from '@/types/weekly-plan';

interface DailyActivityCardProps {
  activity: DailyActivity;
  onGenerate?: () => void;
  onResponse?: (response: any) => void;
  onComplete?: (activityId: number) => void;
  isGenerating?: boolean;
  isSubmitting?: boolean;
  canGenerate?: boolean;
  className?: string;
}

const DailyActivityCard: React.FC<DailyActivityCardProps> = ({
  activity,
  onGenerate,
  onResponse,
  onComplete,
  isGenerating = false,
  isSubmitting = false,
  canGenerate = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [studentResponse, setStudentResponse] = useState('');

  const getActivityTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'comprehension':
        return '🧠';
      case 'vocabulary':
        return '📚';
      case 'game':
        return '🎮';
      case 'creative':
        return '🎨';
      case 'writing':
        return '✍️';
      default:
        return '📝';
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'comprehension':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vocabulary':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'game':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'creative':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'writing':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSubmitResponse = () => {
    if (studentResponse.trim() && onResponse) {
      onResponse(studentResponse);
      setStudentResponse('');
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete(activity.id);
    }
  };

  const renderActivityContent = () => {
    if (!activity.content) {
      return (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-4">📝</div>
          <p>No activity content available</p>
        </div>
      );
    }

    // Handle different content types
    if (typeof activity.content === 'string') {
      return (
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700">{activity.content}</p>
        </div>
      );
    }

    // Handle structured content
    if (activity.content.questions) {
      return (
        <div className="space-y-4">
          {activity.content.questions.map((question: any, index: number) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">
                Question {index + 1}
              </h4>
              <p className="text-gray-700 mb-3">{question.text}</p>
              {question.options && (
                <div className="space-y-2">
                  {question.options.map((option: any, optIndex: number) => (
                    <label key={optIndex} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={option}
                        className="text-blue-600"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Handle generic object content
    return (
      <div className="space-y-3">
        {Object.entries(activity.content).map(([key, value]) => (
          <div key={key} className="bg-gray-50 p-3 rounded">
            <h4 className="font-medium text-gray-800 capitalize mb-1">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </h4>
            <p className="text-gray-700 text-sm">
              {typeof value === 'string' ? value : JSON.stringify(value)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderStudentResponse = () => {
    if (!activity.studentResponse) {
      return null;
    }

    return (
      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mt-4">
        <h4 className="font-semibold text-green-800 mb-2">Your Response</h4>
        <div className="text-green-700 text-sm">
          {typeof activity.studentResponse === 'string' 
            ? activity.studentResponse 
            : JSON.stringify(activity.studentResponse)
          }
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border-2 transition-all duration-200 hover:shadow-lg ${
      activity.completed ? 'border-green-200' : 'border-gray-200'
    } ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${getActivityTypeColor(activity.activityType)}`}>
              <span className="text-lg">{getActivityTypeIcon(activity.activityType)}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                Day {activity.dayOfWeek} - {activity.activityType}
              </h3>
              <p className="text-sm text-gray-500">
                {activity.completed ? 'Completed' : 'Not started'}
                {activity.completedAt && (
                  <span className="ml-2">
                    on {new Date(activity.completedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {activity.completed && (
              <div className="flex items-center text-green-600">
                <span className="text-xl mr-1">✅</span>
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Activity content */}
          {activity.content ? (
            renderActivityContent()
          ) : (
            <div className="text-center py-8">
              {canGenerate ? (
                <div className="space-y-4">
                  <div className="text-4xl">🎯</div>
                  <h4 className="font-semibold text-gray-700">Ready to Generate</h4>
                  <p className="text-gray-500 text-sm">
                    Click the button below to generate today's activity
                  </p>
                  <button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Activity'}
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-4">🔒</div>
                  <h4 className="font-semibold mb-2">Activity Locked</h4>
                  <p className="text-sm">Complete the previous day's activity to unlock this one.</p>
                </div>
              )}
            </div>
          )}

          {/* Student response section */}
          {activity.content && !activity.completed && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-3">Your Response</h4>
              <textarea
                value={studentResponse}
                onChange={(e) => setStudentResponse(e.target.value)}
                placeholder="Enter your response here..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  onClick={() => setStudentResponse('')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={!studentResponse.trim() || isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Response'}
                </button>
                {activity.studentResponse && (
                  <button
                    onClick={handleComplete}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Display existing response */}
          {renderStudentResponse()}
        </div>
      )}
    </div>
  );
};

export default DailyActivityCard; 