import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import jwt from 'jsonwebtoken';
import api from './api';
import { AuthResponse, Parent } from '../types/auth';

export async function signUp(name: string, email: string, password: string): Promise<Parent> {
  const response = await api.post<AuthResponse>('/auth/signup', { name, email, password });
  Cookies.set('token', response.data.token, { expires: 1, secure: process.env.NODE_ENV === 'production' });
  return response.data.parent;
}

export async function login(email: string, password: string): Promise<Parent> {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  Cookies.set('token', response.data.token, { expires: 1, secure: process.env.NODE_ENV === 'production' });
  return response.data.parent;
}

export function logout() {
  Cookies.remove('token');
}

export function useAuth() {
  const [user, setUser] = useState<Parent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      try {
        const decoded = jwt.decode(token) as { id: number; email: string; name: string; };
        // This is a basic client-side decode. The server will still verify the token on every request.
        // For more complex scenarios, you might want to fetch user data from a /me endpoint.
        setUser({ id: decoded.id, email: decoded.email, name: decoded.name });
      } catch (error) {
        console.error('Failed to decode token:', error);
        Cookies.remove('token');
      }
    }
    setLoading(false);
  }, []);

  return { user, loading, login, signUp, logout };
} 