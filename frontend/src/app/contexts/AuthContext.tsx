'use client';

import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from '../../../lib/auth';
import { Parent } from '../../../types/auth';

interface AuthContextType {
  user: Parent | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Parent>;
  signUp: (name: string, email: string, password: string) => Promise<Parent>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthHook();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
} 