'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthContext } from './AuthContext';
import { usePathname, useRouter } from 'next/navigation';

export type FlowStep = 'landing' | 'signup' | 'login' | 'setup' | 'assessment_intro' | 'assessment_start' | 'dashboard';

interface FlowState {
  currentStep: FlowStep;
  hasCompletedSetup: boolean;
  navigateTo: (step: FlowStep) => void;
}

const FlowContext = createContext<FlowState | undefined>(undefined);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<FlowStep>('landing');
  const [hasCompletedSetup, setHasCompletedSetup] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    // This logic determines the user's current place in the flow
    if (user) {
      // TODO: Fetch this from the database
      const userHasStudents = false; 
      
      if (userHasStudents) {
        setHasCompletedSetup(true);
        if (pathname !== '/dashboard') router.push('/dashboard');
      } else {
        if (pathname !== '/setup') router.push('/setup');
      }
    } else {
      // Not logged in, can only be on public pages
      const publicRoutes = ['/', '/login', '/signup'];
      if (!publicRoutes.includes(pathname)) {
        router.push('/login');
      }
    }
  }, [user, loading, pathname, router]);
  
  const navigateTo = (step: FlowStep) => {
    const pathMap: Record<FlowStep, string> = {
      landing: '/',
      signup: '/signup',
      login: '/login',
      setup: '/setup',
      assessment_intro: '/assessment/intro',
      assessment_start: '/assessment/start', // Placeholder
      dashboard: '/dashboard',
    };
    router.push(pathMap[step]);
    setCurrentStep(step);
  };

  const value: FlowState = {
    currentStep,
    hasCompletedSetup,
    navigateTo,
  };

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlowContext() {
  const context = useContext(FlowContext);
  if (context === undefined) {
    throw new Error('useFlowContext must be used within a FlowProvider');
  }
  return context;
} 