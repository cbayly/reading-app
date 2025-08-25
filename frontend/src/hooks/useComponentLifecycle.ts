import { useEffect, useRef, useCallback, useState } from 'react';
import { useCleanup } from './useCleanup';

export interface ComponentLifecycleState {
  isMounted: boolean;
  isVisible: boolean;
  isActive: boolean;
  mountTime: number;
  lastActivity: number;
}

export interface UseComponentLifecycleOptions {
  onMount?: () => void;
  onUnmount?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
  onActivityChange?: (isActive: boolean) => void;
  autoCleanup?: boolean;
  activityTimeout?: number;
  visibilityThreshold?: number;
}

export interface UseComponentLifecycleReturn {
  state: ComponentLifecycleState;
  isMounted: boolean;
  isVisible: boolean;
  isActive: boolean;
  markActivity: () => void;
  cleanup: () => void;
  forceUnmount: () => void;
}

export function useComponentLifecycle(
  options: UseComponentLifecycleOptions = {}
): UseComponentLifecycleReturn {
  const {
    onMount,
    onUnmount,
    onVisibilityChange,
    onActivityChange,
    autoCleanup = true,
    activityTimeout = 30000, // 30 seconds
    visibilityThreshold = 0.1 // 10% visibility
  } = options;

  const cleanup = useCleanup();
  const [state, setState] = useState<ComponentLifecycleState>({
    isMounted: false,
    isVisible: false,
    isActive: false,
    mountTime: 0,
    lastActivity: 0
  });

  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityObserverRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // Mount effect
  useEffect(() => {
    const mountTime = Date.now();
    setState(prev => ({
      ...prev,
      isMounted: true,
      mountTime,
      lastActivity: mountTime
    }));

    onMount?.();

    return () => {
      // Unmount cleanup
      setState(prev => ({
        ...prev,
        isMounted: false
      }));

      onUnmount?.();
    };
  }, [onMount, onUnmount]);

  // Activity tracking
  const markActivity = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      lastActivity: now,
      isActive: true
    }));

    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      cleanup.remove(() => clearTimeout(activityTimeoutRef.current!));
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isActive: false
      }));
      onActivityChange?.(false);
    }, activityTimeout);

    activityTimeoutRef.current = timeout;
    cleanup.addTimeout(timeout);
  }, [activityTimeout, onActivityChange, cleanup]);

  // Visibility tracking
  const setupVisibilityTracking = useCallback((element: HTMLElement) => {
    if (visibilityObserverRef.current) {
      visibilityObserverRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const isVisible = entry.isIntersecting && entry.intersectionRatio >= visibilityThreshold;
          setState(prev => ({
            ...prev,
            isVisible
          }));
          onVisibilityChange?.(isVisible);
        });
      },
      {
        threshold: visibilityThreshold,
        rootMargin: '0px'
      }
    );

    observer.observe(element);
    visibilityObserverRef.current = observer;
    cleanup.add(() => observer.disconnect());
  }, [visibilityThreshold, onVisibilityChange, cleanup]);

  // Auto-cleanup effect
  useEffect(() => {
    if (!autoCleanup) return;

    return () => {
      // Clear activity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      // Disconnect visibility observer
      if (visibilityObserverRef.current) {
        visibilityObserverRef.current.disconnect();
      }
    };
  }, [autoCleanup]);

  // Manual cleanup function
  const manualCleanup = useCallback(() => {
    cleanup.cleanup();
  }, [cleanup]);

  // Force unmount function
  const forceUnmount = useCallback(() => {
    setState(prev => ({
      ...prev,
      isMounted: false,
      isVisible: false,
      isActive: false
    }));
    manualCleanup();
  }, [manualCleanup]);

  return {
    state,
    isMounted: state.isMounted,
    isVisible: state.isVisible,
    isActive: state.isActive,
    markActivity,
    cleanup: manualCleanup,
    forceUnmount,
    setupVisibilityTracking
  };
}

