import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutosaveOptions {
  delay?: number;
  onSave?: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  enabled?: boolean;
  saveOnBlur?: boolean;
  saveOnChange?: boolean;
}

interface UseAutosaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  save: (data: any) => Promise<void>;
  saveImmediately: (data: any) => Promise<void>;
  reset: () => void;
  // Event handlers for form inputs
  handleChange: (data: any) => void;
  handleBlur: (data: any) => void;
  // Input props for easy integration
  inputProps: {
    onChange: (data: any) => void;
    onBlur: (data: any) => void;
  };
}

export function useAutosave({
  delay = 800,
  onSave,
  onError,
  onSuccess,
  enabled = true,
  saveOnBlur = true,
  saveOnChange = true,
}: UseAutosaveOptions = {}): UseAutosaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<any>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const save = useCallback(async (data: any) => {
    if (!enabled || !onSave) return;

    // Store the data for potential immediate save
    lastDataRef.current = data;
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        await onSave(data);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        onSuccess?.();
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Autosave failed');
        onError?.(errorObj);
      } finally {
        setIsSaving(false);
      }
    }, delay);
  }, [delay, onSave, onError, onSuccess, enabled]);

  const saveImmediately = useCallback(async (data: any) => {
    if (!enabled || !onSave) return;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      setIsSaving(true);
      await onSave(data);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      onSuccess?.();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Save failed');
      onError?.(errorObj);
      throw errorObj;
    } finally {
      setIsSaving(false);
    }
  }, [onSave, onError, onSuccess, enabled]);

  // Handle onChange events with debouncing
  const handleChange = useCallback((data: any) => {
    if (!enabled || !saveOnChange) return;
    save(data);
  }, [enabled, saveOnChange, save]);

  // Handle onBlur events with immediate save
  const handleBlur = useCallback((data: any) => {
    if (!enabled || !saveOnBlur) return;
    saveImmediately(data);
  }, [enabled, saveOnBlur, saveImmediately]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsSaving(false);
    setHasUnsavedChanges(false);
    lastDataRef.current = null;
  }, []);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    save,
    saveImmediately,
    reset,
    handleChange,
    handleBlur,
    inputProps: {
      onChange: handleChange,
      onBlur: handleBlur,
    },
  };
}

// Specialized hook for activity responses with onBlur and onChange support
interface UseActivityAutosaveOptions {
  planId: number;
  dayIndex: number;
  activityId: string;
  delay?: number;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  enabled?: boolean;
  saveOnBlur?: boolean;
  saveOnChange?: boolean;
}

export function useActivityAutosave({
  planId,
  dayIndex,
  activityId,
  delay = 800,
  onError,
  onSuccess,
  enabled = true,
  saveOnBlur = true,
  saveOnChange = true,
}: UseActivityAutosaveOptions) {
  const saveActivity = useCallback(async (response: any) => {
    try {
      const result = await fetch(`/api/plans/${planId}/days/${dayIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activities: [{
            id: activityId,
            response,
          }],
        }),
      });

      if (!result.ok) {
        throw new Error(`Failed to save activity: ${result.statusText}`);
      }

      return await result.json();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to save activity');
    }
  }, [planId, dayIndex, activityId]);

  return useAutosave({
    delay,
    onSave: saveActivity,
    onError,
    onSuccess,
    enabled,
    saveOnBlur,
    saveOnChange,
  });
}

// Hook for form autosave with validation and event handling
interface UseFormAutosaveOptions<T> {
  initialData: T;
  delay?: number;
  onSave?: (data: T) => Promise<void>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  enabled?: boolean;
  validate?: (data: T) => boolean | string;
  saveOnBlur?: boolean;
  saveOnChange?: boolean;
}

export function useFormAutosave<T>({
  initialData,
  delay = 800,
  onSave,
  onError,
  onSuccess,
  enabled = true,
  validate,
  saveOnBlur = true,
  saveOnChange = true,
}: UseFormAutosaveOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateData = useCallback((dataToValidate: T): boolean => {
    if (!validate) return true;
    
    const result = validate(dataToValidate);
    if (typeof result === 'string') {
      setValidationError(result);
      return false;
    }
    
    setValidationError(null);
    return result;
  }, [validate]);

  const save = useCallback(async (dataToSave: T) => {
    if (!enabled || !onSave) return;
    
    if (!validateData(dataToSave)) {
      throw new Error(validationError || 'Validation failed');
    }

    await onSave(dataToSave);
  }, [enabled, onSave, validateData, validationError]);

  const autosave = useAutosave({
    delay,
    onSave: save,
    onError,
    onSuccess,
    enabled,
    saveOnBlur,
    saveOnChange,
  });

  const updateData = useCallback((updates: Partial<T>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    autosave.handleChange(newData);
  }, [data, autosave]);

  const handleBlur = useCallback(() => {
    autosave.handleBlur(data);
  }, [autosave, data]);

  return {
    ...autosave,
    data,
    setData,
    updateData,
    handleBlur,
    validationError,
    isValid: validationError === null,
  };
}

// Hook for text input autosave with specific event handling
interface UseTextInputAutosaveOptions {
  initialValue?: string;
  delay?: number;
  onSave?: (value: string) => Promise<void>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  enabled?: boolean;
  saveOnBlur?: boolean;
  saveOnChange?: boolean;
}

export function useTextInputAutosave({
  initialValue = '',
  delay = 800,
  onSave,
  onError,
  onSuccess,
  enabled = true,
  saveOnBlur = true,
  saveOnChange = true,
}: UseTextInputAutosaveOptions = {}) {
  const [value, setValue] = useState(initialValue);

  const save = useCallback(async (textValue: string) => {
    if (!enabled || !onSave) return;
    await onSave(textValue);
  }, [enabled, onSave]);

  const autosave = useAutosave({
    delay,
    onSave: save,
    onError,
    onSuccess,
    enabled,
    saveOnBlur,
    saveOnChange,
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (saveOnChange) {
      autosave.handleChange(newValue);
    }
  }, [autosave, saveOnChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const currentValue = e.target.value;
    if (saveOnBlur) {
      autosave.handleBlur(currentValue);
    }
  }, [autosave, saveOnBlur]);

  return {
    ...autosave,
    value,
    setValue,
    inputProps: {
      value,
      onChange: handleChange,
      onBlur: handleBlur,
    },
  };
}
