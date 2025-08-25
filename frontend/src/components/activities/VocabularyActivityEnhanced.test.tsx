import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VocabularyActivityEnhanced from './VocabularyActivityEnhanced';
import { EnhancedVocabularyContent, ActivityProgress } from '../../types/enhancedActivities';

// Mock the DeviceDetector hook to force desktop behavior by default
jest.mock('./shared/DeviceDetector', () => ({
  useDeviceDetector: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenWidth: 1280,
    screenHeight: 800,
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

const mockContent: EnhancedVocabularyContent = {
  question: 'Match each word with its correct definition.',
  instructions: 'Use drag-and-drop or click to match words to definitions.',
  realWords: [
    { word: 'habitat', definition: 'The natural home of a plant or animal', contextSentence: 'A frog lives in a wetland habitat.', isReal: true },
    { word: 'migrate', definition: 'To move from one place to another', contextSentence: 'Birds migrate south for the winter.', isReal: true },
  ],
  decoyWords: [
    { word: 'glimmer', definition: 'A faint, unsteady light', contextSentence: 'A glimmer shone in the distance.', isReal: false },
    { word: 'verdant', definition: 'Green with growing plants', contextSentence: 'The meadow was verdant after spring rains.', isReal: false },
  ]
};

const baseProgress: ActivityProgress = {
  id: 'p1',
  activityType: 'vocabulary',
  status: 'not_started',
  attempts: 0,
  responses: []
};

describe('VocabularyActivityEnhanced', () => {
  const mockOnComplete = jest.fn();
  const mockOnProgressUpdate = jest.fn();
  const mockOnJumpToContext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders question and instructions', () => {
    render(
      <VocabularyActivityEnhanced
        content={{ type: 'vocabulary', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Match each word with its correct definition.')).toBeInTheDocument();
    expect(screen.getByText('Use drag-and-drop or click to match words to definitions.')).toBeInTheDocument();
  });

  it('lists words and definitions', () => {
    render(
      <VocabularyActivityEnhanced
        content={{ type: 'vocabulary', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    expect(screen.getByLabelText(/Word: habitat/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Word: migrate/i)).toBeInTheDocument();
    expect(screen.getAllByText(/The natural home of a plant or animal|To move from one place to another|A faint, unsteady light|Green with growing plants/).length).toBeGreaterThan(0);
  });

  it('click-to-match produces immediate feedback (correct)', async () => {
    render(
      <VocabularyActivityEnhanced
        content={{ type: 'vocabulary', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    const word = screen.getByLabelText(/Word: habitat/);
    fireEvent.click(word);

    const correctDef = screen.getByLabelText(/Definition: The natural home of a plant or animal/);
    fireEvent.click(correctDef);

    await waitFor(() => {
      expect(screen.getByText(/Nice! “habitat” matches its definition./)).toBeInTheDocument();
    });
  });

  it('click-to-match produces immediate feedback (incorrect)', async () => {
    render(
      <VocabularyActivityEnhanced
        content={{ type: 'vocabulary', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    const word = screen.getByLabelText(/Word: habitat/);
    fireEvent.click(word);

    const wrongDef = screen.getByLabelText(/Definition: To move from one place to another/);
    fireEvent.click(wrongDef);

    await waitFor(() => {
      expect(screen.getByText(/Not quite. That definition does not match “habitat”./)).toBeInTheDocument();
    });
  });

  it('disables interaction when disabled', () => {
    render(
      <VocabularyActivityEnhanced
        content={{ type: 'vocabulary', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        disabled
      />
    );

    const word = screen.getByLabelText(/Word: habitat/);
    expect(word).toHaveAttribute('tabindex', '-1');
  });

  it('completes and calls onComplete with results', () => {
    render(
      <VocabularyActivityEnhanced
        content={{ type: 'vocabulary', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    // Match both real words correctly
    fireEvent.click(screen.getByLabelText(/Word: habitat/));
    fireEvent.click(screen.getByLabelText(/Definition: The natural home of a plant or animal/));

    fireEvent.click(screen.getByLabelText(/Word: migrate/));
    fireEvent.click(screen.getByLabelText(/Definition: To move from one place to another/));

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalled();
    const call = mockOnComplete.mock.calls[0];
    expect(call[0]).toBe('vocabulary');
    expect(Array.isArray(call[1])).toBe(true);
    expect(call[2][0]).toEqual(expect.objectContaining({ question: 'Match each word with its correct definition.' }));
  });

  it('restores progress when responses exist', () => {
    const restoreProgress: ActivityProgress = {
      ...baseProgress,
      status: 'in_progress',
      responses: [
        {
          id: 'r1',
          question: 'Match each word with its correct definition.',
          answer: [
            { word: 'habitat', definition: 'The natural home of a plant or animal', isCorrect: true }
          ],
          isCorrect: false,
          feedback: 'Keep going',
          score: 50,
          timeSpent: 10,
          createdAt: new Date()
        }
      ]
    };

    render(
      <VocabularyActivityEnhanced
        content={{ type: 'vocabulary', content: mockContent }}
        progress={restoreProgress}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    // Matched count should reflect restored pairing
    expect(screen.getByText(/Matched: 1 of/)).toBeInTheDocument();
  });
});


