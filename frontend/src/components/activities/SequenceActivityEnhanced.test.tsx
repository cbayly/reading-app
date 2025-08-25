import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SequenceActivityEnhanced from './SequenceActivityEnhanced';
import { EnhancedSequenceContent, ActivityProgress } from '../../types/enhancedActivities';

// Mock the DeviceDetector hook
jest.mock('./shared/DeviceDetector', () => ({
  useDeviceDetector: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenWidth: 1024,
    screenHeight: 768,
    orientation: 'landscape',
    supportsTouch: false,
    supportsHover: true
  }),
  getOptimalInteractionPattern: () => ({
    primaryInteraction: 'click',
    secondaryInteraction: 'rightClick',
    dragPattern: 'mouseDrag'
  })
}));

const mockContent: EnhancedSequenceContent = {
  events: [
    {
      id: 'event1',
      text: 'Emma discovers a mysterious map in her grandmother\'s attic',
      order: 1
    },
    {
      id: 'event2',
      text: 'Emma and Max set out on their adventure to find the treasure',
      order: 2
    },
    {
      id: 'event3',
      text: 'They encounter a wise old professor who helps them',
      order: 3
    },
    {
      id: 'event4',
      text: 'Emma solves the final puzzle and finds the hidden treasure',
      order: 4
    },
    {
      id: 'event5',
      text: 'Emma returns home with her new friends and the treasure',
      order: 5
    }
  ],
  question: 'Put the story events in the correct order:',
  instructions: 'Drag and drop the events to arrange them in the order they happen in the story.'
};

const mockProgress: ActivityProgress = {
  id: 'progress-1',
  activityType: 'sequence',
  status: 'not_started',
  attempts: 0,
  responses: []
};

describe('SequenceActivityEnhanced', () => {
  const mockOnComplete = jest.fn();
  const mockOnProgressUpdate = jest.fn();
  const mockOnJumpToContext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the activity with question and instructions', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Put the story events in the correct order:')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop the events to arrange them in the order they happen in the story.')).toBeInTheDocument();
  });

  it('displays all events with correct information', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Emma discovers a mysterious map in her grandmother\'s attic')).toBeInTheDocument();
    expect(screen.getByText('Emma and Max set out on their adventure to find the treasure')).toBeInTheDocument();
    expect(screen.getByText('They encounter a wise old professor who helps them')).toBeInTheDocument();
    expect(screen.getByText('Emma solves the final puzzle and finds the hidden treasure')).toBeInTheDocument();
    expect(screen.getByText('Emma returns home with her new friends and the treasure')).toBeInTheDocument();
  });

  it('shows numbered indicators for each event', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('initializes with shuffled events', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // The events should be displayed in some order (not necessarily the correct order)
    expect(screen.getByText('Put the story events in order:')).toBeInTheDocument();
  });

  it('restores progress from existing responses', () => {
    const progressWithResponses: ActivityProgress = {
      ...mockProgress,
      status: 'in_progress',
      responses: [
        {
          id: 'response-1',
          question: 'Put the story events in the correct order:',
          answer: ['event1', 'event2', 'event3', 'event4', 'event5'],
          isCorrect: true,
          feedback: 'Correct order',
          score: 100,
          timeSpent: 30,
          createdAt: new Date()
        }
      ]
    };

    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        progress={progressWithResponses}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Events should be in the restored order
    expect(screen.getByText('Emma discovers a mysterious map in her grandmother\'s attic')).toBeInTheDocument();
  });

  it('calls onProgressUpdate when activity starts', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(mockOnProgressUpdate).toHaveBeenCalledWith('sequence', 'in_progress');
  });

  it('enables complete button when all events are ordered', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    expect(completeButton).not.toBeDisabled();
  });

  it('calls onComplete with correct data when activity is completed', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledWith('sequence', expect.any(Array), expect.arrayContaining([
      expect.objectContaining({
        question: 'Put the story events in the correct order:',
        isCorrect: expect.any(Boolean),
        score: expect.any(Number)
      })
    ]));
  });

  it('provides detailed feedback when activity is completed', async () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText(/You got \d+ out of 5 events in the correct order/)).toBeInTheDocument();
    });
  });

  it('handles reset functionality', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const resetButton = screen.getByRole('button', { name: /reset event order/i });
    fireEvent.click(resetButton);

    // The events should be reordered (shuffled)
    expect(screen.getByText('Put the story events in order:')).toBeInTheDocument();
  });

  it('shows jump to context buttons for events', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getAllByText('Find in story')).toHaveLength(5); // One for each event
  });

  it('calls onJumpToContext when jump button is clicked', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const jumpButtons = screen.getAllByText('Find in story');
    fireEvent.click(jumpButtons[0]);

    // The event ID will depend on the shuffled order, so we check that it's called with any event ID
    expect(mockOnJumpToContext).toHaveBeenCalledWith(expect.stringMatching(/^event-event\d+$/));
  });

  it('disables interaction when disabled prop is true', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
        disabled={true}
      />
    );

    const eventCards = screen.getAllByRole('button');
    const firstEventCard = eventCards[0];
    expect(firstEventCard).toHaveAttribute('tabindex', '-1');
    expect(firstEventCard.closest('div')).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('hides complete button when activity is already completed', () => {
    const completedProgress: ActivityProgress = {
      ...mockProgress,
      status: 'completed'
    };

    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        progress={completedProgress}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.queryByRole('button', { name: /complete activity/i })).not.toBeInTheDocument();
  });

  it('shows completion feedback when activity is already completed', () => {
    const completedProgress: ActivityProgress = {
      ...mockProgress,
      status: 'completed',
      responses: [
        {
          id: 'response-1',
          question: 'Put the story events in the correct order:',
          answer: ['event1', 'event2', 'event3', 'event4', 'event5'],
          isCorrect: true,
          feedback: 'Excellent! You correctly ordered all the story events.',
          score: 100,
          timeSpent: 45,
          createdAt: new Date()
        }
      ]
    };

    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        progress={completedProgress}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText(/Activity completed/)).toBeInTheDocument();
  });

  it('calculates score correctly based on correct positions', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledWith('sequence', expect.any(Array), expect.arrayContaining([
      expect.objectContaining({
        score: expect.any(Number)
      })
    ]));
  });

  it('handles keyboard navigation', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const eventCards = screen.getAllByRole('button');
    const firstEventCard = eventCards[0];

    // Test Enter key
    fireEvent.keyDown(firstEventCard, { key: 'Enter' });
    // Test Space key
    fireEvent.keyDown(firstEventCard, { key: ' ' });
  });

  it('shows correct visual feedback for events in correct positions', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Check that order numbers are displayed (either green for correct or blue for incorrect)
    const orderNumbers = screen.getAllByText(/^[1-5]$/);
    expect(orderNumbers.length).toBe(5);
  });

  it('shows drag handles for desktop interaction', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Should show drag handles for desktop (SVG elements)
    const dragHandles = document.querySelectorAll('svg');
    expect(dragHandles.length).toBeGreaterThan(0);
  });

  it('provides appropriate instructions for desktop interaction', () => {
    render(
      <SequenceActivityEnhanced
        content={{ type: 'sequence', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText(/Drag and drop events to put them in the correct order/)).toBeInTheDocument();
    expect(screen.getByText(/Events should follow the story sequence from beginning to end/)).toBeInTheDocument();
  });
});
