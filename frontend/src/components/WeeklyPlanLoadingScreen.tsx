import React, { useState, useEffect, useMemo } from 'react';

interface WeeklyPlanLoadingScreenProps {
  studentName: string;
  isVisible: boolean;
  onComplete?: () => void;
  estimatedDuration?: number; // Duration in milliseconds
}

const WeeklyPlanLoadingScreen: React.FC<WeeklyPlanLoadingScreenProps> = ({
  studentName,
  isVisible,
  onComplete,
  estimatedDuration = 60000 // Default 60 seconds for weekly plan generation
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

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
    "Gathering the rainbow colors for a colorful story…",
    "Consulting the ancient scrolls of storytelling wisdom…",
    "Teaching the phoenix to rise from the story ashes…",
    "Gathering the whispers of the wind for plot inspiration…",
    "Asking the stars to align for the perfect narrative…",
    "Teaching the mermaids to sing story melodies…",
    "Unlocking the door to the library of infinite tales…",
    "Gathering the echoes of forgotten legends…",
    "Teaching the time travelers to navigate story timelines…",
    "Asking the crystal mountains for story structure advice…",
    "Gathering the dreams of sleeping giants…",
    "Teaching the shadow creatures to dance in story light…",
    "Unlocking the vault of character personalities…",
    "Gathering the morning dew for fresh story beginnings…",
    "Asking the thunder for dramatic story moments…",
    "Teaching the river spirits to flow through story pages…",
    "Gathering the autumn leaves for story endings…",
    "Unlocking the secrets of the story universe…",
    "Teaching the winter winds to carry story magic…",
    "Gathering the spring blossoms for story renewal…",
    "Asking the summer sun to warm the story hearts…"
  ];

  // Function to shuffle array and get random items
  const getRandomSteps = () => {
    const shuffled = [...allLoadingMessages].sort(() => 0.5 - Math.random());
    // Get more steps for longer estimated duration
    const stepCount = Math.max(6, Math.min(12, Math.ceil(estimatedDuration / 8000)));
    return shuffled.slice(0, stepCount);
  };

  // Use useMemo to ensure steps are only generated once per loading session
  const steps = useMemo(() => getRandomSteps(), [estimatedDuration]);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setIsAnimating(false);
      setProgress(0);
      setStartTime(null);
      setElapsedTime(0);
      return;
    }

    setIsAnimating(true);
    const currentStartTime = Date.now();
    setStartTime(currentStartTime);
    setProgress(0);
    setElapsedTime(0);
    
    // Progress update interval (every 500ms for smooth progress bar)
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - currentStartTime;
      setElapsedTime(elapsed);
      const newProgress = Math.min((elapsed / estimatedDuration) * 100, 95); // Cap at 95% until complete
      setProgress(newProgress);
      
      // Update current step based on progress
      const stepProgress = (elapsed / estimatedDuration) * steps.length;
      const newStep = Math.min(Math.floor(stepProgress), steps.length - 1);
      setCurrentStep(newStep);
    }, 500);

    return () => {
      clearInterval(progressInterval);
    };
  }, [isVisible, estimatedDuration, steps.length]);

  // Handle completion
  useEffect(() => {
    if (onComplete && !isVisible && isAnimating) {
      setProgress(100);
      setIsAnimating(false);
      onComplete();
    }
  }, [isVisible, onComplete, isAnimating]);

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
                width: `${progress}%` 
              }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 mt-2 space-y-1">
            <p>{Math.round(progress)}% complete</p>
            <p>{Math.round(elapsedTime / 1000)}s elapsed</p>
            {elapsedTime > estimatedDuration && (
              <p className="text-orange-600">Taking a bit longer than usual...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlanLoadingScreen; 