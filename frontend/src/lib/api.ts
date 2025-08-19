import axios from 'axios';
import Cookies from 'js-cookie';
import { GeneratePlanRequest, GenerateActivityRequest, SaveActivityResponseRequest } from '@/types/weekly-plan';

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

export const getPlan = async (studentId: number, options?: {
  excludeChapters?: boolean;
  excludeActivities?: boolean;
  excludeStatus?: boolean;
  excludeMetadata?: boolean;
}) => {
  const params = new URLSearchParams();
  if (options?.excludeChapters) params.append('excludeChapters', 'true');
  if (options?.excludeActivities) params.append('excludeActivities', 'true');
  if (options?.excludeStatus) params.append('excludeStatus', 'true');
  if (options?.excludeMetadata) params.append('excludeMetadata', 'true');
  
  const url = `/plans/${studentId}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

export const saveActivityResponse = async (activityId: number, response: any, markCompleted: boolean = true) => {
  const apiResponse = await api.put(`/plans/activity/${activityId}`, { 
    response,
    markCompleted 
  });
  return apiResponse.data;
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

// Optimistic UI update utilities
export const createOptimisticActivity = (planId: number, dayOfWeek: number, activityType: string) => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: tempId,
    planId,
    dayOfWeek,
    activityType,
    content: {
      loading: true,
      message: 'Generating activity...'
    },
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isOptimistic: true
  };
};

export const createOptimisticResponse = (activityId: number, response: any) => {
  return {
    id: activityId,
    studentResponse: response,
    completed: true,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isOptimistic: true
  };
};

export const mergeOptimisticUpdate = (originalPlan: any, optimisticActivity: any) => {
  if (!originalPlan.dailyActivities) {
    originalPlan.dailyActivities = [];
  }
  
  // Remove any existing optimistic activity for this day
  const filteredActivities = originalPlan.dailyActivities.filter(
    (activity: any) => !(activity.isOptimistic && activity.dayOfWeek === optimisticActivity.dayOfWeek)
  );
  
  return {
    ...originalPlan,
    dailyActivities: [...filteredActivities, optimisticActivity]
  };
};

export const mergeOptimisticResponse = (originalPlan: any, optimisticResponse: any) => {
  if (!originalPlan.dailyActivities) {
    return originalPlan;
  }
  
  const updatedActivities = originalPlan.dailyActivities.map((activity: any) => {
    if (activity.id === optimisticResponse.id) {
      return {
        ...activity,
        ...optimisticResponse
      };
    }
    return activity;
  });
  
  return {
    ...originalPlan,
    dailyActivities: updatedActivities
  };
};

export default api;