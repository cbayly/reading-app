'use client';

import { useState } from 'react';
import { useAuthContext } from '@/app/contexts/AuthContext';
import { useFlowContext } from '@/app/contexts/FlowContext';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';
import Link from 'next/link';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuthContext();
  const { navigateTo } = useFlowContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      // The FlowContext will handle redirection logic
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during login.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormInput
        label="Email address"
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <FormInput
        label="Password"
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
            Forgot your password?
          </a>
        </div>
      </div>
      <div>
        <Button type="submit" className="w-full">
          Log In
        </Button>
      </div>
    </form>
  );
} 