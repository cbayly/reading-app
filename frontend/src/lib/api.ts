import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  CreatePlanRequest, 
  UpdateDayActivitiesRequest, 
  CompletePlanRequest,
  PlanResponse,
  DayResponse
} from '@/types/weekly-plan';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      try {
        Cookies.remove('token');
      } catch {}
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getAssessments = async () => {
  const response = await api.get('/assessments');
  return response.data;
};

export const createAssessment = async (studentId: number) => {
  const response = await api.post('/assessments', { studentId });
  return response.data;
};

export const saveReadingProgress = async (assessmentId: string, readingTime: number, errorCount: number) => {
  const response = await api.put(`/assessments/${assessmentId}/reading`, {
    readingTime,
    errorCount
  });
  return response.data;
};

export const deleteStudent = async (studentId: number) => {
  const response = await api.delete(`/students/${studentId}`);
  return response.data;
};

export const updateStudent = async (studentId: number, studentData: any) => {
  const response = await api.put(`/students/${studentId}`, studentData);
  return response.data;
};

export const getStudent = async (studentId: number) => {
  const response = await api.get(`/students/${studentId}`);
  return response.data;
};

// Weekly Plan API functions
export const generatePlan = async (studentId: number) => {
  const response = await api.post('/plans/generate', { studentId });
  return response.data;
};

export const regeneratePlan = async (studentId: number) => {
  const response = await api.post('/plans/generate', { studentId, force: true });
  return response.data;
};

export const generateDayActivity = async (planId: number, dayOfWeek: number, activityType: string) => {
  const response = await api.post('/plans/activity/generate', {
    planId,
    dayOfWeek,
    activityType
  });
  return response.data;
};

// Legacy function for backward compatibility - now redirects to getPlanById
export const getPlan = async (planId: number) => {
  return await getPlanById(planId);
};

export const saveActivityResponse = async (activityId: number, response: any, markCompleted: boolean = true) => {
  const apiResponse = await api.put(`/plans/activity/${activityId}`, { 
    response,
    markCompleted 
  });
  return apiResponse.data;
};

// New 5-Day Plan API functions
export const createPlan = async (request: CreatePlanRequest): Promise<PlanResponse> => {
  const response = await api.post('/plans', request);
  return response.data;
};

export const getPlanById = async (planId: number): Promise<PlanResponse> => {
  const response = await api.get(`/plans/${planId}`);
  return response.data;
};

export const getPlanByStudentId = async (studentId: number): Promise<PlanResponse | null> => {
  try {
    // Updated to use 3-day plan endpoint
    const response = await api.get(`/plan3/student/${studentId}`);
    return response.data;
  } catch (error: any) {
    // Handle 404 as "no plan yet" instead of error
    if (error?.response?.status === 404) {
      return null; // no plan exists yet
    }
    throw error; // re-throw other errors
  }
};

export const getPlan3ById = async (planId: string): Promise<any> => {
  const response = await api.get(`/plan3/${planId}`);
  return response.data;
};

export const getPlan3DayDetails = async (planId: string, dayIndex: number): Promise<any> => {
  const response = await api.get(`/plan3/${planId}/day/${dayIndex}`);
  return response.data;
};

export const deleteCurrentPlanForStudent = async (studentId: number) => {
  const response = await api.delete(`/plans/student/${studentId}`);
  return response.data;
};

export const deleteCurrentPlan3ForStudent = async (studentId: number) => {
  const response = await api.delete(`/plan3/student/${studentId}`);
  return response.data;
};

export const updateDayActivities = async (planId: number, dayIndex: number, activities: any[]): Promise<DayResponse> => {
  const response = await api.put(`/plans/${planId}/days/${dayIndex}`, { activities });
  return response.data;
};

export const completePlan = async (planId: number): Promise<PlanResponse> => {
  const response = await api.post(`/plans/${planId}/complete`);
  return response.data;
};

// Error handling utilities
export const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    switch (status) {
      case 404:
        return { type: 'NOT_FOUND', message: data.message || 'Resource not found' };
      case 409:
        return { type: 'CONFLICT', message: data.message || 'Resource already exists' };
      case 422:
        return { type: 'VALIDATION_ERROR', message: data.message || 'Invalid data provided' };
      case 500:
        return { type: 'SERVER_ERROR', message: data.message || 'Server error occurred' };
      default:
        return { type: 'API_ERROR', message: data.message || 'An error occurred' };
    }
  } else if (error.request) {
    // Network error
    return { type: 'NETWORK_ERROR', message: 'Network error - please check your connection' };
  } else {
    // Other error
    return { type: 'UNKNOWN_ERROR', message: error.message || 'An unknown error occurred' };
  }
};

// Enhanced API functions with error handling
export const generatePlanWithErrorHandling = async (studentId: number) => {
  try {
    return await generatePlan(studentId);
  } catch (error) {
    throw handleApiError(error);
  }
};

