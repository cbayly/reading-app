import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultiSelectActivity from './MultiSelectActivity';

describe('MultiSelectActivity', () => {
  const mockActivity = {
    id: 1,
    type: 'multi_select',
    data: {
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'What is the main theme of the story?',
          options: ['Friendship', 'Adventure', 'Learning', 'Courage'],
          correctAnswer: 'Adventure',
          required: true
        },
        {
          id: 'q2',
          type: 'checkbox',
          question: 'Which characters appeared in the story?',
          options: ['Alice', 'Bob', 'Charlie', 'Diana'],
          correctAnswers: ['Alice', 'Charlie'],
          required: false
        },
        {
          id: 'q3',
          type: 'rating',
          question: 'How much did you enjoy this story?',
          min: 1,
          max: 5,
          required: true
        },
        {
          id: 'q4',
          type: 'text',
          question: 'What would you change about the story?',
          required: false
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
    it('renders all question types correctly', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      expect(screen.getByText('Multiple Choice Questions')).toBeInTheDocument();
      expect(screen.getByText('What is the main theme of the story?')).toBeInTheDocument();
      expect(screen.getByText('Which characters appeared in the story?')).toBeInTheDocument();
      expect(screen.getByText('How much did you enjoy this story?')).toBeInTheDocument();
      expect(screen.getByText('What would you change about the story?')).toBeInTheDocument();
    });

    it('renders multiple choice options correctly', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      expect(screen.getByLabelText('Friendship')).toBeInTheDocument();
      expect(screen.getByLabelText('Adventure')).toBeInTheDocument();
      expect(screen.getByLabelText('Learning')).toBeInTheDocument();
      expect(screen.getByLabelText('Courage')).toBeInTheDocument();
    });

    it('renders checkbox options correctly', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4); // 4 character options
    });

    it('renders rating inputs correctly', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(5); // 1-5 rating
    });

    it('renders text input correctly', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('displays required badges for required questions', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const requiredBadges = screen.getAllByText('Required');
      expect(requiredBadges).toHaveLength(2); // q1 and q3 are required
    });
  });

  describe('Read-only Mode', () => {
    it('displays read-only mode badge when isReadOnly is true', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      expect(screen.getByText('Read-only mode - Activity completed')).toBeInTheDocument();
    });

    it('disables all inputs when in read-only mode', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      const radioButtons = screen.getAllByRole('radio');
      const checkboxes = screen.getAllByRole('checkbox');
      const textarea = screen.getByRole('textbox');

      radioButtons.forEach(radio => {
        expect(radio).toBeDisabled();
      });

      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled();
      });

      expect(textarea).toBeDisabled();
    });

    it('applies read-only styling to inputs', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      const radioButtons = screen.getAllByRole('radio');
      const checkboxes = screen.getAllByRole('checkbox');
      const textarea = screen.getByRole('textbox');

      radioButtons.forEach(radio => {
        expect(radio).toHaveClass('opacity-50');
      });

      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveClass('opacity-50');
      });

      expect(textarea).toHaveClass('opacity-50');
    });

    it('displays existing responses in read-only mode', () => {
      const activityWithResponse = {
        ...mockActivity,
        response: {
          answers: {
            q1: 'Adventure',
            q2: ['Alice', 'Charlie'],
            q3: 4,
            q4: 'I would add more action scenes.'
          }
        }
      };

      render(
        <MultiSelectActivity
          activity={activityWithResponse}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      // Check that the correct options are selected
      const adventureRadio = screen.getByLabelText('Adventure') as HTMLInputElement;
      const aliceCheckbox = screen.getByLabelText('Alice') as HTMLInputElement;
      const charlieCheckbox = screen.getByLabelText('Charlie') as HTMLInputElement;
      const rating4Radio = screen.getByLabelText('4') as HTMLInputElement;
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      expect(adventureRadio.checked).toBe(true);
      expect(aliceCheckbox.checked).toBe(true);
      expect(charlieCheckbox.checked).toBe(true);
      expect(rating4Radio.checked).toBe(true);
      expect(textarea.value).toBe('I would add more action scenes.');
    });

    it('updates instructional text for read-only mode', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      expect(screen.getByText('This activity has been completed.')).toBeInTheDocument();
    });

    it('displays read-only badges next to required badges', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      const readOnlyBadges = screen.getAllByText('Read-only');
      expect(readOnlyBadges).toHaveLength(2); // One for each required question
    });
  });

  describe('User Interactions', () => {
    it('handles multiple choice selection', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const adventureRadio = screen.getByLabelText('Adventure');
      fireEvent.click(adventureRadio);

      expect(adventureRadio).toBeChecked();
      expect(mockOnUpdate).toHaveBeenCalledWith({
        answers: {
          q1: 'Adventure'
        }
      });
    });

    it('handles checkbox selection', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const aliceCheckbox = screen.getByLabelText('Alice');
      const charlieCheckbox = screen.getByLabelText('Charlie');

      fireEvent.click(aliceCheckbox);
      fireEvent.click(charlieCheckbox);

      expect(aliceCheckbox).toBeChecked();
      expect(charlieCheckbox).toBeChecked();
      expect(mockOnUpdate).toHaveBeenCalledWith({
        answers: {
          q2: ['Alice', 'Charlie']
        }
      });
    });

    it('handles rating selection', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const rating4Radio = screen.getByLabelText('4');
      fireEvent.click(rating4Radio);

      expect(rating4Radio).toBeChecked();
      expect(mockOnUpdate).toHaveBeenCalledWith({
        answers: {
          q3: 4
        }
      });
    });

    it('handles text input', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'I would add more characters.' } });

      expect(textarea).toHaveValue('I would add more characters.');
      expect(mockOnUpdate).toHaveBeenCalledWith({
        answers: {
          q4: 'I would add more characters.'
        }
      });
    });

    it('accumulates answers from multiple questions', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Answer multiple questions
      fireEvent.click(screen.getByLabelText('Adventure'));
      fireEvent.click(screen.getByLabelText('Alice'));
      fireEvent.click(screen.getByLabelText('4'));

      // Check that all answers are accumulated
      expect(mockOnUpdate).toHaveBeenCalledWith({
        answers: {
          q1: 'Adventure',
          q2: ['Alice'],
          q3: 4
        }
      });
    });
  });

  describe('Question Type Handling', () => {
    it('handles single select radio buttons correctly', () => {
      const singleSelectActivity = {
        ...mockActivity,
        data: {
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'What is your favorite color?',
              options: ['Red', 'Blue', 'Green'],
              correctAnswer: 'Blue',
              required: true
            }
          ]
        }
      };

      render(
        <MultiSelectActivity
          activity={singleSelectActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const redRadio = screen.getByLabelText('Red');
      const blueRadio = screen.getByLabelText('Blue');

      fireEvent.click(redRadio);
      expect(redRadio).toBeChecked();
      expect(blueRadio).not.toBeChecked();

      fireEvent.click(blueRadio);
      expect(redRadio).not.toBeChecked();
      expect(blueRadio).toBeChecked();
    });

    it('handles multiple select checkboxes correctly', () => {
      const multiSelectActivity = {
        ...mockActivity,
        data: {
          questions: [
            {
              id: 'q1',
              type: 'checkbox',
              question: 'Select all that apply:',
              options: ['Option A', 'Option B', 'Option C'],
              correctAnswers: ['Option A', 'Option C'],
              required: true
            }
          ]
        }
      };

      render(
        <MultiSelectActivity
          activity={multiSelectActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const optionA = screen.getByLabelText('Option A');
      const optionB = screen.getByLabelText('Option B');
      const optionC = screen.getByLabelText('Option C');

      fireEvent.click(optionA);
      fireEvent.click(optionC);

      expect(optionA).toBeChecked();
      expect(optionB).not.toBeChecked();
      expect(optionC).toBeChecked();
    });

    it('handles rating scale correctly', () => {
      const ratingActivity = {
        ...mockActivity,
        data: {
          questions: [
            {
              id: 'q1',
              type: 'rating',
              question: 'Rate from 1-10:',
              min: 1,
              max: 10,
              required: true
            }
          ]
        }
      };

      render(
        <MultiSelectActivity
          activity={ratingActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const rating5 = screen.getByLabelText('5');
      fireEvent.click(rating5);

      expect(rating5).toBeChecked();
      expect(mockOnUpdate).toHaveBeenCalledWith({
        answers: {
          q1: 5
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing activity data gracefully', () => {
      const invalidActivity = {
        id: 1,
        type: 'multi_select',
        data: null,
        response: null
      };

      render(
        <MultiSelectActivity
          activity={invalidActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Should not crash and should show some fallback content
      expect(screen.getByText('Multiple Choice Questions')).toBeInTheDocument();
    });

    it('handles empty questions array', () => {
      const activityWithEmptyQuestions = {
        ...mockActivity,
        data: { questions: [] }
      };

      render(
        <MultiSelectActivity
          activity={activityWithEmptyQuestions}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Should handle gracefully
      expect(screen.getByText('Multiple Choice Questions')).toBeInTheDocument();
    });

    it('handles malformed question data', () => {
      const activityWithMalformedData = {
        ...mockActivity,
        data: {
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'Test question',
              // Missing options
              required: true
            }
          ]
        }
      };

      render(
        <MultiSelectActivity
          activity={activityWithMalformedData}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Should handle gracefully
      expect(screen.getByText('Test question')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all inputs', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const radioButtons = screen.getAllByRole('radio');
      const checkboxes = screen.getAllByRole('checkbox');
      const textarea = screen.getByRole('textbox');

      radioButtons.forEach(radio => {
        expect(radio).toHaveAttribute('id');
        expect(screen.getByLabelText(radio.getAttribute('id')!)).toBeInTheDocument();
      });

      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('id');
        expect(screen.getByLabelText(checkbox.getAttribute('id')!)).toBeInTheDocument();
      });

      expect(textarea).toHaveAttribute('aria-label');
    });

    it('has proper form structure', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('maintains focus management', () => {
      render(
        <MultiSelectActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const firstRadio = screen.getAllByRole('radio')[0];
      firstRadio.focus();
      expect(firstRadio).toHaveFocus();
    });
  });

  describe('State Persistence', () => {
    it('restores answers from existing response', () => {
      const activityWithExistingResponse = {
        ...mockActivity,
        response: {
          answers: {
            q1: 'Adventure',
            q2: ['Alice', 'Charlie'],
            q3: 4,
            q4: 'I would add more action scenes.'
          }
        }
      };

      render(
        <MultiSelectActivity
          activity={activityWithExistingResponse}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Check that the correct options are selected
      const adventureRadio = screen.getByLabelText('Adventure') as HTMLInputElement;
      const aliceCheckbox = screen.getByLabelText('Alice') as HTMLInputElement;
      const charlieCheckbox = screen.getByLabelText('Charlie') as HTMLInputElement;
      const rating4Radio = screen.getByLabelText('4') as HTMLInputElement;
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      expect(adventureRadio.checked).toBe(true);
      expect(aliceCheckbox.checked).toBe(true);
      expect(charlieCheckbox.checked).toBe(true);
      expect(rating4Radio.checked).toBe(true);
      expect(textarea.value).toBe('I would add more action scenes.');
    });

    it('allows modifying existing answers', () => {
      const activityWithExistingResponse = {
        ...mockActivity,
        response: {
          answers: {
            q1: 'Adventure',
            q2: ['Alice'],
            q3: 4
          }
        }
      };

      render(
        <MultiSelectActivity
          activity={activityWithExistingResponse}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Modify an existing answer
      const learningRadio = screen.getByLabelText('Learning');
      fireEvent.click(learningRadio);

      expect(learningRadio).toBeChecked();
      expect(mockOnUpdate).toHaveBeenCalledWith({
        answers: {
          q1: 'Learning',
          q2: ['Alice'],
          q3: 4
        }
      });
    });
  });
});
