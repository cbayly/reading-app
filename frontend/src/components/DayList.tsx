import React from 'react';
import { Day } from '@/types/weekly-plan';
import { useRouter } from 'next/navigation';

interface DayListProps {
  days: Day[];
  planId: number;
  onDayClick?: (dayIndex: number) => void;
}

export default function DayList({ days, planId, onDayClick }: DayListProps) {
  const router = useRouter();

  const handleDayClick = (day: Day) => {
    if (day.state === 'locked') {
      return; // Don't allow navigation to locked days
    }
    
    if (onDayClick) {
      onDayClick(day.dayIndex);
    } else {
      // Default navigation to day detail page
      router.push(`/plan/${planId}/day/${day.dayIndex}`);
    }
  };

  const getDayActivityCount = (day: Day) => {
    return day.activities.length;
  };

  const getCompletedActivityCount = (day: Day) => {
    return day.activities.filter(activity => activity.isValid).length;
  };

  const getDayTitle = (dayIndex: number) => {
    const titles = [
      'Day 1: Vocabulary Matching',
      'Day 2: Comprehension Matching', 
      'Day 3: Reflection',
      'Day 4: Writing',
      'Day 5: Creative Activities'
    ];
    return titles[dayIndex - 1] || `Day ${dayIndex}`;
  };

  const getDayDescription = (dayIndex: number) => {
    switch (dayIndex) {
      case 1:
        return 'Match vocabulary words with their definitions from the story';
      case 2:
        return 'Match comprehension questions with their answers from the story';
      case 3:
        return 'Reflect on the story and share your thoughts';
      case 4:
        return 'Write creatively about the story';
      case 5:
        return 'Complete creative activities to engage with the story';
      default:
        return 'Complete activities for this day';
    }
  };

  const getDayIcon = (dayIndex: number) => {
    const icons = [
      '📚', // Vocabulary
      '🧠', // Comprehension  
      '💭', // Reflection
      '✍️', // Writing
      '🎨'  // Creative
    ];
    return icons[dayIndex - 1] || '📖';
  };

  const getStateStyles = (state: string) => {
    switch (state) {
      case 'locked':
        return {
          card: 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60',
          icon: 'text-gray-400',
          title: 'text-gray-500',
          description: 'text-gray-400',
          status: 'text-gray-500 bg-gray-200'
        };
      case 'available':
        return {
          card: 'bg-white border-blue-300 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all duration-200',
          icon: 'text-blue-600',
          title: 'text-gray-900',
          description: 'text-gray-600',
          status: 'text-blue-700 bg-blue-100'
        };
      case 'complete':
        return {
          card: 'bg-green-50 border-green-300 cursor-pointer hover:shadow-md transition-all duration-200',
          icon: 'text-green-600',
          title: 'text-gray-900',
          description: 'text-gray-600',
          status: 'text-green-700 bg-green-100'
        };
      default:
        return {
          card: 'bg-white border-gray-300',
          icon: 'text-gray-600',
          title: 'text-gray-900',
          description: 'text-gray-600',
          status: 'text-gray-600 bg-gray-100'
        };
    }
  };

  const getStatusText = (day: Day) => {
    switch (day.state) {
      case 'locked':
        return 'Locked';
      case 'available':
        return 'Available';
      case 'complete':
        const completed = getCompletedActivityCount(day);
        const total = getDayActivityCount(day);
        return `${completed}/${total} Complete`;
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Your 5-Day Reading Journey
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {days.map((day) => {
          const styles = getStateStyles(day.state);
          const isClickable = day.state !== 'locked';
          
          return (
            <div
              key={day.id}
              className={`border-2 rounded-lg p-4 ${styles.card} ${
                isClickable ? 'hover:scale-105' : ''
              }`}
              onClick={() => handleDayClick(day)}
            >
              {/* Day Icon and Number */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{getDayIcon(day.dayIndex)}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles.status}`}>
                  {getStatusText(day)}
                </span>
              </div>
              
              {/* Day Title */}
              <h3 className={`font-semibold text-sm mb-2 ${styles.title}`}>
                {getDayTitle(day.dayIndex)}
              </h3>
              
              {/* Day Description */}
              <p className={`text-xs mb-3 ${styles.description}`}>
                {getDayDescription(day.dayIndex)}
              </p>
              
              {/* Activity Progress (for complete days) */}
              {day.state === 'complete' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Activities</span>
                    <span>{getCompletedActivityCount(day)}/{getDayActivityCount(day)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      className="bg-green-500 h-1 rounded-full"
                      style={{ 
                        width: `${(getCompletedActivityCount(day) / getDayActivityCount(day)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Locked Day Message */}
              {day.state === 'locked' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-400 italic">
                    Complete previous days to unlock
                  </p>
                </div>
              )}
              
              {/* Available Day CTA */}
              {day.state === 'available' && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-blue-600 font-medium">
                    Click to start →
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">Progress Summary</h3>
            <p className="text-sm text-blue-700">
              {days.filter(d => d.state === 'complete').length} of 5 days completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">
              {Math.round((days.filter(d => d.state === 'complete').length / 5) * 100)}%
            </div>
            <div className="text-xs text-blue-600">Complete</div>
          </div>
        </div>
      </div>
    </div>
  );
}
