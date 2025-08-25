// Memory management utilities for Plan3 application

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export interface MemoryLeakDetector {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  getMemoryInfo: () => MemoryInfo | null;
  checkForLeaks: () => MemoryLeakReport;
  addCleanupCheck: (componentName: string, cleanupFn: () => void) => void;
  removeCleanupCheck: (componentName: string) => void;
}

export interface MemoryLeakReport {
  timestamp: number;
  memoryInfo: MemoryInfo | null;
  potentialLeaks: string[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
}

// Memory monitoring class
class MemoryMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryInfo[] = [];
  private maxHistorySize = 100;
  private cleanupChecks = new Map<string, () => void>();
  private isMonitoring = false;

  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.recordMemoryUsage();
    }, intervalMs);

    // Initial recording
    this.recordMemoryUsage();
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
  }

  private recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryInfo: MemoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };

      this.memoryHistory.push(memoryInfo);

      // Keep only the latest entries
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
      }
    }
  }

  getMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
    }
    return null;
  }

  checkForLeaks(): MemoryLeakReport {
    const currentMemory = this.getMemoryInfo();
    const potentialLeaks: string[] = [];
    const recommendations: string[] = [];

    if (!currentMemory || this.memoryHistory.length < 2) {
      return {
        timestamp: Date.now(),
        memoryInfo: currentMemory,
        potentialLeaks: [],
        recommendations: ['Insufficient data for leak detection'],
        severity: 'low'
      };
    }

    // Check for memory growth trend
    const recentHistory = this.memoryHistory.slice(-10);
    const memoryGrowth = this.calculateMemoryGrowth(recentHistory);

    if (memoryGrowth > 0.1) { // 10% growth
      potentialLeaks.push('Memory usage is growing steadily');
      recommendations.push('Check for event listeners not being removed');
      recommendations.push('Verify cleanup functions are being called');
    }

    // Check for high memory usage
    const memoryUsagePercentage = currentMemory.usedJSHeapSize / currentMemory.jsHeapSizeLimit;
    if (memoryUsagePercentage > 0.8) {
      potentialLeaks.push('Memory usage is very high (>80%)');
      recommendations.push('Consider implementing memory optimization');
      recommendations.push('Check for large objects being retained');
    }

    // Check for cleanup functions
    if (this.cleanupChecks.size > 0) {
      potentialLeaks.push(`${this.cleanupChecks.size} components may have cleanup issues`);
      recommendations.push('Verify all components have proper cleanup');
    }

    const severity = this.determineSeverity(potentialLeaks.length, memoryUsagePercentage);

    return {
      timestamp: Date.now(),
      memoryInfo: currentMemory,
      potentialLeaks,
      recommendations,
      severity
    };
  }

  private calculateMemoryGrowth(history: MemoryInfo[]): number {
    if (history.length < 2) return 0;

    const first = history[0];
    const last = history[history.length - 1];
    const timeDiff = last.timestamp - first.timestamp;
    const memoryDiff = last.usedJSHeapSize - first.usedJSHeapSize;

    return memoryDiff / timeDiff;
  }

  private determineSeverity(leakCount: number, memoryUsage: number): 'low' | 'medium' | 'high' {
    if (leakCount > 3 || memoryUsage > 0.9) return 'high';
    if (leakCount > 1 || memoryUsage > 0.7) return 'medium';
    return 'low';
  }

  addCleanupCheck(componentName: string, cleanupFn: () => void): void {
    this.cleanupChecks.set(componentName, cleanupFn);
  }

  removeCleanupCheck(componentName: string): void {
    this.cleanupChecks.delete(componentName);
  }

  getMemoryHistory(): MemoryInfo[] {
    return [...this.memoryHistory];
  }

  clearHistory(): void {
    this.memoryHistory = [];
  }
}

// Global memory monitor instance
const globalMemoryMonitor = new MemoryMonitor();

// Memory leak detector hook
export function useMemoryLeakDetector(): MemoryLeakDetector {
  return {
    startMonitoring: () => globalMemoryMonitor.startMonitoring(),
    stopMonitoring: () => globalMemoryMonitor.stopMonitoring(),
    getMemoryInfo: () => globalMemoryMonitor.getMemoryInfo(),
    checkForLeaks: () => globalMemoryMonitor.checkForLeaks(),
    addCleanupCheck: (componentName: string, cleanupFn: () => void) => 
      globalMemoryMonitor.addCleanupCheck(componentName, cleanupFn),
    removeCleanupCheck: (componentName: string) => 
      globalMemoryMonitor.removeCleanupCheck(componentName)
  };
}

// Component cleanup wrapper
export function withMemoryLeakDetection<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  const WrappedComponent: React.FC<P> = (props) => {
    const detector = useMemoryLeakDetector();
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
      // Register cleanup check
      detector.addCleanupCheck(componentName, () => {
        if (cleanupRef.current) {
          cleanupRef.current();
        }
      });

      return () => {
        // Remove cleanup check on unmount
        detector.removeCleanupCheck(componentName);
      };
    }, [detector, componentName]);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withMemoryLeakDetection(${componentName})`;
  return WrappedComponent;
}

// Memory usage formatter
export function formatMemoryUsage(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// Memory usage percentage calculator
export function calculateMemoryUsagePercentage(memoryInfo: MemoryInfo): number {
  return (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
}

// Memory threshold checker
export function checkMemoryThresholds(memoryInfo: MemoryInfo): {
  isHigh: boolean;
  isCritical: boolean;
  percentage: number;
} {
  const percentage = calculateMemoryUsagePercentage(memoryInfo);
  
  return {
    isHigh: percentage > 70,
    isCritical: percentage > 90,
    percentage
  };
}

// Memory optimization utilities
export const MemoryOptimization = {
  // Debounce function calls to reduce memory pressure
  debounce<T extends any[], R>(fn: (...args: T) => R, delay: number): (...args: T) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: T) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        fn(...args);
        timeoutId = null;
      }, delay);
    };
  },

  // Throttle function calls to reduce memory pressure
  throttle<T extends any[], R>(fn: (...args: T) => R, delay: number): (...args: T) => void {
    let lastCall = 0;
    
    return (...args: T) => {
      const now = Date.now();
      
      if (now - lastCall >= delay) {
        fn(...args);
        lastCall = now;
      }
    };
  },

  // Weak reference wrapper for large objects
  createWeakRef<T extends object>(obj: T): WeakRef<T> {
    return new WeakRef(obj);
  },

  // Memory-efficient object pooling
  createObjectPool<T>(factory: () => T, maxSize: number = 10) {
    const pool: T[] = [];
    
    return {
      acquire: (): T => {
        return pool.pop() || factory();
      },
      
      release: (obj: T): void => {
        if (pool.length < maxSize) {
          pool.push(obj);
        }
      },
      
      clear: (): void => {
        pool.length = 0;
      }
    };
  }
};

// Development-only memory debugging
if (process.env.NODE_ENV === 'development') {
  // Expose memory monitor to global scope for debugging
  (window as any).__memoryMonitor = globalMemoryMonitor;
  
  // Auto-start monitoring in development
  globalMemoryMonitor.startMonitoring(10000); // Check every 10 seconds
  
  // Log memory usage periodically
  setInterval(() => {
    const memoryInfo = globalMemoryMonitor.getMemoryInfo();
    if (memoryInfo) {
      const usage = calculateMemoryUsagePercentage(memoryInfo);
      if (usage > 70) {
        console.warn(`High memory usage: ${usage.toFixed(1)}%`);
      }
    }
  }, 30000); // Check every 30 seconds
}
