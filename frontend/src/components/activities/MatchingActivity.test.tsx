import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MatchingActivity from './MatchingActivity';

describe('MatchingActivity', () => {
  const mockActivity = {
    id: 1,
    type: 'matching',
    data: {
      words: [
        { id: 'w1', word: 'brave', definition: 'showing courage' },
        { id: 'w2', word: 'curious', definition: 'eager to learn' },
        { id: 'w3', word: 'generous', definition: 'willing to give' }
      ]
    },
    response: null
  };

  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders vocabulary matching activity correctly', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      expect(screen.getByText('Vocabulary Matching')).toBeInTheDocument();
      expect(screen.getByText('Match each word with its correct definition.')).toBeInTheDocument();
      expect(screen.getByText('brave')).toBeInTheDocument();
      expect(screen.getByText('curious')).toBeInTheDocument();
      expect(screen.getByText('generous')).toBeInTheDocument();
      expect(screen.getByText('showing courage')).toBeInTheDocument();
      expect(screen.getByText('eager to learn')).toBeInTheDocument();
      expect(screen.getByText('willing to give')).toBeInTheDocument();
    });

    it('renders all word and definition buttons', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const wordButtons = screen.getAllByRole('button', { name: /brave|curious|generous/ });
      const definitionButtons = screen.getAllByRole('button', { name: /showing courage|eager to learn|willing to give/ });
      
      expect(wordButtons).toHaveLength(3);
      expect(definitionButtons).toHaveLength(3);
    });

    it('displays instructional text correctly', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      expect(screen.getByText('Click on a word, then click on its definition to make a match.')).toBeInTheDocument();
    });
  });

  describe('Read-only Mode', () => {
    it('displays read-only mode badge when isReadOnly is true', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      expect(screen.getByText('Read-only mode - Activity completed')).toBeInTheDocument();
    });

    it('disables all buttons when in read-only mode', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      const allButtons = screen.getAllByRole('button');
      allButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('applies read-only styling to buttons', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      const allButtons = screen.getAllByRole('button');
      allButtons.forEach(button => {
        expect(button).toHaveClass('opacity-75', 'cursor-default');
      });
    });

    it('displays existing matches in read-only mode', () => {
      const activityWithMatches = {
        ...mockActivity,
        response: {
          pairs: [
            { word: 'brave', definition: 'showing courage', isMatched: true },
            { word: 'curious', definition: 'eager to learn', isMatched: true },
            { word: 'generous', definition: 'willing to give', isMatched: true }
          ]
        }
      };

      render(
        <MatchingActivity
          activity={activityWithMatches}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      // All buttons should be disabled and styled as matched
      const allButtons = screen.getAllByRole('button');
      allButtons.forEach(button => {
        expect(button).toBeDisabled();
        expect(button).toHaveClass('opacity-75', 'cursor-default');
      });
    });

    it('updates instructional text for read-only mode', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={true}
        />
      );

      expect(screen.getByText('This activity has been completed.')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('selects a word when clicked', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const braveButton = screen.getByRole('button', { name: 'brave' });
      fireEvent.click(braveButton);

      expect(braveButton).toHaveClass('bg-blue-500', 'text-white');
    });

    it('deselects a word when clicked again', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const braveButton = screen.getByRole('button', { name: 'brave' });
      
      // First click selects
      fireEvent.click(braveButton);
      expect(braveButton).toHaveClass('bg-blue-500', 'text-white');
      
      // Second click deselects
      fireEvent.click(braveButton);
      expect(braveButton).not.toHaveClass('bg-blue-500', 'text-white');
    });

    it('creates a match when word and definition are selected', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const braveButton = screen.getByRole('button', { name: 'brave' });
      const courageButton = screen.getByRole('button', { name: 'showing courage' });

      // Select word
      fireEvent.click(braveButton);
      // Select definition
      fireEvent.click(courageButton);

      // Both buttons should be styled as matched
      expect(braveButton).toHaveClass('bg-green-500', 'text-white');
      expect(courageButton).toHaveClass('bg-green-500', 'text-white');
      expect(braveButton).toBeDisabled();
      expect(courageButton).toBeDisabled();

      // Check that onUpdate was called with the match
      expect(mockOnUpdate).toHaveBeenCalledWith({
        pairs: [
          { word: 'brave', definition: 'showing courage', isMatched: true }
        ]
      });
    });

    it('allows selecting a new word after making a match', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Make first match
      fireEvent.click(screen.getByRole('button', { name: 'brave' }));
      fireEvent.click(screen.getByRole('button', { name: 'showing courage' }));

      // Select a new word
      const curiousButton = screen.getByRole('button', { name: 'curious' });
      fireEvent.click(curiousButton);

      expect(curiousButton).toHaveClass('bg-blue-500', 'text-white');
    });

    it('clears selection when clicking on a different word', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const braveButton = screen.getByRole('button', { name: 'brave' });
      const curiousButton = screen.getByRole('button', { name: 'curious' });

      // Select first word
      fireEvent.click(braveButton);
      expect(braveButton).toHaveClass('bg-blue-500', 'text-white');

      // Select different word
      fireEvent.click(curiousButton);
      expect(braveButton).not.toHaveClass('bg-blue-500', 'text-white');
      expect(curiousButton).toHaveClass('bg-blue-500', 'text-white');
    });
  });

  describe('Match Management', () => {
    it('tracks multiple matches correctly', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Make first match
      fireEvent.click(screen.getByRole('button', { name: 'brave' }));
      fireEvent.click(screen.getByRole('button', { name: 'showing courage' }));

      // Make second match
      fireEvent.click(screen.getByRole('button', { name: 'curious' }));
      fireEvent.click(screen.getByRole('button', { name: 'eager to learn' }));

      // Check that onUpdate was called with both matches
      expect(mockOnUpdate).toHaveBeenCalledTimes(2);
      expect(mockOnUpdate).toHaveBeenLastCalledWith({
        pairs: [
          { word: 'brave', definition: 'showing courage', isMatched: true },
          { word: 'curious', definition: 'eager to learn', isMatched: true }
        ]
      });
    });

    it('prevents matching already matched words', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Make a match
      fireEvent.click(screen.getByRole('button', { name: 'brave' }));
      fireEvent.click(screen.getByRole('button', { name: 'showing courage' }));

      // Try to click on matched word again
      const braveButton = screen.getByRole('button', { name: 'brave' });
      fireEvent.click(braveButton);

      // Button should remain disabled and matched
      expect(braveButton).toBeDisabled();
      expect(braveButton).toHaveClass('bg-green-500', 'text-white');
    });

    it('prevents matching already matched definitions', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Make a match
      fireEvent.click(screen.getByRole('button', { name: 'brave' }));
      fireEvent.click(screen.getByRole('button', { name: 'showing courage' }));

      // Try to click on matched definition again
      const courageButton = screen.getByRole('button', { name: 'showing courage' });
      fireEvent.click(courageButton);

      // Button should remain disabled and matched
      expect(courageButton).toBeDisabled();
      expect(courageButton).toHaveClass('bg-green-500', 'text-white');
    });
  });

  describe('Error Handling', () => {
    it('handles missing activity data gracefully', () => {
      const invalidActivity = {
        id: 1,
        type: 'matching',
        data: null,
        response: null
      };

      render(
        <MatchingActivity
          activity={invalidActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Should not crash and should show some fallback content
      expect(screen.getByText('Vocabulary Matching')).toBeInTheDocument();
    });

    it('handles empty words array', () => {
      const activityWithEmptyWords = {
        ...mockActivity,
        data: { words: [] }
      };

      render(
        <MatchingActivity
          activity={activityWithEmptyWords}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Should handle gracefully
      expect(screen.getByText('Vocabulary Matching')).toBeInTheDocument();
    });

    it('handles malformed word data', () => {
      const activityWithMalformedData = {
        ...mockActivity,
        data: {
          words: [
            { id: 'w1', word: 'brave' }, // Missing definition
            { id: 'w2', definition: 'eager to learn' } // Missing word
          ]
        }
      };

      render(
        <MatchingActivity
          activity={activityWithMalformedData}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Should handle gracefully and only render valid items
      expect(screen.getByText('brave')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-labels for buttons', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const wordButtons = screen.getAllByRole('button', { name: /brave|curious|generous/ });
      const definitionButtons = screen.getAllByRole('button', { name: /showing courage|eager to learn|willing to give/ });

      wordButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });

      definitionButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('has proper button roles and states', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('maintains focus management', () => {
      render(
        <MatchingActivity
          activity={mockActivity}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      const braveButton = screen.getByRole('button', { name: 'brave' });
      braveButton.focus();
      expect(braveButton).toHaveFocus();
    });
  });

  describe('State Persistence', () => {
    it('restores matches from existing response', () => {
      const activityWithExistingMatches = {
        ...mockActivity,
        response: {
          pairs: [
            { word: 'brave', definition: 'showing courage', isMatched: true },
            { word: 'curious', definition: 'eager to learn', isMatched: true }
          ]
        }
      };

      render(
        <MatchingActivity
          activity={activityWithExistingMatches}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // Check that matched buttons are styled correctly
      const braveButton = screen.getByRole('button', { name: 'brave' });
      const curiousButton = screen.getByRole('button', { name: 'curious' });
      const courageButton = screen.getByRole('button', { name: 'showing courage' });
      const learnButton = screen.getByRole('button', { name: 'eager to learn' });

      expect(braveButton).toHaveClass('bg-green-500', 'text-white');
      expect(curiousButton).toHaveClass('bg-green-500', 'text-white');
      expect(courageButton).toHaveClass('bg-green-500', 'text-white');
      expect(learnButton).toHaveClass('bg-green-500', 'text-white');

      expect(braveButton).toBeDisabled();
      expect(curiousButton).toBeDisabled();
      expect(courageButton).toBeDisabled();
      expect(learnButton).toBeDisabled();
    });

    it('allows continuing from partial matches', () => {
      const activityWithPartialMatches = {
        ...mockActivity,
        response: {
          pairs: [
            { word: 'brave', definition: 'showing courage', isMatched: true }
          ]
        }
      };

      render(
        <MatchingActivity
          activity={activityWithPartialMatches}
          onUpdate={mockOnUpdate}
          isReadOnly={false}
        />
      );

      // First match should be completed
      const braveButton = screen.getByRole('button', { name: 'brave' });
      const courageButton = screen.getByRole('button', { name: 'showing courage' });
      expect(braveButton).toHaveClass('bg-green-500', 'text-white');
      expect(courageButton).toHaveClass('bg-green-500', 'text-white');

      // Should be able to make additional matches
      const curiousButton = screen.getByRole('button', { name: 'curious' });
      const learnButton = screen.getByRole('button', { name: 'eager to learn' });

      fireEvent.click(curiousButton);
      fireEvent.click(learnButton);

      expect(curiousButton).toHaveClass('bg-green-500', 'text-white');
      expect(learnButton).toHaveClass('bg-green-500', 'text-white');
    });
  });
});
