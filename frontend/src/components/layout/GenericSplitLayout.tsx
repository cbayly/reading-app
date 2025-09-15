'use client';

import React, { useState, useEffect } from 'react';
import LayoutBar, { LayoutMode } from './LayoutBar';
import ResizableSplit from './ResizableSplit';

export interface GenericSplitLayoutProps {
  readingContent: React.ReactNode;
  activityContent: React.ReactNode;
  title: string;
  subtitle?: string;
  onViewChange?: (view: LayoutMode) => void;
  defaultView?: LayoutMode;
  // Optional controlled view. If provided, layout will sync to this value.
  view?: LayoutMode;
  showViewTabs?: boolean;
  isLoading?: boolean;
  onBack?: () => void;
  className?: string;
  // Background utility classes for the page container (override default)
  backgroundClassName?: string;
  printConfig?: {
    readingPrintable?: boolean;
    activitiesPrintable?: boolean;
  };
  // Hide the center view mode selector
  hideModeSelector?: boolean;
  // Printing strategy
  printStrategy?: 'browser' | 'iframe';
  // CSS selector of the element to print (used by iframe strategy)
  printTargetSelector?: string;
  // Split view configuration
  splitConfig?: {
    defaultSplitValue?: number;
    minLeftWidth?: number;
    minRightWidth?: number;
    showDivider?: boolean;
  };
  // Loading states
  readingLoading?: boolean;
  activityLoading?: boolean;
  loadingMessage?: string;
}

const GenericSplitLayout: React.FC<GenericSplitLayoutProps> = ({
  readingContent,
  activityContent,
  title,
  subtitle,
  onViewChange,
  defaultView = 'reading',
  view,
  showViewTabs = true,
  isLoading = false,
  onBack,
  className = '',
  backgroundClassName = 'bg-gray-50',
  printConfig = { readingPrintable: true, activitiesPrintable: true },
  printStrategy = 'browser',
  printTargetSelector = '.print-content',
  splitConfig = {
    defaultSplitValue: 0.5,
    minLeftWidth: 300,
    minRightWidth: 400,
    showDivider: true
  },
  readingLoading = false,
  activityLoading = false,
  loadingMessage = 'Loading...',
  hideModeSelector = false
}) => {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(defaultView);
  const [splitValue, setSplitValue] = useState(splitConfig.defaultSplitValue || 0.5);

  // Sync with controlled view if provided
  useEffect(() => {
    if (view && view !== layoutMode) {
      setLayoutMode(view);
    }
  }, [view, layoutMode]);

  // Handle layout mode changes
  const handleLayoutModeChange = (newMode: LayoutMode) => {
    // Don't allow switching to split or activity while loading
    if (isLoading && (newMode === 'split' || newMode === 'activity')) {
      return;
    }
    
    setLayoutMode(newMode);
    onViewChange?.(newMode);
  };

  // Auto-switch to reading view if activities are loading and user is in split/activity mode
  useEffect(() => {
    if (activityLoading && (layoutMode === 'split' || layoutMode === 'activity')) {
      setLayoutMode('reading');
      onViewChange?.('reading');
    }
  }, [activityLoading, layoutMode, onViewChange]);

  // Handle print functionality
  const printViaIframe = (selector: string) => {
    if (typeof document === 'undefined') return;
    const target = document.querySelector(selector) as HTMLElement | null;
    if (!target) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Print</title>
    <style>
      html, body { margin: 0; padding: 0; }
      body { color: #000; font: 14pt/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
      .print-root { width: 100%; max-width: none; }
      /* Ensure no clipping */
      .print-root, .print-root * { overflow: visible !important; height: auto !important; max-height: none !important; }
      .reading-passage { width: 100% !important; }
      @page { margin: 2cm; }
    </style>
  </head>
  <body>
    <div class="print-root">${target.outerHTML}</div>
  </body>
</html>`;

    doc.open();
    doc.write(html);
    doc.close();

    const win = iframe.contentWindow;
    if (!win) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    // Give the iframe a tick to layout before printing
    setTimeout(() => {
      win.focus();
      win.print();
      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    }, 100);
  };

  const handlePrint = () => {
    if (layoutMode === 'reading' && printConfig.readingPrintable) {
      if (printStrategy === 'iframe') {
        printViaIframe(printTargetSelector);
      } else {
        window.print();
      }
    } else if (layoutMode === 'activity' && printConfig.activitiesPrintable) {
      if (printStrategy === 'iframe') {
        printViaIframe(printTargetSelector);
      } else {
        window.print();
      }
    } else if (layoutMode === 'split') {
      // For split view, print both sections
      if (printStrategy === 'iframe') {
        printViaIframe(printTargetSelector);
      } else {
        window.print();
      }
    }
  };

  // Allow children to request printing via a custom event
  useEffect(() => {
    const onGenericPrint = () => handlePrint();
    if (typeof window !== 'undefined') {
      window.addEventListener('generic-print', onGenericPrint as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('generic-print', onGenericPrint as EventListener);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutMode, printStrategy, printTargetSelector, printConfig]);

  // Loading component
  const LoadingSpinner = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );

  // Main content renderer
  const renderMainContent = () => {
    if (layoutMode === 'reading') {
      return (
        <div className="h-full">
          {readingLoading ? (
            <LoadingSpinner message={loadingMessage} />
          ) : (
            readingContent
          )}
        </div>
      );
    }

    if (layoutMode === 'activity') {
      return (
        <div className="h-full">
          {activityLoading ? (
            <LoadingSpinner message="Generating activities..." />
          ) : (
            activityContent
          )}
        </div>
      );
    }

    if (layoutMode === 'split') {
      return (
        <ResizableSplit
          left={
            <div className="h-full overflow-auto min-w-0">
              {readingLoading ? (
                <LoadingSpinner message={loadingMessage} />
              ) : (
                readingContent
              )}
            </div>
          }
          right={
            <div className="h-full overflow-auto min-w-0">
              {activityLoading ? (
                <LoadingSpinner message="Generating activities..." />
              ) : (
                activityContent
              )}
            </div>
          }
          value={splitValue}
          onChange={setSplitValue}
          minLeftWidth={splitConfig.minLeftWidth || 300}
          minRightWidth={splitConfig.minRightWidth || 400}
          className="h-full"
          disabled={!splitConfig.showDivider}
        />
      );
    }

    return null;
  };

  return (
    <div className={`min-h-screen ${backgroundClassName} ${className}`}>
      {/* Layout Bar */}
      {showViewTabs && (
        <LayoutBar
          mode={layoutMode}
          onChangeMode={handleLayoutModeChange}
          progress={0} // Progress is handled by individual content components
          dayIndex={undefined} // Not used in generic layout
          planName={title}
          subtitle={subtitle}
          isLoading={isLoading || activityLoading}
          onBack={onBack}
          onPrint={
            (layoutMode === 'reading' && printConfig.readingPrintable) ||
            (layoutMode === 'activity' && printConfig.activitiesPrintable) ||
            (layoutMode === 'split' && (printConfig.readingPrintable || printConfig.activitiesPrintable))
              ? handlePrint
              : undefined
          }
          hideModeSelector={hideModeSelector}
        />
      )}

      {/* Main Content */}
      <div className="h-[calc(100vh-80px)]">
        {renderMainContent()}
      </div>
    </div>
  );
};

export default GenericSplitLayout;
