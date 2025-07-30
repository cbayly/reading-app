'use client';

import { useState } from 'react';
import { useAuthContext } from '@/app/contexts/AuthContext';
import { useFlowContext } from '@/app/contexts/FlowContext';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/ui/FormInput';

export function SignUpForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuthContext();
  const { navigateTo } = useFlowContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signUp(name, email, password);
      navigateTo('setup');
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during sign up.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormInput
        label="Name"
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
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
      <div>
        <Button type="submit" className="w-full">
          Sign Up
        </Button>
      </div>
    </form>
  );
} 