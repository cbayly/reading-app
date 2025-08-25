import { useEffect, useRef, useCallback } from 'react';

export interface CleanupFunction {
  (): void;
}

export interface CleanupManager {
  add: (cleanup: CleanupFunction) => void;
  addTimeout: (timeout: NodeJS.Timeout) => void;
  addEventListener: (
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) => void;
  addInterval: (interval: NodeJS.Timeout) => void;
  addAbortController: (controller: AbortController) => void;
  addSubscription: (subscription: { unsubscribe: () => void }) => void;
  remove: (cleanup: CleanupFunction) => void;
  clear: () => void;
  cleanup: () => void;
}

export function useCleanup(): CleanupManager {
  const cleanupRef = useRef<Set<CleanupFunction>>(new Set());
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const eventListenersRef = useRef<Array<{
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: AddEventListenerOptions;
  }>>([]);
  const abortControllersRef = useRef<Set<AbortController>>(new Set());
  const subscriptionsRef = useRef<Set<{ unsubscribe: () => void }>>(new Set());

  // Add general cleanup function
  const add = useCallback((cleanup: CleanupFunction) => {
    cleanupRef.current.add(cleanup);
  }, []);

  // Add timeout cleanup
  const addTimeout = useCallback((timeout: NodeJS.Timeout) => {
    timeoutsRef.current.add(timeout);
  }, []);

  // Add interval cleanup
  const addInterval = useCallback((interval: NodeJS.Timeout) => {
    intervalsRef.current.add(interval);
  }, []);

  // Add event listener with automatic cleanup
  const addEventListener = useCallback((
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) => {
    target.addEventListener(type, listener, options);
    eventListenersRef.current.push({ target, type, listener, options });
  }, []);

  // Add abort controller cleanup
  const addAbortController = useCallback((controller: AbortController) => {
    abortControllersRef.current.add(controller);
  }, []);

  // Add subscription cleanup
  const addSubscription = useCallback((subscription: { unsubscribe: () => void }) => {
    subscriptionsRef.current.add(subscription);
  }, []);

  // Remove specific cleanup function
  const remove = useCallback((cleanup: CleanupFunction) => {
    cleanupRef.current.delete(cleanup);
  }, []);

  // Clear all cleanup functions
  const clear = useCallback(() => {
    cleanupRef.current.clear();
    timeoutsRef.current.clear();
    intervalsRef.current.clear();
    eventListenersRef.current = [];
    abortControllersRef.current.clear();
    subscriptionsRef.current.clear();
  }, []);

  // Execute all cleanup functions
  const cleanup = useCallback(() => {
    // Execute general cleanup functions
    cleanupRef.current.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.error('Cleanup function error:', error);
      }
    });

    // Clear timeouts
    timeoutsRef.current.forEach(timeout => {
      try {
        clearTimeout(timeout);
      } catch (error) {
        console.error('Timeout cleanup error:', error);
      }
    });

    // Clear intervals
    intervalsRef.current.forEach(interval => {
      try {
        clearInterval(interval);
      } catch (error) {
        console.error('Interval cleanup error:', error);
      }
    });

    // Remove event listeners
    eventListenersRef.current.forEach(({ target, type, listener, options }) => {
      try {
        target.removeEventListener(type, listener, options);
      } catch (error) {
        console.error('Event listener cleanup error:', error);
      }
    });

    // Abort controllers
    abortControllersRef.current.forEach(controller => {
      try {
        controller.abort();
      } catch (error) {
        console.error('Abort controller cleanup error:', error);
      }
    });

    // Unsubscribe from subscriptions
    subscriptionsRef.current.forEach(subscription => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('Subscription cleanup error:', error);
      }
    });

    // Clear all references
    clear();
  }, [clear]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    add,
    addTimeout,
    addEventListener,
    addInterval,
    addAbortController,
    addSubscription,
    remove,
    clear,
    cleanup
  };
}

// Specialized cleanup hooks
export function useTimeoutCleanup() {
  const cleanup = useCleanup();
  
  const setTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = global.setTimeout(callback, delay);
    cleanup.addTimeout(timeout);
    return timeout;
  }, [cleanup]);

  const setInterval = useCallback((callback: () => void, delay: number) => {
    const interval = global.setInterval(callback, delay);
    cleanup.addInterval(interval);
    return interval;
  }, [cleanup]);

  return { setTimeout, setInterval, cleanup };
}

export function useEventListenerCleanup() {
  const cleanup = useCleanup();
  
  const addEventListener = useCallback((
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) => {
    cleanup.addEventListener(target, type, listener, options);
  }, [cleanup]);

  return { addEventListener, cleanup };
}

export function useAbortControllerCleanup() {
  const cleanup = useCleanup();
  
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    cleanup.addAbortController(controller);
    return controller;
  }, [cleanup]);

  return { createAbortController, cleanup };
}

export function useSubscriptionCleanup() {
  const cleanup = useCleanup();
  
  const addSubscription = useCallback((subscription: { unsubscribe: () => void }) => {
    cleanup.addSubscription(subscription);
  }, [cleanup]);

  return { addSubscription, cleanup };
}

// Hook for async operations with cleanup
export function useAsyncCleanup<T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>
) {
  const cleanup = useCleanup();
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (...args: T): Promise<R> => {
    // Create new abort controller for this operation
    const controller = new AbortController();
    abortControllerRef.current = controller;
    cleanup.addAbortController(controller);

    try {
      const result = await asyncFn(...args);
      
      // Check if operation was aborted
      if (controller.signal.aborted) {
        throw new Error('Operation was cancelled');
      }
      
      return result;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('Operation was cancelled');
      }
      throw error;
    }
  }, [asyncFn, cleanup]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { execute, cancel, cleanup };
}

// Hook for debounced operations with cleanup
export function useDebouncedCleanup<T extends any[], R>(
  fn: (...args: T) => R,
  delay: number
) {
  const cleanup = useCleanup();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debounced = useCallback((...args: T) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      cleanup.remove(() => clearTimeout(timeoutRef.current!));
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      fn(...args);
    }, delay);

    timeoutRef.current = timeout;
    cleanup.addTimeout(timeout);
  }, [fn, delay, cleanup]);

  return { debounced, cleanup };
}

// Hook for throttled operations with cleanup
export function useThrottledCleanup<T extends any[], R>(
  fn: (...args: T) => R,
  delay: number
) {
  const cleanup = useCleanup();
  const lastRunRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttled = useCallback((...args: T) => {
    const now = Date.now();

    if (now - lastRunRef.current >= delay) {
      fn(...args);
      lastRunRef.current = now;
    } else {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        cleanup.remove(() => clearTimeout(timeoutRef.current!));
      }

      // Schedule next execution
      const timeout = setTimeout(() => {
        fn(...args);
        lastRunRef.current = Date.now();
      }, delay - (now - lastRunRef.current));

      timeoutRef.current = timeout;
      cleanup.addTimeout(timeout);
    }
  }, [fn, delay, cleanup]);

  return { throttled, cleanup };
}
