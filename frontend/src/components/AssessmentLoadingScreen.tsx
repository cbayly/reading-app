import React, { useState, useEffect, useMemo } from 'react';

interface AssessmentLoadingScreenProps {
  studentName: string;
  isVisible: boolean;
  onComplete?: () => void;
  estimatedDuration?: number; // Estimated duration in milliseconds
}

const AssessmentLoadingScreen: React.FC<AssessmentLoadingScreenProps> = ({
  studentName,
  isVisible,
  onComplete,
  estimatedDuration = 45000 // Default 45 seconds based on observed times
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // All possible loading messages
  const allLoadingMessages = [
    "Dusting off the magic reading lamp…",
    "Teaching the timer to count backwards…",
    "Double‑checking the question goblins didn't sneak in…",
    "Feeding the reading dragon its breakfast…",
    "Charging up the imagination batteries…",
    "Polishing the tricky questions until they sparkle…",
    "Warming up the word counter's fingers…",
    "Asking the story fairies for a sprinkle of adventure…",
    "Making sure the bookworms are ready to cheer you on…",
    "Unlocking the treasure chest of questions…",
    "Training the owl to keep track of time…",
    "Herding the kittens away from the story pages…",
    "Teaching the parrot to ask the tricky questions…",
    "Making sure the puppy doesn't chase the commas…",
    "Letting the wise turtle count the words carefully…",
    "Packing the backpack full of stories…",
    "Charging the rocket boosters for your reading journey…",
    "Checking the treasure map for hidden words…",
    "Calibrating the adventure compass…",
    "Gathering clues for the mystery ahead…",
    "Consulting with the AI wizards…",
    "Brewing the perfect reading potion…",
    "Summoning the question crafting spirits…",
    "Weaving the story threads together…",
    "Polishing the comprehension gems…",
    "Fine-tuning the vocabulary magic…",
    "Ensuring every word is just right…",
    "Adding the final sparkles of learning…"
  ];

  // Function to shuffle array and get random items
  const getRandomSteps = () => {
    const shuffled = [...allLoadingMessages].sort(() => 0.5 - Math.random());
    // Get more steps for longer estimated duration
    const stepCount = Math.max(6, Math.min(12, Math.ceil(estimatedDuration / 5000)));
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
    <div className="fixed inset-0 bg-amber-50 flex items-center justify-center z-50">
      <div className="text-center max-w-md mx-4">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-8">
          Creating an assessment...
        </h2>

        {/* Bear Character */}
        <div className="mb-8">
          <div className="relative inline-block">
            {/* Bear body */}
            <div className="w-32 h-32 bg-green-500 rounded-full relative">
              {/* Ears */}
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-green-500 rounded-full"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full"></div>
              
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
              
              {/* Smile */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-4 h-2 border-b-2 border-black rounded-full"></div>
            </div>
            
            {/* Shirt */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-8 bg-orange-400 rounded-t-full"></div>
            
            {/* Book */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-12 bg-blue-400 rounded shadow-lg">
              <div className="absolute inset-1 bg-blue-300 rounded"></div>
              <div className="absolute top-2 left-2 w-2 h-1 bg-white rounded"></div>
              <div className="absolute top-4 left-2 w-3 h-1 bg-white rounded"></div>
              <div className="absolute top-6 left-2 w-2 h-1 bg-white rounded"></div>
            </div>
            
            {/* Arms holding book */}
            <div className="absolute bottom-6 left-4 w-2 h-6 bg-green-500 rounded-full transform rotate-12"></div>
            <div className="absolute bottom-6 right-4 w-2 h-6 bg-green-500 rounded-full transform -rotate-12"></div>
          </div>
        </div>

        {/* Animated Checklist */}
        <div className="space-y-4 max-h-48 overflow-y-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 transition-all duration-500 ${
                index <= currentStep 
                  ? 'opacity-100 transform translate-x-0' 
                  : 'opacity-50 transform translate-x-4'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                index <= currentStep 
                  ? 'bg-green-500 scale-100' 
                  : 'bg-gray-300 scale-75'
              }`}>
                {index <= currentStep && (
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
                index <= currentStep ? 'font-medium' : 'font-normal'
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
              className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${progress}%` 
              }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {Math.round(progress)}% complete
          </p>
          <p className="text-xs text-gray-500 mt-1">
            This usually takes about {Math.round(estimatedDuration / 1000)} seconds
            {elapsedTime > 0 && (
              <span className="ml-2">
                • {Math.round(elapsedTime / 1000)}s elapsed
                {elapsedTime > estimatedDuration && (
                  <span className="text-orange-600 font-medium">
                    • Taking a bit longer than usual
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentLoadingScreen; 