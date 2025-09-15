'use client';

import React from 'react';

export type LayoutMode = 'reading' | 'split' | 'activity';

interface LayoutBarProps {
  mode: LayoutMode;
  onChangeMode: (mode: LayoutMode) => void;
  progress?: number;
  dayIndex?: number;
  planName?: string;
  subtitle?: string;
  isLoading?: boolean;
  onBack?: () => void;
  onPrint?: () => void;
  // When true, hide the center mode selector (Reading / Split / Activity)
  hideModeSelector?: boolean;
}

const LayoutBar: React.FC<LayoutBarProps> = ({
  mode,
  onChangeMode,
  progress = 0,
  dayIndex,
  planName,
  subtitle,
  isLoading = false,
  onBack,
  onPrint,
  hideModeSelector = false
}) => {
  const modes: { key: LayoutMode; label: string; icon: string; mobileHidden?: boolean }[] = [
    { key: 'reading', label: 'Reading', icon: '📖' },
    { key: 'split', label: 'Split', icon: '⚡', mobileHidden: true },
    { key: 'activity', label: 'Activity', icon: '✏️' }
  ];

  // Mobile detection hook
  const useIsMobile = () => {
    const [isMobile, setIsMobile] = React.useState(() => 
      typeof window !== 'undefined' ? window.matchMedia("(max-width: 767px)").matches : false
    );

    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      
      const mq = window.matchMedia("(max-width: 767px)");
      const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
      
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }, []);

    return isMobile;
  };

  const isMobile = useIsMobile();

  // Prevent split mode on mobile
  React.useEffect(() => {
    if (isMobile && mode === 'split') {
      onChangeMode('reading');
    }
  }, [isMobile, mode, onChangeMode]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts if no input is focused
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'r':
          event.preventDefault();
          onChangeMode('reading');
          break;
        case 's':
          event.preventDefault();
          // Don't allow split mode on mobile, when loading, or when selector is hidden
          if (!isMobile && !isLoading && !hideModeSelector) {
            onChangeMode('split');
          }
          break;
        case 'a':
          event.preventDefault();
          // Don't allow activity mode when loading or when selector is hidden
          if (!isLoading && !hideModeSelector) {
            onChangeMode('activity');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onChangeMode, isMobile, isLoading, hideModeSelector]);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center max-w-7xl mx-auto">
        {/* Left side - Plan info */}
        <div className="justify-self-start flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {planName && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{planName}</span>
              {subtitle && <span className="ml-2">• {subtitle}</span>}
              {dayIndex && <span className="ml-2">• Day {dayIndex}</span>}
            </div>
          )}
        </div>

        {/* Center - Layout mode selector */}
        <div className="justify-self-center">
          {!hideModeSelector && (
            <div 
              role="radiogroup" 
              aria-label="View mode" 
              className="inline-flex rounded-2xl bg-gray-100 p-1 shadow-sm"
            >
              {modes.map((modeOption, index) => {
                // Hide split button on mobile
                if (modeOption.mobileHidden && isMobile) {
                  return null;
                }
                
                // Disable split and activity modes while loading
                const isDisabled = isLoading && (modeOption.key === 'split' || modeOption.key === 'activity');
                
                return (
                  <React.Fragment key={modeOption.key}>
                    <button
                      role="radio"
                      aria-checked={mode === modeOption.key}
                      onClick={() => !isDisabled && onChangeMode(modeOption.key)}
                      disabled={isDisabled}
                      className={`
                        relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                        ${isDisabled 
                          ? 'opacity-40 cursor-not-allowed text-gray-400 bg-gray-100 border border-gray-200'
                          : mode === modeOption.key
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-500 ring-opacity-30'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                      `}
                      title={isDisabled 
                        ? 'Activities are being generated...' 
                        : `Switch to ${modeOption.label} view (Press ${modeOption.key.toUpperCase()})`
                      }
                    >
                      <span className="flex items-center space-x-2">
                        <span>{modeOption.icon}</span>
                        <span>{modeOption.label}</span>
                        {isDisabled && (
                          <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-blue-600"></div>
                        )}
                      </span>
                    </button>
                    {index < modes.length - 1 && (
                      <div className="w-2" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side - Progress and Actions */}
        <div className="justify-self-end flex items-center space-x-4">
          {onPrint && (
            <button
              onClick={onPrint}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Print"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          )}
          {progress > 0 && (
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">Progress</div>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile layout mode selector - REMOVED to prevent duplicate tabs */}
    </div>
  );
};

export default LayoutBar;
