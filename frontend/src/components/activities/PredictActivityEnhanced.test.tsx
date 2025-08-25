import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PredictActivityEnhanced from './PredictActivityEnhanced';
import { EnhancedPredictContent, ActivityProgress } from '../../types/enhancedActivities';

// Mock DeviceDetector for deterministic behavior
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

const mockContent: EnhancedPredictContent = {
  question: 'What is most likely to happen next?',
  instructions: 'Select the prediction that best fits the story events and character goals.',
  options: [
    { text: 'The hero gives up and goes home.', plausibilityScore: 3, feedback: 'This contradicts the hero’s determination shown earlier.' },
    { text: 'The hero asks a friend for help to solve the problem.', plausibilityScore: 8, feedback: 'This aligns with the teamwork theme and prior events.' },
    { text: 'The villain suddenly disappears without reason.', plausibilityScore: 2, feedback: 'This lacks support from the story events.' },
    { text: 'The hero remembers a hint and tries a new approach.', plausibilityScore: 7, feedback: 'This fits clues given earlier and shows growth.' }
  ]
};

const baseProgress: ActivityProgress = {
  id: 'p1',
  activityType: 'predict',
  status: 'not_started',
  attempts: 0,
  responses: []
};

describe('PredictActivityEnhanced', () => {
  const mockOnComplete = jest.fn();
  const mockOnProgressUpdate = jest.fn();
  const mockOnJumpToContext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders question and instructions', () => {
    render(
      <PredictActivityEnhanced
        content={{ type: 'predict', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('What is most likely to happen next?')).toBeInTheDocument();
    expect(screen.getByText(/Select the prediction/)).toBeInTheDocument();
  });

  it('calls onProgressUpdate when activity starts', () => {
    render(
      <PredictActivityEnhanced
        content={{ type: 'predict', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    expect(mockOnProgressUpdate).toHaveBeenCalledWith('predict', 'in_progress');
  });

  it('selects an option and shows immediate feedback', async () => {
    render(
      <PredictActivityEnhanced
        content={{ type: 'predict', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    const strongOption = screen.getByLabelText(/Prediction 2:/);
    fireEvent.click(strongOption);

    await waitFor(() => {
      expect(screen.getByText(/aligns with the teamwork theme/)).toBeInTheDocument();
    });
  });

  it('enables complete when an option is selected and completes with score', () => {
    render(
      <PredictActivityEnhanced
        content={{ type: 'predict', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    const strongOption = screen.getByLabelText(/Prediction 2:/);
    fireEvent.click(strongOption);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    expect(completeButton).not.toBeDisabled();
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalled();
    const call = mockOnComplete.mock.calls[0];
    expect(call[0]).toBe('predict');
    expect(call[1]).toEqual([1]); // index 1
    expect(call[2][0]).toEqual(expect.objectContaining({ score: 80 }));
  });

  it('restores progress from previous response', () => {
    const restore: ActivityProgress = {
      ...baseProgress,
      status: 'in_progress',
      responses: [{
        id: 'r1',
        question: mockContent.question,
        answer: 3,
        isCorrect: true,
        feedback: 'Great!',
        score: 100,
        timeSpent: 12,
        createdAt: new Date()
      }]
    };

    render(
      <PredictActivityEnhanced
        content={{ type: 'predict', content: mockContent }}
        progress={restore}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    // selection restored → complete button enabled
    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    expect(completeButton).not.toBeDisabled();
  });
});


