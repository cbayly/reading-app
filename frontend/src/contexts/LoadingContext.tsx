import React, { createContext, useContext, ReactNode } from 'react';
import { usePlan3LoadingStates, LoadingState } from '@/hooks/useLoadingStates';
import { LoadingOverlay, Spinner, ProgressBar } from '@/components/ui/LoadingStates';

interface LoadingContextValue {
  // Loading states management
  states: LoadingState[];
  isLoading: boolean;
  startLoading: (id: string, message?: string) => void;
  stopLoading: (id: string, error?: Error) => void;
  updateProgress: (id: string, progress: number) => void;
  updateMessage: (id: string, message: string) => void;
  clearLoading: (id: string) => void;
  clearAll: () => void;
  getLoadingState: (id: string) => LoadingState | undefined;
  
  // Convenience methods
  startPlanLoading: (planId: string) => void;
  startDayLoading: (planId: string, dayIndex: number) => void;
  startActivityLoading: (activityId: string) => void;
  startStoryLoading: (storyId: string) => void;
  startSaveLoading: (operation: string) => void;
  
  // Utility methods
  getLoadingMessage: () => string | undefined;
  getOverallProgress: () => number;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
  showGlobalLoader?: boolean;
  showProgressBar?: boolean;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({
  children,
  showGlobalLoader = true,
  showProgressBar = true
}) => {
  const loadingStates = usePlan3LoadingStates();

  const contextValue: LoadingContextValue = {
    ...loadingStates
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      
      {/* Global Loading Overlay */}
      {showGlobalLoader && loadingStates.isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <Spinner size="lg" className="mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {loadingStates.getLoadingMessage() || 'Loading...'}
              </h3>
              
              {showProgressBar && loadingStates.getOverallProgress() > 0 && (
                <div className="mt-4">
                  <ProgressBar 
                    progress={loadingStates.getOverallProgress()} 
                    showPercentage 
                  />
                </div>
              )}
              
              <p className="text-sm text-gray-600 mt-4">
                Please wait while we process your request
              </p>
            </div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

// Hook to use loading context
export const useLoading = (): LoadingContextValue => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Hook for component-specific loading
export const useComponentLoading = (componentId: string) => {
  const loading = useLoading();
  
  return {
    isLoading: loading.getLoadingState(componentId)?.isLoading || false,
    message: loading.getLoadingState(componentId)?.message,
    progress: loading.getLoadingState(componentId)?.progress,
    error: loading.getLoadingState(componentId)?.error,
    startLoading: (message?: string) => loading.startLoading(componentId, message),
    stopLoading: (error?: Error) => loading.stopLoading(componentId, error),
    updateProgress: (progress: number) => loading.updateProgress(componentId, progress),
    updateMessage: (message: string) => loading.updateMessage(componentId, message),
    clearLoading: () => loading.clearLoading(componentId)
  };
};

// Hook for operation-specific loading
export const useOperationLoading = (operation: string) => {
  const loading = useLoading();
  const operationId = `operation_${operation}`;
  
  return {
    isLoading: loading.getLoadingState(operationId)?.isLoading || false,
    message: loading.getLoadingState(operationId)?.message,
    progress: loading.getLoadingState(operationId)?.progress,
    error: loading.getLoadingState(operationId)?.error,
    startLoading: (message?: string) => loading.startLoading(operationId, message),
    stopLoading: (error?: Error) => loading.stopLoading(operationId, error),
    updateProgress: (progress: number) => loading.updateProgress(operationId, progress),
    updateMessage: (message: string) => loading.updateMessage(operationId, message),
    clearLoading: () => loading.clearLoading(operationId)
  };
};

// Higher-order component for loading states
export const withLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingId: string
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    const loading = useComponentLoading(loadingId);
    
    return (
      <LoadingOverlay 
        isLoading={loading.isLoading}
        message={loading.message}
      >
        <Component {...props} />
      </LoadingOverlay>
    );
  };
  
  WrappedComponent.displayName = `withLoading(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Loading wrapper component
export const LoadingWrapper: React.FC<{
  loadingId: string;
  children: ReactNode;
  fallback?: ReactNode;
  showOverlay?: boolean;
}> = ({ loadingId, children, fallback, showOverlay = true }) => {
  const loading = useComponentLoading(loadingId);
  
  if (loading.isLoading && fallback) {
    return <>{fallback}</>;
  }
  
  if (loading.isLoading && showOverlay) {
    return (
      <LoadingOverlay 
        isLoading={true}
        message={loading.message}
      >
        {children}
      </LoadingOverlay>
    );
  }
  
  return <>{children}</>;
};
