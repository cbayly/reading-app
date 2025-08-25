import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WhereActivityEnhanced from './WhereActivityEnhanced';
import { EnhancedWhereContent, ActivityProgress } from '../../types/enhancedActivities';

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

const mockContent: EnhancedWhereContent = {
  realSettings: [
    {
      name: 'Enchanted Forest',
      description: 'A magical forest filled with ancient trees and mysterious creatures',
      isReal: true
    },
    {
      name: 'Crystal Cave',
      description: 'A hidden cave with walls that sparkle like diamonds',
      isReal: true
    }
  ],
  decoySettings: [
    {
      name: 'Desert Oasis',
      description: 'A lush green paradise in the middle of a vast desert',
      isReal: false
    },
    {
      name: 'Floating Island',
      description: 'An island that hovers in the sky above the clouds',
      isReal: false
    }
  ],
  question: 'Which settings appear in this story?',
  instructions: 'Select all the settings that are mentioned in the story.'
};

const mockProgress: ActivityProgress = {
  id: 'progress-1',
  activityType: 'where',
  status: 'not_started',
  attempts: 0,
  responses: []
};

describe('WhereActivityEnhanced', () => {
  const mockOnComplete = jest.fn();
  const mockOnProgressUpdate = jest.fn();
  const mockOnJumpToContext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the activity with question and instructions', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Which settings appear in this story?')).toBeInTheDocument();
    expect(screen.getByText('Select all the settings that are mentioned in the story.')).toBeInTheDocument();
  });

  it('displays all settings with correct information', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Enchanted Forest')).toBeInTheDocument();
    expect(screen.getByText('Crystal Cave')).toBeInTheDocument();
    expect(screen.getByText('Desert Oasis')).toBeInTheDocument();
    expect(screen.getByText('Floating Island')).toBeInTheDocument();

    expect(screen.getByText('A magical forest filled with ancient trees and mysterious creatures')).toBeInTheDocument();
    expect(screen.getByText('A hidden cave with walls that sparkle like diamonds')).toBeInTheDocument();
  });

  it('shows setting type badges', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getAllByText('Story Setting')).toHaveLength(2);
    expect(screen.getAllByText('Other Setting')).toHaveLength(2);
  });

  it('allows setting selection', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    expect(enchantedForestCard).toBeDefined();
    fireEvent.click(enchantedForestCard!);

    expect(screen.getByText('1 setting selected')).toBeInTheDocument();
  });

  it('provides immediate feedback for setting selection', async () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Select a real setting
    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    expect(enchantedForestCard).toBeDefined();
    fireEvent.click(enchantedForestCard!);

    await waitFor(() => {
      expect(screen.getByText(/Great! Enchanted Forest is a setting from the story./)).toBeInTheDocument();
    });

    // Select a decoy setting
    const desertOasisCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('lush green paradise')
    );
    expect(desertOasisCard).toBeDefined();
    fireEvent.click(desertOasisCard!);

    await waitFor(() => {
      expect(screen.getByText(/Desert Oasis is not a setting from the story./)).toBeInTheDocument();
    });
  });

  it('allows setting deselection', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    expect(enchantedForestCard).toBeDefined();
    
    // Select setting
    fireEvent.click(enchantedForestCard!);
    expect(screen.getByText('1 setting selected')).toBeInTheDocument();
    
    // Deselect setting
    fireEvent.click(enchantedForestCard!);
    expect(screen.queryByText('1 setting selected')).not.toBeInTheDocument();
  });

  it('shows correct visual feedback for selected settings', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    expect(enchantedForestCard).toBeDefined();
    fireEvent.click(enchantedForestCard!);

    // Check that the setting card has the correct styling
    expect(enchantedForestCard).toHaveClass('border-green-500', 'bg-green-50');
  });

  it('shows incorrect visual feedback for selected decoy settings', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const desertOasisCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('lush green paradise')
    );
    expect(desertOasisCard).toBeDefined();
    fireEvent.click(desertOasisCard!);

    // Check that the setting card has the correct styling
    expect(desertOasisCard).toHaveClass('border-red-500', 'bg-red-50');
  });

  it('enables complete button when settings are selected', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    expect(enchantedForestCard).toBeDefined();
    fireEvent.click(enchantedForestCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    expect(completeButton).not.toBeDisabled();
  });

  it('calls onComplete with correct data when activity is completed', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Select all real settings
    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    const crystalCaveCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('hidden cave')
    );
    
    expect(enchantedForestCard).toBeDefined();
    expect(crystalCaveCard).toBeDefined();
    fireEvent.click(enchantedForestCard!);
    fireEvent.click(crystalCaveCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledWith('where', ['Enchanted Forest', 'Crystal Cave'], expect.arrayContaining([
      expect.objectContaining({
        question: 'Which settings appear in this story?',
        answer: ['Enchanted Forest', 'Crystal Cave'],
        isCorrect: true,
        score: 100
      })
    ]));
  });

  it('provides detailed feedback when activity is completed incorrectly', async () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Select only one real setting and one decoy
    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    const desertOasisCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('lush green paradise')
    );
    
    expect(enchantedForestCard).toBeDefined();
    expect(desertOasisCard).toBeDefined();
    fireEvent.click(enchantedForestCard!);
    fireEvent.click(desertOasisCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText(/You found 1 out of 2 settings/)).toBeInTheDocument();
      expect(screen.getByText(/You selected 1 setting\(s\) that weren't in the story/)).toBeInTheDocument();
      expect(screen.getByText(/You missed 1 setting\(s\) from the story/)).toBeInTheDocument();
    });
  });

  it('calls onProgressUpdate when activity starts', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(mockOnProgressUpdate).toHaveBeenCalledWith('where', 'in_progress');
  });

  it('restores progress from existing responses', () => {
    const progressWithResponses: ActivityProgress = {
      ...mockProgress,
      status: 'in_progress',
      responses: [
        {
          id: 'response-1',
          question: 'Which settings appear in this story?',
          answer: ['Enchanted Forest'],
          isCorrect: false,
          feedback: 'Partial answer',
          score: 50,
          timeSpent: 30,
          createdAt: new Date()
        }
      ]
    };

    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        progress={progressWithResponses}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('1 setting selected')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    expect(enchantedForestCard).toBeDefined();
    
    // Test Enter key
    fireEvent.keyDown(enchantedForestCard!, { key: 'Enter' });
    expect(screen.getByText('1 setting selected')).toBeInTheDocument();
    
    // Test Space key
    fireEvent.keyDown(enchantedForestCard!, { key: ' ' });
    expect(screen.queryByText('1 setting selected')).not.toBeInTheDocument();
  });

  it('shows jump to context buttons for real settings', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getAllByText('Find in story')).toHaveLength(2); // Only for real settings
  });

  it('calls onJumpToContext when jump button is clicked', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const jumpButtons = screen.getAllByText('Find in story');
    fireEvent.click(jumpButtons[0]);

    expect(mockOnJumpToContext).toHaveBeenCalledWith('setting-enchanted-forest');
  });

  it('disables interaction when disabled prop is true', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
        disabled={true}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    expect(enchantedForestCard).toBeDefined();
    expect(enchantedForestCard).toHaveAttribute('tabindex', '-1');
    expect(enchantedForestCard!.closest('div')).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('hides complete button when activity is already completed', () => {
    const completedProgress: ActivityProgress = {
      ...mockProgress,
      status: 'completed'
    };

    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        progress={completedProgress}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    expect(enchantedForestCard).toBeDefined();
    fireEvent.click(enchantedForestCard!);

    expect(screen.queryByRole('button', { name: /complete activity/i })).not.toBeInTheDocument();
  });

  it('shows completion feedback when activity is already completed', () => {
    const completedProgress: ActivityProgress = {
      ...mockProgress,
      status: 'completed',
      responses: [
        {
          id: 'response-1',
          question: 'Which settings appear in this story?',
          answer: ['Enchanted Forest', 'Crystal Cave'],
          isCorrect: true,
          feedback: 'Excellent! You correctly identified all the settings from the story.',
          score: 100,
          timeSpent: 45,
          createdAt: new Date()
        }
      ]
    };

    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        progress={completedProgress}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // The component should show completion feedback when progress is completed
    expect(screen.getByText(/Activity completed/)).toBeInTheDocument();
  });

  it('calculates score correctly based on correct and incorrect selections', () => {
    render(
      <WhereActivityEnhanced
        content={{ type: 'where', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Select one real setting (Enchanted Forest) and one decoy (Desert Oasis)
    const characterCards = screen.getAllByRole('button');
    const enchantedForestCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('magical forest')
    );
    const desertOasisCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('lush green paradise')
    );
    
    expect(enchantedForestCard).toBeDefined();
    expect(desertOasisCard).toBeDefined();
    fireEvent.click(enchantedForestCard!);
    fireEvent.click(desertOasisCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledWith('where', ['Enchanted Forest', 'Desert Oasis'], expect.arrayContaining([
      expect.objectContaining({
        score: 0 // (1 correct - 1 incorrect) / 2 total * 100 = 0
      })
    ]));
  });
});
