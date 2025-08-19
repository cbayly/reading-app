import React, { useState, useEffect, useMemo } from 'react';

interface WeeklyPlanLoadingScreenProps {
  studentName: string;
  isVisible: boolean;
  onComplete?: () => void;
}

const WeeklyPlanLoadingScreen: React.FC<WeeklyPlanLoadingScreenProps> = ({
  studentName,
  isVisible,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // All possible loading messages for weekly plan generation
  const allLoadingMessages = [
    "Gathering story ingredients from the imagination pantry…",
    "Teaching the story characters their lines…",
    "Brewing a potion of adventure and excitement…",
    "Unfolding the magical story scrolls…",
    "Asking the wise owl for the perfect story theme…",
    "Sprinkling fairy dust on the reading activities…",
    "Teaching the bookworms to dance to the story rhythm…",
    "Unlocking the treasure chest of weekly adventures…",
    "Warming up the creative cauldron…",
    "Gathering the story fairies for a brainstorming session…",
    "Teaching the dragons to breathe friendly fire…",
    "Polishing the crystal ball to see the perfect story…",
    "Asking the forest animals for story ideas…",
    "Charging the imagination batteries for a week of fun…",
    "Teaching the unicorns to gallop through story pages…",
    "Gathering stardust for the perfect reading journey…",
    "Asking the moon for bedtime story inspiration…",
    "Teaching the clouds to rain story ideas…",
    "Unlocking the secret garden of reading adventures…",
    "Gathering the rainbow colors for a colorful story…"
  ];

  // Function to shuffle array and get random items
  const getRandomSteps = () => {
    const shuffled = [...allLoadingMessages].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  };

  // Use useMemo to ensure steps are only generated once per loading session
  const steps = useMemo(() => getRandomSteps(), []);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    
    // Animate through each step with delays
    const stepDelays = [2000, 6000, 12000, 20000]; // Longer delays for story generation
    
    const timers = stepDelays.map((delay, index) => 
      setTimeout(() => {
        if (isVisible) { // Check if still visible before updating
          setCurrentStep(index + 1);
        }
      }, delay)
    );

    // Don't auto-complete, wait for parent to call onComplete
    // The parent will call onComplete when the actual generation is done

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-purple-50 flex items-center justify-center z-50">
      <div className="text-center max-w-md mx-4">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-8">
          Creating your weekly adventure...
        </h2>

        {/* Wizard Character */}
        <div className="mb-8">
          <div className="relative inline-block">
            {/* Wizard body */}
            <div className="w-32 h-32 bg-blue-500 rounded-full relative">
              {/* Hat */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-20 h-12 bg-purple-600 rounded-t-full">
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-yellow-400 rounded-full"></div>
              </div>
              
              {/* Eyes */}
              <div className="absolute top-8 left-6 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-black rounded-full"></div>
              </div>
              <div className="absolute top-8 right-6 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-black rounded-full"></div>
              </div>
              
              {/* Glasses */}
              <div className="absolute top-7 left-5 w-8 h-8 border-2 border-purple-500 rounded-full"></div>
              <div className="absolute top-7 right-5 w-8 h-8 border-2 border-purple-500 rounded-full"></div>
              <div className="absolute top-9 left-9 w-2 h-1 bg-purple-500"></div>
              
              {/* Beard */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-gray-300 rounded-b-full"></div>
              
              {/* Smile */}
              <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-4 h-2 border-b-2 border-black rounded-full"></div>
            </div>
            
            {/* Robe */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-12 bg-purple-600 rounded-t-full"></div>
            
            {/* Magic wand */}
            <div className="absolute bottom-4 right-0 w-16 h-2 bg-yellow-400 rounded-full transform rotate-12">
              <div className="absolute -top-1 right-0 w-3 h-4 bg-yellow-300 rounded-full"></div>
            </div>
            
            {/* Arms */}
            <div className="absolute bottom-8 left-2 w-2 h-8 bg-blue-500 rounded-full transform rotate-12"></div>
            <div className="absolute bottom-8 right-2 w-2 h-8 bg-blue-500 rounded-full transform -rotate-12"></div>
          </div>
        </div>

        {/* Animated Checklist */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 transition-all duration-500 ${
                index < currentStep 
                  ? 'opacity-100 transform translate-x-0' 
                  : 'opacity-50 transform translate-x-4'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                index < currentStep 
                  ? 'bg-purple-500 scale-100' 
                  : 'bg-gray-300 scale-75'
              }`}>
                {index < currentStep && (
                  <svg 
                    className="w-4 h-4 text-white" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
              </div>
              <span className={`text-gray-700 transition-all duration-300 ${
                index < currentStep ? 'font-medium' : 'font-normal'
              }`}>
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="mt-8">
          <div className="w-32 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${(currentStep / steps.length) * 100}%` 
              }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {Math.round((currentStep / steps.length) * 100)}% complete
          </p>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlanLoadingScreen; 