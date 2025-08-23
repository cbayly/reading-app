import React from 'react';

interface AutosaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error?: string | null;
  className?: string;
}

export default function AutosaveIndicator({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  error,
  className = '',
}: AutosaveIndicatorProps) {
  const getStatusInfo = () => {
    if (error) {
      return {
        icon: '❌',
        text: 'Save failed',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    }

    if (isSaving) {
      return {
        icon: '⏳',
        text: 'Saving...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: '💾',
        text: 'Unsaved changes',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
      };
    }

    if (lastSaved) {
      return {
        icon: '✅',
        text: 'All changes saved',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    }

    return {
      icon: '📝',
      text: 'Ready to save',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    };
  };

  const status = getStatusInfo();

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${status.bgColor} ${status.borderColor} ${status.color} ${className}`}>
      {/* Status Icon */}
      <span className="text-base">{status.icon}</span>
      
      {/* Status Text */}
      <span className="font-medium">{status.text}</span>
      
      {/* Last Saved Time */}
      {lastSaved && !isSaving && !hasUnsavedChanges && !error && (
        <span className="text-xs opacity-75">
          {formatLastSaved(lastSaved)}
        </span>
      )}
      
      {/* Error Message */}
      {error && (
        <span className="text-xs opacity-75 max-w-32 truncate" title={error}>
          {error}
        </span>
      )}
      
      {/* Loading Spinner */}
      {isSaving && (
        <svg
          className="animate-spin h-3 w-3"
          xmlns="http://www.w3.org/2000/svg"
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
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CompactAutosaveIndicator({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  error,
  className = '',
}: AutosaveIndicatorProps) {
  const getStatusIcon = () => {
    if (error) return '❌';
    if (isSaving) return '⏳';
    if (hasUnsavedChanges) return '💾';
    if (lastSaved) return '✅';
    return '📝';
  };

  const getTooltipText = () => {
    if (error) return `Save failed: ${error}`;
    if (isSaving) return 'Saving...';
    if (hasUnsavedChanges) return 'Unsaved changes';
    if (lastSaved) return `Last saved: ${lastSaved.toLocaleTimeString()}`;
    return 'Ready to save';
  };

  return (
    <div
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm ${className}`}
      title={getTooltipText()}
    >
      <span className="text-base">{getStatusIcon()}</span>
      
      {isSaving && (
        <svg
          className="animate-spin absolute h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
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
      )}
    </div>
  );
}
