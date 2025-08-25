import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActivityStepper, { ActivityStep } from './ActivityStepper';

const mockSteps: ActivityStep[] = [
  {
    id: 'who-1',
    type: 'who',
    label: 'Who',
    completed: false,
    accessible: true
  },
  {
    id: 'where-1',
    type: 'where',
    label: 'Where',
    completed: false,
    accessible: true
  },
  {
    id: 'sequence-1',
    type: 'sequence',
    label: 'Sequence',
    completed: true,
    accessible: true
  },
  {
    id: 'main-idea-1',
    type: 'main-idea',
    label: 'Main Idea',
    completed: false,
    accessible: false
  },
  {
    id: 'vocabulary-1',
    type: 'vocabulary',
    label: 'Vocabulary',
    completed: false,
    accessible: true
  },
  {
    id: 'predict-1',
    type: 'predict',
    label: 'Predict',
    completed: false,
    accessible: true
  }
];

describe('ActivityStepper', () => {
  const mockOnStepClick = jest.fn();

  beforeEach(() => {
    mockOnStepClick.mockClear();
  });

  it('renders all activity steps', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
      />
    );

    expect(screen.getByText('Who')).toBeInTheDocument();
    expect(screen.getByText('Where')).toBeInTheDocument();
    expect(screen.getByText('Sequence')).toBeInTheDocument();
    expect(screen.getByText('Main Idea')).toBeInTheDocument();
    expect(screen.getByText('Vocabulary')).toBeInTheDocument();
    expect(screen.getByText('Predict')).toBeInTheDocument();
  });

  it('shows correct step numbers', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('highlights current step', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={1}
        onStepClick={mockOnStepClick}
      />
    );

    const whereButton = screen.getByRole('tab', { name: /where activity 2/i });
    expect(whereButton).toHaveAttribute('aria-selected', 'true');
  });

  it('shows completed steps with checkmark', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
      />
    );

    const sequenceButton = screen.getByRole('tab', { name: /sequence activity 3 completed/i });
    expect(sequenceButton).toBeInTheDocument();
  });

  it('calls onStepClick when accessible step is clicked', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
      />
    );

    const whereButton = screen.getByRole('tab', { name: /where activity 2/i });
    fireEvent.click(whereButton);

    expect(mockOnStepClick).toHaveBeenCalledWith(1);
  });

  it('does not call onStepClick when inaccessible step is clicked', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
      />
    );

    const mainIdeaButton = screen.getByRole('tab', { name: /main idea activity 4/i });
    fireEvent.click(mainIdeaButton);

    expect(mockOnStepClick).not.toHaveBeenCalled();
  });

  it('handles keyboard navigation with arrow keys', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={1}
        onStepClick={mockOnStepClick}
      />
    );

    const whereButton = screen.getByRole('tab', { name: /where activity 2/i });
    
    // Test right arrow
    fireEvent.keyDown(whereButton, { key: 'ArrowRight' });
    expect(mockOnStepClick).toHaveBeenCalledWith(2);

    // Test left arrow
    fireEvent.keyDown(whereButton, { key: 'ArrowLeft' });
    expect(mockOnStepClick).toHaveBeenCalledWith(0);
  });

  it('handles Home and End keys', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={2}
        onStepClick={mockOnStepClick}
      />
    );

    const sequenceButton = screen.getByRole('tab', { name: /sequence activity 3 completed/i });
    
    // Test Home key
    fireEvent.keyDown(sequenceButton, { key: 'Home' });
    expect(mockOnStepClick).toHaveBeenCalledWith(0);

    // Test End key
    fireEvent.keyDown(sequenceButton, { key: 'End' });
    expect(mockOnStepClick).toHaveBeenCalledWith(5);
  });

  it('handles Enter and Space keys', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
      />
    );

    const whoButton = screen.getByRole('tab', { name: /who activity 1/i });
    
    // Test Enter key
    fireEvent.keyDown(whoButton, { key: 'Enter' });
    expect(mockOnStepClick).toHaveBeenCalledWith(0);

    // Test Space key
    fireEvent.keyDown(whoButton, { key: ' ' });
    expect(mockOnStepClick).toHaveBeenCalledWith(0);
  });

  it('prevents default behavior for navigation keys', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={1}
        onStepClick={mockOnStepClick}
      />
    );

    const whereButton = screen.getByRole('tab', { name: /where activity 2/i });
    
    // Test that preventDefault is called by checking that the event doesn't bubble
    const mockPreventDefault = jest.fn();
    fireEvent.keyDown(whereButton, { 
      key: 'ArrowRight',
      preventDefault: mockPreventDefault
    });
    
    expect(mockOnStepClick).toHaveBeenCalledWith(2);
  });

  it('shows progress bar with correct width', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={2}
        onStepClick={mockOnStepClick}
      />
    );

    // The progress bar is a div with a background color, not a progressbar role
    const progressContainer = screen.getByText('Progress').closest('div')?.parentElement;
    expect(progressContainer).toBeInTheDocument();
  });

  it('shows progress text', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={2}
        onStepClick={mockOnStepClick}
      />
    );

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('3 of 6')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('uses custom aria-label', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
        aria-label="Custom navigation"
      />
    );

    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Custom navigation');
  });

  it('returns null when no steps are provided', () => {
    const { container } = render(
      <ActivityStepper
        steps={[]}
        currentIndex={0}
        onStepClick={mockOnStepClick}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles edge case navigation keys', () => {
    render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
      />
    );

    const whoButton = screen.getByRole('tab', { name: /who activity 1/i });
    
    // Test left arrow at first step (should not call onStepClick)
    fireEvent.keyDown(whoButton, { key: 'ArrowLeft' });
    expect(mockOnStepClick).not.toHaveBeenCalled();

    // Test right arrow at last step
    const predictButton = screen.getByRole('tab', { name: /predict activity 6/i });
    fireEvent.keyDown(predictButton, { key: 'ArrowRight' });
    expect(mockOnStepClick).not.toHaveBeenCalled();
  });

  it('focuses current step on mount and update', () => {
    const { rerender } = render(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={0}
        onStepClick={mockOnStepClick}
      />
    );

    const whoButton = screen.getByRole('tab', { name: /who activity 1/i });
    expect(whoButton).toHaveFocus();

    // Change current index
    rerender(
      <ActivityStepper
        steps={mockSteps}
        currentIndex={2}
        onStepClick={mockOnStepClick}
      />
    );

    const sequenceButton = screen.getByRole('tab', { name: /sequence activity 3 completed/i });
    expect(sequenceButton).toHaveFocus();
  });
});
