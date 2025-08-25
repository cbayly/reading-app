import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedActivityPane from './EnhancedActivityPane';
import { EnhancedActivitiesResponse } from '../../types/enhancedActivities';

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

const mockData: EnhancedActivitiesResponse = {
  planId: 'plan1',
  dayIndex: 0,
  studentAge: 8,
  activities: {
    who: {
      question: 'Who are the main characters?',
      instructions: 'Select all characters from the story.',
      realCharacters: [
        { name: 'Alice', role: 'protagonist', description: 'Brave explorer', isReal: true }
      ],
      decoyCharacters: [
        { name: 'Draco', role: 'villain', description: 'A dragon', isReal: false }
      ]
    },
    where: {
      question: 'Where does the story take place?',
      instructions: 'Select all settings from the story.',
      realSettings: [{ name: 'Forest', description: 'Green and lively', isReal: true }],
      decoySettings: [{ name: 'Moon', description: 'Far away', isReal: false }]
    },
    sequence: {
      question: 'Put events in order',
      instructions: 'Arrange from first to last.',
      events: [
        { id: 'e1', text: 'Start', order: 1 },
        { id: 'e2', text: 'Middle', order: 2 },
        { id: 'e3', text: 'End', order: 3 }
      ]
    },
    'main-idea': {
      question: 'Main idea?',
      instructions: 'Pick the best option.',
      options: [
        { text: 'Friendship matters', isCorrect: true, feedback: 'Yes' },
        { text: 'Money matters most', isCorrect: false, feedback: 'No' },
        { text: 'Adventure is key', isCorrect: false, feedback: 'No' },
        { text: 'Education only', isCorrect: false, feedback: 'No' }
      ]
    },
    vocabulary: {
      question: 'Match words',
      instructions: 'Match word to definition.',
      realWords: [
        { word: 'habitat', definition: 'Home of an animal', contextSentence: 'Frogs live in wetlands habitat.', isReal: true }
      ],
      decoyWords: [
        { word: 'glimmer', definition: 'Faint light', contextSentence: 'A glimmer in the night.', isReal: false }
      ]
    },
    predict: {
      question: 'What happens next?',
      instructions: 'Pick the best prediction.',
      options: [
        { text: 'Hero gives up', plausibilityScore: 3, feedback: 'Unlikely' },
        { text: 'Hero tries again', plausibilityScore: 8, feedback: 'Likely' },
        { text: 'Villain vanishes', plausibilityScore: 2, feedback: 'Unsupported' }
      ]
    }
  },
  progress: {
    who: { id: 'p1', activityType: 'who', status: 'not_started', attempts: 0, responses: [] },
    where: { id: 'p2', activityType: 'where', status: 'not_started', attempts: 0, responses: [] },
    sequence: { id: 'p3', activityType: 'sequence', status: 'not_started', attempts: 0, responses: [] },
    'main-idea': { id: 'p4', activityType: 'main-idea', status: 'not_started', attempts: 0, responses: [] },
    vocabulary: { id: 'p5', activityType: 'vocabulary', status: 'not_started', attempts: 0, responses: [] },
    predict: { id: 'p6', activityType: 'predict', status: 'not_started', attempts: 0, responses: [] }
  }
};

describe('EnhancedActivityPane', () => {
  it('renders the stepper and first activity', () => {
    render(<EnhancedActivityPane data={mockData} />);

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText(/Who are the main characters/)).toBeInTheDocument();
  });

  it('navigates between activities via stepper', () => {
    render(<EnhancedActivityPane data={mockData} />);

    // Click the Where step (index 2 because grid shows six; we target by label)
    const whereButton = screen.getByRole('tab', { name: /Where activity/i });
    fireEvent.click(whereButton);

    expect(screen.getByText(/Where does the story take place/)).toBeInTheDocument();
  });
});


