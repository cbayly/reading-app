// Error types and utilities for Plan3 application

export interface AppError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  userMessage: string;
}

export interface NetworkError extends AppError {
  status?: number;
  statusText?: string;
  url?: string;
}

export interface ValidationError extends AppError {
  field?: string;
  value?: any;
}

// Error codes
export const ERROR_CODES = {
  // Network errors
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  
  // API errors
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  
  // Application errors
  SAVE_FAILED: 'SAVE_FAILED',
  LOAD_FAILED: 'LOAD_FAILED',
  INVALID_DATA: 'INVALID_DATA',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_OFFLINE]: {
    userMessage: 'You appear to be offline. Please check your internet connection.',
    retryable: true
  },
  [ERROR_CODES.REQUEST_TIMEOUT]: {
    userMessage: 'The request timed out. Please try again.',
    retryable: true
  },
  [ERROR_CODES.SERVER_ERROR]: {
    userMessage: 'Server error occurred. Please try again later.',
    retryable: true
  },
  [ERROR_CODES.UNAUTHORIZED]: {
    userMessage: 'Please log in to continue.',
    retryable: false
  },
  [ERROR_CODES.FORBIDDEN]: {
    userMessage: 'You don\'t have permission to perform this action.',
    retryable: false
  },
  [ERROR_CODES.NOT_FOUND]: {
    userMessage: 'The requested resource was not found.',
    retryable: false
  },
  [ERROR_CODES.API_ERROR]: {
    userMessage: 'An error occurred while communicating with the server.',
    retryable: true
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    userMessage: 'Please check your input and try again.',
    retryable: false
  },
  [ERROR_CODES.RATE_LIMIT]: {
    userMessage: 'Too many requests. Please wait a moment and try again.',
    retryable: true
  },
  [ERROR_CODES.SAVE_FAILED]: {
    userMessage: 'Failed to save your changes. Please try again.',
    retryable: true
  },
  [ERROR_CODES.LOAD_FAILED]: {
    userMessage: 'Failed to load data. Please refresh the page.',
    retryable: true
  },
  [ERROR_CODES.INVALID_DATA]: {
    userMessage: 'Invalid data received. Please refresh the page.',
    retryable: false
  },
  [ERROR_CODES.UNKNOWN_ERROR]: {
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true
  }
} as const;

// Error factory functions
export function createNetworkError(
  error: any,
  url?: string
): NetworkError {
  const status = error?.response?.status;
  const statusText = error?.response?.statusText;
  
  let code = ERROR_CODES.API_ERROR;
  let message = error?.message || 'Network error';
  
  // Determine error code based on status
  if (!navigator.onLine) {
    code = ERROR_CODES.NETWORK_OFFLINE;
    message = 'Network is offline';
  } else if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    code = ERROR_CODES.REQUEST_TIMEOUT;
    message = 'Request timeout';
  } else if (status >= 500) {
    code = ERROR_CODES.SERVER_ERROR;
    message = `Server error: ${status}`;
  } else if (status === 401) {
    code = ERROR_CODES.UNAUTHORIZED;
    message = 'Unauthorized';
  } else if (status === 403) {
    code = ERROR_CODES.FORBIDDEN;
    message = 'Forbidden';
  } else if (status === 404) {
    code = ERROR_CODES.NOT_FOUND;
    message = 'Not found';
  } else if (status === 429) {
    code = ERROR_CODES.RATE_LIMIT;
    message = 'Rate limit exceeded';
  } else if (status >= 400) {
    code = ERROR_CODES.VALIDATION_ERROR;
    message = `Validation error: ${status}`;
  }
  
  return {
    code,
    message,
    details: error,
    retryable: ERROR_MESSAGES[code]?.retryable ?? true,
    userMessage: ERROR_MESSAGES[code]?.userMessage ?? ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR].userMessage,
    status,
    statusText,
    url
  };
}

export function createValidationError(
  field: string,
  value: any,
  message: string
): ValidationError {
  return {
    code: ERROR_CODES.VALIDATION_ERROR,
    message,
    details: { field, value },
    retryable: false,
    userMessage: `Invalid ${field}: ${message}`,
    field,
    value
  };
}

export function createAppError(
  code: keyof typeof ERROR_CODES,
  message: string,
  details?: any
): AppError {
  return {
    code,
    message,
    details,
    retryable: ERROR_MESSAGES[code]?.retryable ?? true,
    userMessage: ERROR_MESSAGES[code]?.userMessage ?? ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR].userMessage
  };
}

// Error handling utilities
export function isRetryableError(error: AppError): boolean {
  return error.retryable;
}

export function shouldRetry(error: AppError, retryCount: number, maxRetries: number): boolean {
  return isRetryableError(error) && retryCount < maxRetries;
}

export function getRetryDelay(retryCount: number, baseDelay: number = 1000, maxDelay: number = 10000): number {
  const delay = baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, maxDelay);
}

// Error logging
export function logError(error: AppError, context?: any) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    retryable: error.retryable,
    details: error.details,
    context
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Application Error:', errorLog);
  }
  
  // TODO: Send to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error);
    console.error('Production Error:', errorLog);
  }
}

// Error recovery strategies
export function getRecoveryStrategy(error: AppError): 'retry' | 'redirect' | 'reload' | 'none' {
  switch (error.code) {
    case ERROR_CODES.UNAUTHORIZED:
      return 'redirect';
    case ERROR_CODES.NETWORK_OFFLINE:
    case ERROR_CODES.REQUEST_TIMEOUT:
    case ERROR_CODES.SERVER_ERROR:
    case ERROR_CODES.API_ERROR:
    case ERROR_CODES.SAVE_FAILED:
    case ERROR_CODES.LOAD_FAILED:
      return 'retry';
    case ERROR_CODES.INVALID_DATA:
      return 'reload';
    default:
      return 'none';
  }
}

// Error boundary utilities
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: AppError) => void
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = createNetworkError(error);
      logError(appError, { function: fn.name, args });
      errorHandler?.(appError);
      throw appError;
    }
  };
}

// Network status monitoring
export function createNetworkMonitor(onStatusChange?: (online: boolean) => void) {
  const handleOnline = () => {
    onStatusChange?.(true);
  };
  
  const handleOffline = () => {
    onStatusChange?.(false);
  };
  
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }
  
  return {
    isOnline: () => navigator.onLine,
    cleanup: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    }
  };
}