export const generateDayActivityWithErrorHandling = async (planId: number, dayOfWeek: number, activityType: string) => {
  try {
    return await generateDayActivity(planId, dayOfWeek, activityType);
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getPlanWithErrorHandling = async (studentId: number, options?: {
  excludeChapters?: boolean;
  excludeActivities?: boolean;
  excludeStatus?: boolean;
  excludeMetadata?: boolean;
}) => {
  try {
    return await getPlan(studentId, options);
  } catch (error) {
    throw handleApiError(error);
  }
};

export const saveActivityResponseWithErrorHandling = async (activityId: number, response: any, markCompleted: boolean = true) => {
  try {
    return await saveActivityResponse(activityId, response, markCompleted);
  } catch (error) {
    throw handleApiError(error);
  }
};

// New 5-Day Plan API functions with error handling
export const createPlanWithErrorHandling = async (request: CreatePlanRequest): Promise<PlanResponse> => {
  try {
    return await createPlan(request);
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getPlanByIdWithErrorHandling = async (planId: number): Promise<PlanResponse> => {
  try {
    return await getPlanById(planId);
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateDayActivitiesWithErrorHandling = async (planId: number, dayIndex: number, activities: any[]): Promise<DayResponse> => {
  try {
    return await updateDayActivities(planId, dayIndex, activities);
  } catch (error) {
    throw handleApiError(error);
  }
};

export const completePlanWithErrorHandling = async (planId: number): Promise<PlanResponse> => {
  try {
    return await completePlan(planId);
  } catch (error) {
    throw handleApiError(error);
  }
};

// Optimistic UI update utilities for 5-Day Plan structure
export const createOptimisticDay = (planId: number, dayIndex: number) => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: tempId,
    planId,
    dayIndex,
    state: 'available' as const,
    activities: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isOptimistic: true
  };
};

export const createOptimisticActivity = (dayId: number, type: string, prompt: string) => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: tempId,
    dayId,
    type,
    prompt,
    data: {},
    response: null,
    isValid: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isOptimistic: true
  };
};

export const createOptimisticResponse = (activityId: number, response: any) => {
  return {
    id: activityId,
    response,
    isValid: null,
    updatedAt: new Date().toISOString(),
    isOptimistic: true
  };
};

export const mergeOptimisticDayUpdate = (originalPlan: any, optimisticDay: any) => {
  if (!originalPlan.days) {
    originalPlan.days = [];
  }
  
  // Remove any existing optimistic day for this day index
  const filteredDays = originalPlan.days.filter(
    (day: any) => !(day.isOptimistic && day.dayIndex === optimisticDay.dayIndex)
  );
  
  return {
    ...originalPlan,
    days: [...filteredDays, optimisticDay]
  };
};

export const mergeOptimisticActivityUpdate = (originalPlan: any, optimisticActivity: any) => {
  if (!originalPlan.days) {
    return originalPlan;
  }
  
  const updatedDays = originalPlan.days.map((day: any) => {
    if (day.id === optimisticActivity.dayId) {
      const updatedActivities = day.activities.filter(
        (activity: any) => !(activity.isOptimistic && activity.id === optimisticActivity.id)
      );
      return {
        ...day,
        activities: [...updatedActivities, optimisticActivity]
      };
    }
    return day;
  });
  
  return {
    ...originalPlan,
    days: updatedDays
  };
};

export const mergeOptimisticResponse = (originalPlan: any, optimisticResponse: any) => {
  if (!originalPlan.days) {
    return originalPlan;
  }
  
  const updatedDays = originalPlan.days.map((day: any) => {
    const updatedActivities = day.activities.map((activity: any) => {
      if (activity.id === optimisticResponse.id) {
        return {
          ...activity,
          ...optimisticResponse
        };
      }
      return activity;
    });
    
    return {
      ...day,
      activities: updatedActivities
    };
  });
  
  return {
    ...originalPlan,
    days: updatedDays
  };
};

// Plan3 API functions
export const createPlan3 = async (studentId: number, name: string, theme: string, genreCombination?: string): Promise<any> => {
  const response = await api.post('/plan3', { studentId, name, theme, genreCombination });
  return response.data;
};

export const getPlan3 = async (planId: string): Promise<any> => {
  const response = await api.get(`/plan3/${planId}`);
  return response.data;
};

export const getPlan3Day = async (planId: string, dayIndex: number): Promise<any> => {
  const response = await api.get(`/plan3/${planId}/day/${dayIndex}`);
  return response.data;
};

export const savePlan3Answers = async (planId: string, dayIndex: number, answers: any): Promise<any> => {
  const response = await api.post(`/plan3/${planId}/day/${dayIndex}/answers`, { answers });
  return response.data;
};

export const pollPlan3Status = async (studentId: number, maxAttempts: number = 45): Promise<any> => {
  let attempts = 0;
  const baseDelay = 1000; // Start with 1 second

  while (attempts < maxAttempts) {
    try {
      const planResponse = await getPlanByStudentId(studentId);

      // Backend returns { plan: {...} } when found; normalize here
      const resolvedPlan = (planResponse as any)?.plan ?? planResponse;

      if (!resolvedPlan) {
        // Plan doesn't exist yet, wait a bit longer
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
        continue;
      }

      const status: string | undefined = (resolvedPlan as any)?.status;

      if (status === 'active' || status === 'completed') {
        return resolvedPlan; // Plan is ready
      }

      if (status === 'failed') {
        throw new Error('Plan generation failed');
      }

      // Plan is still generating, wait and try again
      const delay = Math.min(baseDelay * Math.pow(1.5, attempts), 5000); // Exponential backoff, max 5 seconds
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    } catch (error: any) {
      console.warn(`Poll attempt ${attempts + 1} failed:`, error?.message || error);

      // If it's a network error, wait and retry
      if (error?.code === 'NETWORK_ERROR' || error?.code === 'ECONNRESET') {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw new Error(`Plan generation timed out after ${maxAttempts} attempts`);
};

export default api;