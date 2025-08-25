import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainIdeaActivityEnhanced from './MainIdeaActivityEnhanced';
import { EnhancedMainIdeaContent, ActivityProgress } from '../../types/enhancedActivities';

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

const mockContent: EnhancedMainIdeaContent = {
  question: 'What is the main idea or theme of this story?',
  instructions: 'Select the option that best describes the main message or lesson of the story.',
  options: [
    {
      text: 'Friendship and loyalty are the most important values in life.',
      isCorrect: true,
      feedback: 'Excellent! This story emphasizes the importance of friendship and loyalty throughout the narrative.'
    },
    {
      text: 'Money and wealth bring true happiness.',
      isCorrect: false,
      feedback: 'This story actually shows that friendship and loyalty are more valuable than money.'
    },
    {
      text: 'Adventure and excitement are the keys to a good life.',
      isCorrect: false,
      feedback: 'While the story has adventure elements, the main focus is on friendship and loyalty.'
    },
    {
      text: 'Education and learning are the most important things.',
      isCorrect: false,
      feedback: 'The story includes learning moments, but the central theme is friendship and loyalty.'
    }
  ]
};

const mockProgress: ActivityProgress = {
  id: 'progress-1',
  activityType: 'main-idea',
  status: 'not_started',
  attempts: 0,
  responses: []
};

