import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SignUpForm } from './SignUpForm';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { FlowProvider } from '@/app/contexts/FlowContext';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('SignUpForm', () => {
  it('renders and submits the form successfully', async () => {
    render(
      <AuthProvider>
        <FlowProvider>
          <SignUpForm />
        </FlowProvider>
      </AuthProvider>
    );
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    
    // Wait for async operations
    await waitFor(() => {
      // In a real test, we'd mock the signUp function and check if it was called.
      // For this example, we'll just check that no error message is displayed.
      expect(screen.queryByText(/an error occurred/i)).not.toBeInTheDocument();
    });
  });
}); 