import React, { useState, useEffect } from 'react';

export interface SavedIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: Error | null;
  retryCount?: number;
  maxRetries?: number;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showText?: boolean;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

const SavedIndicator: React.FC<SavedIndicatorProps> = ({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  error,
  retryCount = 0,
  maxRetries = 3,
  onRetry,
  onDismiss,
  className = '',
  showText = true,
  position = 'bottom-right'
}) => {
  const [showSaved, setShowSaved] = useState(false);

  // Show saved indicator when lastSaved changes
  useEffect(() => {
    if (lastSaved && !isSaving) {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 2000); // Show for 2 seconds

      return () => clearTimeout(timer);
    }
  }, [lastSaved, isSaving]);

  // Don't render if no activity
  if (!isSaving && !showSaved && !hasUnsavedChanges && !error) {
    return null;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  const getStatusContent = () => {
    if (error) {
      const isRetrying = error.message.includes('retrying');
      const isRetryAvailable = retryCount < maxRetries;
      
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        ),
        text: isRetrying 
          ? `Retrying... (${retryCount}/${maxRetries})`
          : isRetryAvailable 
            ? 'Save failed - Click to retry'
            : 'Save failed',
        bgColor: isRetrying ? 'bg-yellow-500' : 'bg-red-500',
        textColor: 'text-white',
        borderColor: isRetrying ? 'border-yellow-600' : 'border-red-600',
        showRetryButton: !isRetrying && isRetryAvailable,
        showDismissButton: !isRetryAvailable
      };
    }

    if (isSaving) {
      return {
        icon: (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        ),
        text: 'Saving...',
        bgColor: 'bg-blue-500',
        textColor: 'text-white',
        borderColor: 'border-blue-600',
        showRetryButton: false,
        showDismissButton: false
      };
    }

    if (showSaved) {
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        ),
        text: 'Saved',
        bgColor: 'bg-green-500',
        textColor: 'text-white',
        borderColor: 'border-green-600',
        showRetryButton: false,
        showDismissButton: false
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        ),
        text: 'Unsaved changes',
        bgColor: 'bg-yellow-500',
        textColor: 'text-white',
        borderColor: 'border-yellow-600',
        showRetryButton: false,
        showDismissButton: false
      };
    }

    return null;
  };

  const status = getStatusContent();
  if (!status) return null;

  return (
    <div
      className={`
        fixed z-50 ${getPositionClasses()} 
        flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg border
        ${status.bgColor} ${status.textColor} ${status.borderColor}
        transition-all duration-300 ease-in-out
        ${showSaved ? 'animate-in slide-in-from-bottom' : ''}
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-label={status.text}
    >
      {status.icon}
      {showText && (
        <span className="text-sm font-medium whitespace-nowrap">
          {status.text}
        </span>
      )}
      
      {/* Retry Button */}
      {status.showRetryButton && onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded text-xs font-medium hover:bg-opacity-30 transition-colors focus-ring"
          aria-label="Retry save"
        >
          Retry
        </button>
      )}
      
      {/* Dismiss Button */}
      {status.showDismissButton && onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded text-xs font-medium hover:bg-opacity-30 transition-colors focus-ring"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SavedIndicator;
