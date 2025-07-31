import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api',
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

export default api;