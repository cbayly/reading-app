import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConditionalWritingActivity from './ConditionalWritingActivity';

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

describe('ConditionalWritingActivity', () => {
  const mockActivity = {
    id: 1,
    type: 'conditional_writing',
    data: {
      sections: [
        {
          id: 'section1',
          title: 'Creative Writing',
          prompt: 'Write a short story about a magical forest.',
          required: true,
          wordCount: { min: 20, max: 200 }
        },
        {
          id: 'section2',
          title: 'Character Description',
          prompt: 'Describe the main character of your story.',
          required: false,
          wordCount: { min: 10, max: 100 }
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
    it('renders writing sections correctly', () => {
      render(
        <ConditionalWritingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      expect(screen.getByText('Creative Writing')).toBeInTheDocument();
      expect(screen.getByText('Character Description')).toBeInTheDocument();
      expect(screen.getByText('Write a short story about a magical forest.')).toBeInTheDocument();
      expect(screen.getByText('Describe the main character of your story.')).toBeInTheDocument();
    });

    it('displays required badge for required sections', () => {
      render(
        <ConditionalWritingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const requiredBadges = screen.getAllByText('Required');
      expect(requiredBadges).toHaveLength(1); // Only first section is required
    });

    it('displays word count requirements', () => {
      render(
        <ConditionalWritingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      expect(screen.getByText('20-200 words')).toBeInTheDocument();
      expect(screen.getByText('10-100 words')).toBeInTheDocument();
    });

    it('renders textarea inputs for each section', () => {
      render(
        <ConditionalWritingActivity
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
        <ConditionalWritingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const autosaveIndicators = screen.getAllByTestId('autosave-indicator');
      expect(autosaveIndicators).toHaveLength(2); // One for each section
    });
  });

  describe('Read-only Mode', () => {
    it('disables textarea inputs when in read-only mode', () => {
      render(
        <ConditionalWritingActivity
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
        <ConditionalWritingActivity
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
          sections: {
            section1: 'Once upon a time in a magical forest...',
            section2: 'The main character was a brave young explorer...'
          }
        }
      };

      render(
        <ConditionalWritingActivity
          activity={activityWithResponse}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
          planId="plan-123"
          dayIndex={1}
        />
      );

      expect(screen.getByDisplayValue('Once upon a time in a magical forest...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('The main character was a brave young explorer...')).toBeInTheDocument();
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
        <ConditionalWritingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const textarea = screen.getAllByRole('textbox')[0];
      fireEvent.change(textarea, { target: { value: 'New story content' } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('handles word count validation', () => {
      const { useTextInputAutosave } = require('@/hooks/useAutosave');
      
      useTextInputAutosave.mockReturnValue({
        value: 'Short story content',
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
        <ConditionalWritingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      // Should show word count
      expect(screen.getByText('3 words')).toBeInTheDocument();
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
        <ConditionalWritingActivity
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
        type: 'conditional_writing',
        data: null,
        response: null
      };

      render(
        <ConditionalWritingActivity
          activity={invalidActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      // Should not crash and should show some fallback content
      expect(screen.getByText('Creative Writing Activity')).toBeInTheDocument();
    });

    it('handles empty sections array', () => {
      const activityWithEmptySections = {
        ...mockActivity,
        data: { sections: [] }
      };

      render(
        <ConditionalWritingActivity
          activity={activityWithEmptySections}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      // Should handle gracefully
      expect(screen.getByText('Creative Writing Activity')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for textarea inputs', () => {
      render(
        <ConditionalWritingActivity
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

    it('has proper form structure with headings', () => {
      render(
        <ConditionalWritingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      // Check for proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(3); // Main title + 2 section titles
    });

    it('has proper placeholder text', () => {
      render(
        <ConditionalWritingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      const textareas = screen.getAllByRole('textbox');
      textareas.forEach(textarea => {
        expect(textarea).toHaveAttribute('placeholder');
      });
    });
  });

  describe('Section Management', () => {
    it('renders multiple sections correctly', () => {
      const multiSectionActivity = {
        ...mockActivity,
        data: {
          sections: [
            {
              id: 'section1',
              title: 'Introduction',
              prompt: 'Write an introduction.',
              required: true,
              wordCount: { min: 10, max: 50 }
            },
            {
              id: 'section2',
              title: 'Body',
              prompt: 'Write the main content.',
              required: true,
              wordCount: { min: 20, max: 100 }
            },
            {
              id: 'section3',
              title: 'Conclusion',
              prompt: 'Write a conclusion.',
              required: false,
              wordCount: { min: 10, max: 50 }
            }
          ]
        }
      };

      render(
        <ConditionalWritingActivity
          activity={multiSectionActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
      expect(screen.getByText('Conclusion')).toBeInTheDocument();
      expect(screen.getAllByRole('textbox')).toHaveLength(3);
    });

    it('handles sections with different word count requirements', () => {
      render(
        <ConditionalWritingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
          planId="plan-123"
          dayIndex={1}
        />
      );

      // Check that different word count requirements are displayed
      expect(screen.getByText('20-200 words')).toBeInTheDocument();
      expect(screen.getByText('10-100 words')).toBeInTheDocument();
    });
  });
});
