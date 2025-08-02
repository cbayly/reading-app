import React, { useState, useEffect } from 'react';

interface CompletionCelebrationProps {
  isVisible: boolean;
  dayNumber: number;
  activityType: string;
  onClose: () => void;
}

const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
  isVisible,
  dayNumber,
  activityType,
  onClose
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const getCelebrationMessage = (day: number, type: string) => {
    const messages = [
      "🎉 Amazing work! You've completed another day!",
      "🌟 Fantastic job! You're making great progress!",
      "🏆 Outstanding! You're becoming a reading champion!",
      "💫 Incredible! Your dedication is inspiring!",
      "🎊 Wonderful! You're building strong reading skills!",
      "⭐ Excellent! You're on your way to reading mastery!",
      "🎯 Perfect! You've finished your weekly reading journey!"
    ];
    
    return messages[day - 1] || messages[0];
  };

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'comprehension':
        return '🧠';
      case 'vocabulary':
        return '📚';
      case 'creative':
        return '🎨';
      case 'game':
        return '🎮';
      case 'writing':
        return '✍️';
      case 'review':
        return '📝';
      case 'reflection':
        return '💭';
      default:
        return '🎯';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl transform transition-all duration-500 scale-100">
        {/* Confetti effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`
                }}
              >
                {['🎉', '🎊', '⭐', '🌟', '💫', '✨'][Math.floor(Math.random() * 6)]}
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="relative z-10">
          <div className="text-6xl mb-4 animate-bounce">
            {getActivityIcon(activityType)}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Day {dayNumber} Complete!
          </h2>
          
          <p className="text-gray-600 mb-6">
            {getCelebrationMessage(dayNumber, activityType)}
          </p>

          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-6">
            <div className="text-sm font-medium mb-1">Activity Completed</div>
            <div className="text-lg font-bold">{activityType}</div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <span>✅</span>
              <span>Great effort!</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <span>📈</span>
              <span>Your reading skills are improving!</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
              <span>🎯</span>
              <span>Ready for the next challenge!</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            Continue Reading Journey
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionCelebration; 