describe('MainIdeaActivityEnhanced', () => {
  const mockOnComplete = jest.fn();
  const mockOnProgressUpdate = jest.fn();
  const mockOnJumpToContext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the activity with question and instructions', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('What is the main idea or theme of this story?')).toBeInTheDocument();
    expect(screen.getByText('Select the option that best describes the main message or lesson of the story.')).toBeInTheDocument();
  });

  it('displays all multiple choice options', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Friendship and loyalty are the most important values in life.')).toBeInTheDocument();
    expect(screen.getByText('Money and wealth bring true happiness.')).toBeInTheDocument();
    expect(screen.getByText('Adventure and excitement are the keys to a good life.')).toBeInTheDocument();
    expect(screen.getByText('Education and learning are the most important things.')).toBeInTheDocument();
  });

  it('shows option numbers for each choice', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
    expect(screen.getByText('Option 4')).toBeInTheDocument();
  });

  it('allows option selection', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const firstOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(firstOptionCard).toBeDefined();
    fireEvent.click(firstOptionCard!);

    expect(screen.getByText('Option selected')).toBeInTheDocument();
  });

  it('provides immediate feedback for correct option selection', async () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const correctOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(correctOptionCard).toBeDefined();
    fireEvent.click(correctOptionCard!);

    await waitFor(() => {
      expect(screen.getByText(/Excellent! This story emphasizes the importance of friendship and loyalty/)).toBeInTheDocument();
    });
  });

  it('provides immediate feedback for incorrect option selection', async () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const incorrectOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Money and wealth')
    );
    expect(incorrectOptionCard).toBeDefined();
    fireEvent.click(incorrectOptionCard!);

    await waitFor(() => {
      expect(screen.getByText(/This story actually shows that friendship and loyalty are more valuable than money/)).toBeInTheDocument();
    });
  });

  it('shows correct visual feedback for selected options', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const correctOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(correctOptionCard).toBeDefined();
    fireEvent.click(correctOptionCard!);

    // Check that the option card has the correct styling
    expect(correctOptionCard).toHaveClass('border-green-500', 'bg-green-50');
  });

  it('shows incorrect visual feedback for selected wrong options', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const incorrectOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Money and wealth')
    );
    expect(incorrectOptionCard).toBeDefined();
    fireEvent.click(incorrectOptionCard!);

    // Check that the option card has the correct styling
    expect(incorrectOptionCard).toHaveClass('border-red-500', 'bg-red-50');
  });

  it('enables complete button when an option is selected', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const firstOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(firstOptionCard).toBeDefined();
    fireEvent.click(firstOptionCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    expect(completeButton).not.toBeDisabled();
  });

  it('calls onComplete with correct data when activity is completed', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const correctOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(correctOptionCard).toBeDefined();
    fireEvent.click(correctOptionCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledWith('main-idea', 'Friendship and loyalty are the most important values in life.', expect.arrayContaining([
      expect.objectContaining({
        question: 'What is the main idea or theme of this story?',
        answer: 'Friendship and loyalty are the most important values in life.',
        isCorrect: true,
        score: 100
      })
    ]));
  });

  it('calls onProgressUpdate when activity starts', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(mockOnProgressUpdate).toHaveBeenCalledWith('main-idea', 'in_progress');
  });

  it('restores progress from existing responses', () => {
    const progressWithResponses: ActivityProgress = {
      ...mockProgress,
      status: 'in_progress',
      responses: [
        {
          id: 'response-1',
          question: 'What is the main idea or theme of this story?',
          answer: 'Friendship and loyalty are the most important values in life.',
          isCorrect: true,
          feedback: 'Correct answer',
          score: 100,
          timeSpent: 30,
          createdAt: new Date()
        }
      ]
    };

    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        progress={progressWithResponses}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Option selected')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const firstOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(firstOptionCard).toBeDefined();
    
    // Test Enter key
    fireEvent.keyDown(firstOptionCard!, { key: 'Enter' });
    expect(screen.getByText('Option selected')).toBeInTheDocument();
    
    // Test Space key (should also select the option)
    fireEvent.keyDown(firstOptionCard!, { key: ' ' });
    expect(screen.getByText('Option selected')).toBeInTheDocument();
  });

  it('shows jump to context button', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Find in Story')).toBeInTheDocument();
  });

  it('calls onJumpToContext when jump button is clicked', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const jumpButton = screen.getByText('Find in Story');
    fireEvent.click(jumpButton);

    expect(mockOnJumpToContext).toHaveBeenCalledWith('main-idea-context');
  });

  it('disables interaction when disabled prop is true', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
        disabled={true}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const firstOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(firstOptionCard).toBeDefined();
    expect(firstOptionCard).toHaveAttribute('tabindex', '-1');
    expect(firstOptionCard!.closest('div')).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('hides complete button when activity is already completed', () => {
    const completedProgress: ActivityProgress = {
      ...mockProgress,
      status: 'completed'
    };

    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        progress={completedProgress}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const firstOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(firstOptionCard).toBeDefined();
    fireEvent.click(firstOptionCard!);

    expect(screen.queryByRole('button', { name: /complete activity/i })).not.toBeInTheDocument();
  });

  it('shows completion feedback when activity is already completed', () => {
    const completedProgress: ActivityProgress = {
      ...mockProgress,
      status: 'completed',
      responses: [
        {
          id: 'response-1',
          question: 'What is the main idea or theme of this story?',
          answer: 'Friendship and loyalty are the most important values in life.',
          isCorrect: true,
          feedback: 'Excellent! This story emphasizes the importance of friendship and loyalty throughout the narrative.',
          score: 100,
          timeSpent: 45,
          createdAt: new Date()
        }
      ]
    };

    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        progress={completedProgress}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText(/Activity completed/)).toBeInTheDocument();
  });

  it('shows correct answer indicator when option is selected', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const correctOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(correctOptionCard).toBeDefined();
    fireEvent.click(correctOptionCard!);

    expect(screen.getByText('Correct Answer')).toBeInTheDocument();
  });

  it('calculates score correctly based on selection', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const optionCards = screen.getAllByRole('button');
    const correctOptionCard = optionCards.find(card => 
      card.getAttribute('aria-label')?.includes('Friendship and loyalty')
    );
    expect(correctOptionCard).toBeDefined();
    fireEvent.click(correctOptionCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledWith('main-idea', 'Friendship and loyalty are the most important values in life.', expect.arrayContaining([
      expect.objectContaining({
        score: 100
      })
    ]));
  });

  it('provides appropriate instructions for desktop interaction', () => {
    render(
      <MainIdeaActivityEnhanced
        content={{ type: 'main-idea', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText(/Click on the option that best describes the main idea/)).toBeInTheDocument();
    expect(screen.getByText(/Read all options carefully before making your choice/)).toBeInTheDocument();
  });
});
