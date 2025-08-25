import React, { useEffect, useRef } from 'react';

export interface ActivityStep {
  id: string;
  type: 'who' | 'where' | 'sequence' | 'main-idea' | 'vocabulary' | 'predict';
  label: string;
  completed?: boolean;
  accessible?: boolean;
}

export interface ActivityStepperProps {
  steps: ActivityStep[];
  currentIndex: number;
  onStepClick: (index: number) => void;
  className?: string;
  'aria-label'?: string;
}

const ActivityStepper: React.FC<ActivityStepperProps> = ({
  steps,
  currentIndex,
  onStepClick,
  className = '',
  'aria-label': ariaLabel = 'Activity navigation'
}) => {
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Focus management for keyboard navigation
  useEffect(() => {
    if (stepRefs.current[currentIndex]) {
      stepRefs.current[currentIndex]?.focus();
    }
  }, [currentIndex]);

  const getActivityTypeIcon = (type: string) => {
    const icons = {
      who: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      ),
      where: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      ),
      sequence: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
      ),
      'main-idea': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
      ),
      vocabulary: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
      ),
      predict: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
      )
    };
    return icons[type as keyof typeof icons] || (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) {
          onStepClick(index - 1);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (index < steps.length - 1) {
          onStepClick(index + 1);
        }
        break;
      case 'Home':
        event.preventDefault();
        onStepClick(0);
        break;
      case 'End':
        event.preventDefault();
        onStepClick(steps.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onStepClick(index);
        break;
    }
  };

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className={`mb-6 ${className}`}>
      <div 
        className="grid grid-cols-6 gap-4 sm:gap-6 max-w-4xl mx-auto" 
        role="tablist" 
        aria-label={ariaLabel}
      >
        {steps.map((step, index) => {
          const isCompleted = step.completed;
          const isCurrent = index === currentIndex;
          const isAccessible = step.accessible !== false;
          
          return (
            <button
              key={step.id}
              ref={(el) => (stepRefs.current[index] = el)}
              onClick={() => isAccessible && onStepClick(index)}
              disabled={!isAccessible}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                inline-grid w-full justify-items-center text-center focus-ring
                transition-all duration-200
                ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
              role="tab"
              aria-selected={isCurrent}
              aria-label={`${step.label} activity ${index + 1}${isCompleted ? ' completed' : ''}`}
              title={`${step.label} activity ${index + 1}`}
              tabIndex={isCurrent ? 0 : -1}
            >
              {/* Icon circle */}
              <div 
                className={`
                  grid place-items-center h-12 w-12 rounded-full border-2 
                  transition-all duration-200 focus:ring-2 focus:ring-offset-2
                  ${isCurrent 
                    ? 'border-blue-500 bg-blue-500 text-white shadow-lg focus:ring-blue-300' 
                    : isCompleted 
                      ? 'border-green-500 bg-green-500 text-white focus:ring-green-300' 
                      : isAccessible 
                        ? 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 focus:ring-gray-300' 
                        : 'border-gray-200 bg-gray-100 text-gray-400'
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : (
                  getActivityTypeIcon(step.type)
                )}
              </div>
              
              {/* Label */}
              <span 
                className={`
                  mt-2 text-xs font-medium leading-5 transition-colors
                  ${isCurrent 
                    ? 'text-blue-600' 
                    : isCompleted 
                      ? 'text-green-600' 
                      : 'text-gray-500'
                  }
                `}
              >
                {step.label}
              </span>
              
              {/* Step number */}
              <span 
                className={`
                  mt-1 text-xs transition-colors
                  ${isCurrent 
                    ? 'text-blue-600' 
                    : isCompleted 
                      ? 'text-green-600' 
                      : 'text-gray-400'
                  }
                `}
              >
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Progress bar */}
      <div className="mt-4 max-w-4xl mx-auto">
        <div className="relative">
          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
            <div 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500 ease-out"
              style={{ 
                width: `${((currentIndex + 1) / steps.length) * 100}%` 
              }}
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Progress</span>
          <span>{currentIndex + 1} of {steps.length}</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityStepper;
