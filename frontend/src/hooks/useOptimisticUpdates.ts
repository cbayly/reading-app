import { useState, useCallback, useRef, useEffect } from 'react';

export interface OptimisticUpdate<T> {
  id: string;
  data: T;
  timestamp: number;
  isOptimistic: boolean;
  status: 'pending' | 'success' | 'error';
  error?: Error;
}

export interface UseOptimisticUpdatesOptions<T> {
  onUpdate?: (data: T) => Promise<void>;
  onError?: (error: Error, originalData: T) => void;
  onSuccess?: (data: T) => void;
  debounceMs?: number;
  maxOptimisticUpdates?: number;
}

export interface UseOptimisticUpdatesReturn<T> {
  data: T | null;
  optimisticData: T | null;
  isUpdating: boolean;
  pendingUpdates: OptimisticUpdate<T>[];
  updateOptimistically: (data: T) => void;
  updateWithPromise: (data: T, promise: Promise<void>) => void;
  rollback: (updateId: string) => void;
  clearOptimisticUpdates: () => void;
}

export function useOptimisticUpdates<T>(
  initialData: T | null,
  options: UseOptimisticUpdatesOptions<T> = {}
): UseOptimisticUpdatesReturn<T> {
  const {
    onUpdate,
    onError,
    onSuccess,
    debounceMs = 300,
    maxOptimisticUpdates = 10
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [optimisticData, setOptimisticData] = useState<T | null>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate<T>[]>([]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateIdCounter = useRef(0);

  // Generate unique update ID
  const generateUpdateId = useCallback(() => {
    return `update_${Date.now()}_${++updateIdCounter.current}`;
  }, []);

  // Apply optimistic update
  const applyOptimisticUpdate = useCallback((newData: T) => {
    setOptimisticData(newData);
    setData(newData);
  }, []);

  // Rollback optimistic update
  const rollbackOptimisticUpdate = useCallback((updateId: string) => {
    setPendingUpdates(prev => {
      const update = prev.find(u => u.id === updateId);
      if (update && update.isOptimistic) {
        // Find the previous valid data
        const previousUpdate = prev
          .filter(u => u.id !== updateId && u.status === 'success')
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        
        const rollbackData = previousUpdate ? previousUpdate.data : initialData;
        setOptimisticData(rollbackData);
        setData(rollbackData);
      }
      return prev.filter(u => u.id !== updateId);
    });
  }, [initialData]);

  // Update optimistically with immediate UI feedback
  const updateOptimistically = useCallback((newData: T) => {
    const updateId = generateUpdateId();
    const update: OptimisticUpdate<T> = {
      id: updateId,
      data: newData,
      timestamp: Date.now(),
      isOptimistic: true,
      status: 'pending'
    };

    // Apply optimistic update immediately
    applyOptimisticUpdate(newData);

    // Add to pending updates
    setPendingUpdates(prev => {
      const newUpdates = [...prev, update];
      // Keep only the latest updates
      if (newUpdates.length > maxOptimisticUpdates) {
        return newUpdates.slice(-maxOptimisticUpdates);
      }
      return newUpdates;
    });

    // Debounced actual update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (onUpdate) {
        try {
          setIsUpdating(true);
          await onUpdate(newData);
          
          // Mark as successful
          setPendingUpdates(prev => 
            prev.map(u => 
              u.id === updateId 
                ? { ...u, status: 'success' as const }
                : u
            )
          );
          
          onSuccess?.(newData);
        } catch (error) {
          const appError = error instanceof Error ? error : new Error('Update failed');
          
          // Mark as error
          setPendingUpdates(prev => 
            prev.map(u => 
              u.id === updateId 
                ? { ...u, status: 'error' as const, error: appError }
                : u
            )
          );
          
          // Rollback on error
          rollbackOptimisticUpdate(updateId);
          onError?.(appError, newData);
        } finally {
          setIsUpdating(false);
        }
      }
    }, debounceMs);

    return updateId;
  }, [applyOptimisticUpdate, generateUpdateId, maxOptimisticUpdates, onUpdate, onSuccess, onError, debounceMs, rollbackOptimisticUpdate]);

  // Update with a specific promise
  const updateWithPromise = useCallback((newData: T, promise: Promise<void>) => {
    const updateId = generateUpdateId();
    const update: OptimisticUpdate<T> = {
      id: updateId,
      data: newData,
      timestamp: Date.now(),
      isOptimistic: true,
      status: 'pending'
    };

    // Apply optimistic update immediately
    applyOptimisticUpdate(newData);

    // Add to pending updates
    setPendingUpdates(prev => [...prev, update]);

    // Handle promise
    promise
      .then(() => {
        setPendingUpdates(prev => 
          prev.map(u => 
            u.id === updateId 
              ? { ...u, status: 'success' as const }
              : u
          )
        );
        onSuccess?.(newData);
      })
      .catch((error) => {
        const appError = error instanceof Error ? error : new Error('Update failed');
        
        setPendingUpdates(prev => 
          prev.map(u => 
            u.id === updateId 
              ? { ...u, status: 'error' as const, error: appError }
              : u
          )
        );
        
        rollbackOptimisticUpdate(updateId);
        onError?.(appError, newData);
      });

    return updateId;
  }, [applyOptimisticUpdate, generateUpdateId, onSuccess, onError, rollbackOptimisticUpdate]);

  // Rollback specific update
  const rollback = useCallback((updateId: string) => {
    rollbackOptimisticUpdate(updateId);
  }, [rollbackOptimisticUpdate]);

  // Clear all optimistic updates
  const clearOptimisticUpdates = useCallback(() => {
    setPendingUpdates([]);
    setOptimisticData(data);
  }, [data]);

  // Update data from external source
  const updateData = useCallback((newData: T) => {
    setData(newData);
    setOptimisticData(newData);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Expose updateData for external use
  useEffect(() => {
    if (initialData !== data) {
      updateData(initialData);
    }
  }, [initialData, updateData]);

  return {
    data,
    optimisticData,
    isUpdating,
    pendingUpdates,
    updateOptimistically,
    updateWithPromise,
    rollback,
    clearOptimisticUpdates
  };
}

// Specialized hook for activity responses
export function useActivityOptimisticUpdates<T>(
  initialData: T | null,
  onSave: (data: T) => Promise<void>
) {
  return useOptimisticUpdates(initialData, {
    onUpdate: onSave,
    debounceMs: 400,
    maxOptimisticUpdates: 5
  });
}

// Specialized hook for form data
export function useFormOptimisticUpdates<T>(
  initialData: T | null,
  onSave: (data: T) => Promise<void>
) {
  return useOptimisticUpdates(initialData, {
    onUpdate: onSave,
    debounceMs: 500,
    maxOptimisticUpdates: 3
  });
}
