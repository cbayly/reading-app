import React from 'react';

// Skeleton Loader Components
export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = false,
  animated = true
}) => {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  return (
    <div
      className={`
        bg-gray-200 ${rounded ? 'rounded' : ''} 
        ${animated ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
    />
  );
};

// Text Skeleton
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = ''
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="1rem"
        width={i === lines - 1 ? '75%' : '100%'}
        rounded
      />
    ))}
  </div>
);

// Card Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
    <div className="space-y-3">
      <Skeleton height="1.5rem" width="60%" rounded />
      <TextSkeleton lines={3} />
      <div className="flex space-x-2">
        <Skeleton height="2rem" width="80px" rounded />
        <Skeleton height="2rem" width="60px" rounded />
      </div>
    </div>
  </div>
);

// Activity Skeleton
export const ActivitySkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg border p-4 ${className}`}>
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <Skeleton width={24} height={24} rounded />
        <Skeleton height="1.25rem" width="40%" rounded />
      </div>
      <TextSkeleton lines={2} />
      <div className="space-y-2">
        <Skeleton height="2.5rem" rounded />
        <Skeleton height="2.5rem" rounded />
      </div>
    </div>
  </div>
);

// Chapter Skeleton
export const ChapterSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`max-w-4xl mx-auto ${className}`}>
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton height="2rem" width="50%" rounded />
        <Skeleton height="1rem" width="30%" rounded />
      </div>
      
      {/* Content */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <TextSkeleton key={i} lines={Math.floor(Math.random() * 3) + 1} />
        ))}
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Skeleton height="2.5rem" width="100px" rounded />
        <Skeleton height="2.5rem" width="100px" rounded />
      </div>
    </div>
  </div>
);

// Plan3 Page Skeleton
export const Plan3PageSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`min-h-screen bg-gray-50 ${className}`}>
    {/* Header */}
    <div className="bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton width={32} height={32} rounded />
          <div className="space-y-1">
            <Skeleton height="1rem" width="120px" rounded />
            <Skeleton height="0.75rem" width="80px" rounded />
          </div>
        </div>
        <div className="flex space-x-2">
          <Skeleton height="2rem" width="60px" rounded />
          <Skeleton height="2rem" width="60px" rounded />
          <Skeleton height="2rem" width="60px" rounded />
        </div>
      </div>
    </div>
    
    {/* Content */}
    <div className="flex h-[calc(100vh-80px)]">
      {/* Reading Pane */}
      <div className="flex-1 p-6">
        <ChapterSkeleton />
      </div>
      
      {/* Activity Pane */}
      <div className="w-96 border-l bg-white p-6">
        <div className="space-y-4">
          <Skeleton height="1.5rem" width="60%" rounded />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <ActivitySkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Spinner Components
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'primary' | 'white' | 'gray';
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  color = 'primary'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    primary: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Loading Overlay
export interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message = 'Loading...',
  className = ''
}) => {
  if (!isLoading) return <>{children}</>;

  return (
    <div className={`relative ${className}`}>
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        <div className="text-center">
          <Spinner size="lg" className="mb-3" />
          <p className="text-gray-600 font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

// Progress Bar
export interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  showPercentage = false,
  animated = true
}) => (
  <div className={`w-full ${className}`}>
    <div className="flex items-center space-x-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full bg-blue-600 rounded-full transition-all duration-300 ${
            animated ? 'ease-out' : ''
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-sm text-gray-600 font-medium min-w-[3rem]">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  </div>
);

// Loading Button
export interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  loadingText = 'Loading...',
  disabled = false,
  className = '',
  onClick,
  type = 'button'
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={isLoading || disabled}
    className={`
      inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium
      transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `}
  >
    {isLoading && <Spinner size="sm" className="mr-2" />}
    {isLoading ? loadingText : children}
  </button>
);

// Shimmer Effect
export const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`
      relative overflow-hidden bg-gray-200 rounded ${className}
      before:absolute before:inset-0 before:-translate-x-full
      before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r
      before:from-transparent before:via-white/60 before:to-transparent
    `}
  />
);

// Pulse Effect
export const Pulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`
      animate-pulse bg-gray-200 rounded ${className}
    `}
  />
);
