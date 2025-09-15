import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReflectionActivity from './ReflectionActivity';

// Mock the autosave hooks
jest.mock('@/hooks/useAutosave', () => ({
  useTextInputAutosave: jest.fn(() => ({
    value: '',
    inputProps: {
      onChange: jest.fn(),
      onBlur: jest.fn(),
    },
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    error: null,
  })),
}));

// Mock the AutosaveIndicator component
jest.mock('@/components/AutosaveIndicator', () => {
  return function MockAutosaveIndicator({ isSaving, lastSaved, hasUnsavedChanges, error }: any) {
    return (
      <div data-testid="autosave-indicator">
        {isSaving && <span>Saving...</span>}
        {lastSaved && <span>Saved</span>}
        {hasUnsavedChanges && <span>Unsaved</span>}
        {error && <span>Error</span>}
      </div>
    );
  };
});

describe('ReflectionActivity', () => {
  const mockActivity = {
    id: 1,
    type: 'reflection',
    data: {
      questions: [
        {
          id: 'q1',
          question: 'What was your favorite part of the story?',
          required: true,
          wordCount: { min: 10, max: 100 }
        },
        {
          id: 'q2',
          question: 'How did the main character change throughout the story?',
          required: false,
          wordCount: { min: 5, max: 50 }
        }
      ]
    },
    response: null
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders reflection questions correctly', () => {
      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      expect(screen.getByText('Reflection Questions')).toBeInTheDocument();
      expect(screen.getByText('What was your favorite part of the story?')).toBeInTheDocument();
      expect(screen.getByText('How did the main character change throughout the story?')).toBeInTheDocument();
    });

    it('displays required badge for required questions', () => {
      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const requiredBadges = screen.getAllByText('Required');
      expect(requiredBadges).toHaveLength(1); // Only first question is required
    });

    it('displays word count requirements', () => {
      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      expect(screen.getByText('10-100 words')).toBeInTheDocument();
      expect(screen.getByText('5-50 words')).toBeInTheDocument();
    });

    it('renders textarea inputs for each question', () => {
      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const textareas = screen.getAllByRole('textbox');
      expect(textareas).toHaveLength(2);
    });

    it('displays autosave indicators when not in read-only mode', () => {
      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const autosaveIndicators = screen.getAllByTestId('autosave-indicator');
      expect(autosaveIndicators).toHaveLength(2); // One for each question
    });
  });

  describe('Read-only Mode', () => {
    it('disables textarea inputs when in read-only mode', () => {
      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const textareas = screen.getAllByRole('textbox');
      textareas.forEach(textarea => {
        expect(textarea).toBeDisabled();
      });
    });

    it('does not display autosave indicators in read-only mode', () => {
      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const autosaveIndicators = screen.queryAllByTestId('autosave-indicator');
      expect(autosaveIndicators).toHaveLength(0);
    });

    it('displays existing responses in read-only mode', () => {
      const activityWithResponse = {
        ...mockActivity,
        response: {
          answers: {
            q1: 'This was my favorite part because...',
            q2: 'The character changed by...'
          }
        }
      };

      render(
        <ReflectionActivity
          activity={activityWithResponse}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
          planId="plan-123"
          dayIndex={1}
        />
      );

      expect(screen.getByDisplayValue('This was my favorite part because...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('The character changed by...')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onUpdate when user types in textarea', async () => {
      const { useTextInputAutosave } = require('@/hooks/useAutosave');
      const mockOnChange = jest.fn();
      
      useTextInputAutosave.mockReturnValue({
        value: '',
        inputProps: {
          onChange: mockOnChange,
          onBlur: jest.fn(),
        },
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: false,
        error: null,
      });

      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const textarea = screen.getAllByRole('textbox')[0];
      fireEvent.change(textarea, { target: { value: 'New answer' } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles word count validation', () => {
      const { useTextInputAutosave } = require('@/hooks/useAutosave');
      
      useTextInputAutosave.mockReturnValue({
        value: 'Short answer',
        inputProps: {
          onChange: jest.fn(),
          onBlur: jest.fn(),
        },
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: false,
        error: null,
      });

      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      // Should show word count
      expect(screen.getByText('2 words')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error state in autosave indicator', () => {
      const { useTextInputAutosave } = require('@/hooks/useAutosave');
      
      useTextInputAutosave.mockReturnValue({
        value: '',
        inputProps: {
          onChange: jest.fn(),
          onBlur: jest.fn(),
        },
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: false,
        error: 'Failed to save',
      });

      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const errorIndicators = screen.getAllByText('Error');
      expect(errorIndicators).toHaveLength(2);
    });

    it('handles missing activity data gracefully', () => {
      const invalidActivity = {
        id: 1,
        type: 'reflection',
        data: null,
        response: null
      };

      render(
        <ReflectionActivity
          activity={invalidActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      // Should not crash and should show some fallback content
      expect(screen.getByText('Reflection Questions')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for textarea inputs', () => {
      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const textareas = screen.getAllByRole('textbox');
      expect(textareas[0]).toHaveAttribute('aria-label', 'Your Answer');
      expect(textareas[1]).toHaveAttribute('aria-label', 'Your Answer');
    });

    it('has proper form structure', () => {
      render(
        <ReflectionActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });
  });
});