// Specialized lifecycle hooks
export function usePlan3ComponentLifecycle(componentName: string) {
  const lifecycle = useComponentLifecycle({
    onMount: () => {
      console.log(`[${componentName}] Component mounted`);
    },
    onUnmount: () => {
      console.log(`[${componentName}] Component unmounted`);
    },
    onVisibilityChange: (isVisible) => {
      console.log(`[${componentName}] Visibility changed: ${isVisible}`);
    },
    onActivityChange: (isActive) => {
      console.log(`[${componentName}] Activity changed: ${isActive}`);
    },
    autoCleanup: true,
    activityTimeout: 60000 // 1 minute for Plan3 components
  });

  return lifecycle;
}

// Hook for managing component subscriptions
export function useComponentSubscriptions() {
  const cleanup = useCleanup();
  const subscriptionsRef = useRef<Set<{ unsubscribe: () => void }>>(new Set());

  const addSubscription = useCallback((subscription: { unsubscribe: () => void }) => {
    subscriptionsRef.current.add(subscription);
    cleanup.addSubscription(subscription);
  }, [cleanup]);

  const removeSubscription = useCallback((subscription: { unsubscribe: () => void }) => {
    subscriptionsRef.current.delete(subscription);
    cleanup.remove(() => subscription.unsubscribe());
  }, [cleanup]);

  const clearSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach(subscription => {
      subscription.unsubscribe();
    });
    subscriptionsRef.current.clear();
  }, []);

  return {
    addSubscription,
    removeSubscription,
    clearSubscriptions,
    subscriptionCount: subscriptionsRef.current.size
  };
}

// Hook for managing component timers
export function useComponentTimers() {
  const cleanup = useCleanup();
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const setTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = global.setTimeout(callback, delay);
    timersRef.current.add(timer);
    cleanup.addTimeout(timer);
    return timer;
  }, [cleanup]);

  const setInterval = useCallback((callback: () => void, delay: number) => {
    const timer = global.setInterval(callback, delay);
    timersRef.current.add(timer);
    cleanup.addInterval(timer);
    return timer;
  }, [cleanup]);

  const clearTimer = useCallback((timer: NodeJS.Timeout) => {
    clearTimeout(timer);
    clearInterval(timer);
    timersRef.current.delete(timer);
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    timersRef.current.clear();
  }, []);

  return {
    setTimeout,
    setInterval,
    clearTimer,
    clearAllTimers,
    timerCount: timersRef.current.size
  };
}

// Hook for managing component event listeners
export function useComponentEventListeners() {
  const cleanup = useCleanup();
  const listenersRef = useRef<Array<{
    target: EventTarget;
    type: string;
    listener: EventListener;
    options?: AddEventListenerOptions;
  }>>([]);

  const addEventListener = useCallback((
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) => {
    target.addEventListener(type, listener, options);
    listenersRef.current.push({ target, type, listener, options });
    cleanup.addEventListener(target, type, listener, options);
  }, [cleanup]);

  const removeEventListener = useCallback((
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) => {
    target.removeEventListener(type, listener, options);
    listenersRef.current = listenersRef.current.filter(
      l => !(l.target === target && l.type === type && l.listener === listener)
    );
  }, []);

  const clearAllListeners = useCallback(() => {
    listenersRef.current.forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options);
    });
    listenersRef.current = [];
  }, []);

  return {
    addEventListener,
    removeEventListener,
    clearAllListeners,
    listenerCount: listenersRef.current.length
  };
}

// Hook for managing component abort controllers
export function useComponentAbortControllers() {
  const cleanup = useCleanup();
  const controllersRef = useRef<Set<AbortController>>(new Set());

  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    controllersRef.current.add(controller);
    cleanup.addAbortController(controller);
    return controller;
  }, [cleanup]);

  const abortController = useCallback((controller: AbortController) => {
    controller.abort();
    controllersRef.current.delete(controller);
  }, []);

  const abortAllControllers = useCallback(() => {
    controllersRef.current.forEach(controller => {
      controller.abort();
    });
    controllersRef.current.clear();
  }, []);

  return {
    createAbortController,
    abortController,
    abortAllControllers,
    controllerCount: controllersRef.current.size
  };
}
