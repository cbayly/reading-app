import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentForm } from './StudentForm';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('StudentForm', () => {
  it('progresses through the multi-step form', async () => {
    render(<StudentForm />);
    
    // Step 1: Basic Info
    fireEvent.change(screen.getByLabelText(/child's name/i), { target: { value: 'Test Student' } });
    fireEvent.change(screen.getByLabelText(/birthday/i), { target: { value: '2015-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 2: Grade Level
    await waitFor(() => {
      expect(screen.getByText(/what grade is your child in/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 3: Interests
    await waitFor(() => {
      expect(screen.getByText(/what interests your child/i)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText(/interests/i), { target: { value: 'dinosaurs, space' } });
    fireEvent.click(screen.getByRole('button', { name: /complete setup/i }));
    
    // Step 4: Add Another Child
    await waitFor(() => {
      expect(screen.getByText(/great! test student is all set up/i)).toBeInTheDocument();
    });
  });
}); 