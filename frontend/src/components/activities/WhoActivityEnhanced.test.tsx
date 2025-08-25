import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WhoActivityEnhanced from './WhoActivityEnhanced';
import { EnhancedWhoContent, ActivityProgress } from '../../types/enhancedActivities';

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

const mockContent: EnhancedWhoContent = {
  realCharacters: [
    {
      name: 'Alice',
      role: 'protagonist',
      description: 'A brave young girl who loves adventures',
      isReal: true
    },
    {
      name: 'Bob',
      role: 'supporting',
      description: 'Alice\'s best friend who helps her on her journey',
      isReal: true
    }
  ],
  decoyCharacters: [
    {
      name: 'Charlie',
      role: 'villain',
      description: 'A mysterious character who appears in other stories',
      isReal: false
    },
    {
      name: 'Diana',
      role: 'mentor',
      description: 'A wise teacher who guides young heroes',
      isReal: false
    }
  ],
  question: 'Which characters appear in this story?',
  instructions: 'Select all the characters that are mentioned in the story.'
};

const mockProgress: ActivityProgress = {
  id: 'progress-1',
  activityType: 'who',
  status: 'not_started',
  attempts: 0,
  responses: []
};

describe('WhoActivityEnhanced', () => {
  const mockOnComplete = jest.fn();
  const mockOnProgressUpdate = jest.fn();
  const mockOnJumpToContext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the activity with question and instructions', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Which characters appear in this story?')).toBeInTheDocument();
    expect(screen.getByText('Select all the characters that are mentioned in the story.')).toBeInTheDocument();
  });

  it('displays all characters with correct information', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();

    expect(screen.getByText('A brave young girl who loves adventures')).toBeInTheDocument();
    expect(screen.getByText('Alice\'s best friend who helps her on her journey')).toBeInTheDocument();
  });

  it('shows character roles as badges', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('protagonist')).toBeInTheDocument();
    expect(screen.getByText('supporting')).toBeInTheDocument();
    expect(screen.getByText('villain')).toBeInTheDocument();
    expect(screen.getByText('mentor')).toBeInTheDocument();
  });

  it('allows character selection', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const aliceCard = screen.getByRole('button', { name: /Alice - A brave young girl who loves adventures \(from story\)/ });
    fireEvent.click(aliceCard);

    expect(screen.getByText('1 character selected')).toBeInTheDocument();
  });

  it('provides immediate feedback for character selection', async () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Select a real character
    const aliceCard = screen.getByRole('button', { name: /Alice - A brave young girl who loves adventures \(from story\)/ });
    fireEvent.click(aliceCard);

    await waitFor(() => {
      expect(screen.getByText(/Great! Alice is a character from the story./)).toBeInTheDocument();
    });

    // Select a decoy character
    const charlieCard = screen.getByRole('button', { name: /Charlie - A mysterious character who appears in other stories \(not from story\)/ });
    fireEvent.click(charlieCard);

    await waitFor(() => {
      expect(screen.getByText(/Charlie is not a character from the story./)).toBeInTheDocument();
    });
  });

  it('allows character deselection', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const aliceCard = characterCards[0]; // First character card (Alice)
    
    // Select character
    fireEvent.click(aliceCard);
    expect(screen.getByText('1 character selected')).toBeInTheDocument();
    
    // Deselect character
    fireEvent.click(aliceCard);
    expect(screen.queryByText('1 character selected')).not.toBeInTheDocument();
  });

  it('shows correct visual feedback for selected characters', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const aliceCard = characterCards[0]; // First character card (Alice)
    fireEvent.click(aliceCard);

    // Check that the character card has the correct styling
    expect(aliceCard).toHaveClass('border-green-500', 'bg-green-50');
  });

  it('shows incorrect visual feedback for selected decoy characters', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Find Charlie card by looking for the character with "mysterious character" description
    const characterCards = screen.getAllByRole('button');
    const charlieCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('mysterious character')
    );
    expect(charlieCard).toBeDefined();
    fireEvent.click(charlieCard!);

    // Check that the character card has the correct styling
    expect(charlieCard).toHaveClass('border-red-500', 'bg-red-50');
  });

  it('enables complete button when characters are selected', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const aliceCard = characterCards[0]; // First character card (Alice)
    fireEvent.click(aliceCard);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    expect(completeButton).not.toBeDisabled();
  });

  it('calls onComplete with correct data when activity is completed', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Select all real characters
    const characterCards = screen.getAllByRole('button');
    const aliceCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('brave young girl')
    );
    const bobCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('best friend')
    );
    
    expect(aliceCard).toBeDefined();
    expect(bobCard).toBeDefined();
    fireEvent.click(aliceCard!);
    fireEvent.click(bobCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledWith('who', ['Alice', 'Bob'], expect.arrayContaining([
      expect.objectContaining({
        question: 'Which characters appear in this story?',
        answer: ['Alice', 'Bob'],
        isCorrect: true,
        score: 100
      })
    ]));
  });

  it('provides detailed feedback when activity is completed incorrectly', async () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Select only one real character and one decoy
    const characterCards = screen.getAllByRole('button');
    const aliceCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('brave young girl')
    );
    const charlieCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('mysterious character')
    );
    
    expect(aliceCard).toBeDefined();
    expect(charlieCard).toBeDefined();
    fireEvent.click(aliceCard!);
    fireEvent.click(charlieCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByText(/You found 1 out of 2 characters/)).toBeInTheDocument();
      expect(screen.getByText(/You selected 1 character\(s\) that weren't in the story/)).toBeInTheDocument();
      expect(screen.getByText(/You missed 1 character\(s\) from the story/)).toBeInTheDocument();
    });
  });

  it('calls onProgressUpdate when activity starts', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(mockOnProgressUpdate).toHaveBeenCalledWith('who', 'in_progress');
  });

  it('restores progress from existing responses', () => {
    const progressWithResponses: ActivityProgress = {
      ...mockProgress,
      status: 'in_progress',
      responses: [
        {
          id: 'response-1',
          question: 'Which characters appear in this story?',
          answer: ['Alice'],
          isCorrect: false,
          feedback: 'Partial answer',
          score: 50,
          timeSpent: 30,
          createdAt: new Date()
        }
      ]
    };

    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        progress={progressWithResponses}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getByText('1 character selected')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const aliceCard = characterCards[0]; // First character card (Alice)
    
    // Test Enter key
    fireEvent.keyDown(aliceCard, { key: 'Enter' });
    expect(screen.getByText('1 character selected')).toBeInTheDocument();
    
    // Test Space key
    fireEvent.keyDown(aliceCard, { key: ' ' });
    expect(screen.queryByText('1 character selected')).not.toBeInTheDocument();
  });

  it('shows jump to context buttons for real characters', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    expect(screen.getAllByText('Find in story')).toHaveLength(2); // Only for real characters
  });

  it('calls onJumpToContext when jump button is clicked', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const jumpButtons = screen.getAllByText('Find in story');
    fireEvent.click(jumpButtons[0]);

    expect(mockOnJumpToContext).toHaveBeenCalledWith('character-alice');
  });

  it('disables interaction when disabled prop is true', () => {
    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
        disabled={true}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const aliceCard = characterCards[0]; // First character card (Alice)
    expect(aliceCard).toHaveAttribute('tabindex', '-1');
    expect(aliceCard.closest('div')).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('hides complete button when activity is already completed', () => {
    const completedProgress: ActivityProgress = {
      ...mockProgress,
      status: 'completed'
    };

    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        progress={completedProgress}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    const characterCards = screen.getAllByRole('button');
    const aliceCard = characterCards[0]; // First character card (Alice)
    fireEvent.click(aliceCard);

    expect(screen.queryByRole('button', { name: /complete activity/i })).not.toBeInTheDocument();
  });

  it('shows completion feedback when activity is already completed', () => {
    const completedProgress: ActivityProgress = {
      ...mockProgress,
      status: 'completed',
      responses: [
        {
          id: 'response-1',
          question: 'Which characters appear in this story?',
          answer: ['Alice', 'Bob'],
          isCorrect: true,
          feedback: 'Excellent! You correctly identified all the characters from the story.',
          score: 100,
          timeSpent: 45,
          createdAt: new Date()
        }
      ]
    };

    render(
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
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
      <WhoActivityEnhanced
        content={{ type: 'who', content: mockContent }}
        onComplete={mockOnComplete}
        onProgressUpdate={mockOnProgressUpdate}
        onJumpToContext={mockOnJumpToContext}
      />
    );

    // Select one real character (Alice) and one decoy (Charlie)
    const characterCards = screen.getAllByRole('button');
    const aliceCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('brave young girl')
    );
    const charlieCard = characterCards.find(card => 
      card.getAttribute('aria-label')?.includes('mysterious character')
    );
    
    expect(aliceCard).toBeDefined();
    expect(charlieCard).toBeDefined();
    fireEvent.click(aliceCard!);
    fireEvent.click(charlieCard!);

    const completeButton = screen.getByRole('button', { name: /complete activity/i });
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledWith('who', ['Alice', 'Charlie'], expect.arrayContaining([
      expect.objectContaining({
        score: 0 // (1 correct - 1 incorrect) / 2 total * 100 = 0
      })
    ]));
  });
});
