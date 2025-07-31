import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormInput } from './FormInput';

describe('FormInput', () => {
  it('renders an input with a label', () => {
    render(<FormInput label="Username" id="username" />);
    const input = screen.getByLabelText(/username/i);
    expect(input).toBeInTheDocument();
  });

  it('handles user input', () => {
    render(<FormInput label="Email" id="email" type="email" />);
    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input.value).toBe('test@example.com');
  });

  it('passes other props to the input element', () => {
    render(<FormInput label="Name" id="name" placeholder="Enter your name" />);
    const input = screen.getByPlaceholderText(/enter your name/i);
    expect(input).toBeInTheDocument();
  });
}); 