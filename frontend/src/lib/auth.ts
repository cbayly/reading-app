import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import jwt from 'jsonwebtoken';
import api from './api.ts';
import { AuthResponse, Parent } from '../types/auth';

export async function signUp(name: string, email: string, password: string): Promise<Parent> {
  const response = await api.post<AuthResponse>('/auth/signup', { name, email, password });
  Cookies.set('token', response.data.token, { expires: 1, secure: process.env.NODE_ENV === 'production' });
  // Debug: confirm cookie write in browser
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('Login debug (signup): token length', response.data.token?.length, 'cookie present?', !!Cookies.get('token'));
  }
  return response.data.parent;
}

export async function login(email: string, password: string): Promise<Parent> {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  Cookies.set('token', response.data.token, { expires: 1, secure: process.env.NODE_ENV === 'production' });
  // Debug: confirm cookie write in browser
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('Login debug: status 200, token length', response.data.token?.length, 'cookie present?', !!Cookies.get('token'));
  }
  return response.data.parent;
}

export function useAuth() {
  const [user, setUser] = useState<Parent | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const logout = useCallback(() => {
    Cookies.remove('token');
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    console.log('Auth useEffect running...');
    setMounted(true);
    const token = Cookies.get('token');
    console.log('Token from cookies:', token ? 'Present' : 'Missing');
    if (token) {
      try {
        const decoded = jwt.decode(token) as { id: number; email: string; name: string; };
        console.log('Decoded token:', decoded);
        setUser({ id: decoded.id, email: decoded.email, name: decoded.name });
      } catch (error) {
        console.error('Failed to decode token:', error);
        Cookies.remove('token');
      }
    }
    setLoading(false);
    console.log('Auth loading set to false');
  }, []);

  // Prevent hydration mismatch by not rendering user-dependent content until mounted
  if (!mounted) {
    return { user: null, loading: true, login, signUp, logout };
  }

  return { user, loading, login, signUp, logout };
}
