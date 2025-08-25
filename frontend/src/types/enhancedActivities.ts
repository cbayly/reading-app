// Enhanced Activity Content Types
export interface EnhancedCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'helper' | 'noble' | 'villain' | 'mentor' | 'friend';
  description: string;
  isReal: boolean; // true for real characters, false for decoys
}

export interface EnhancedSetting {
  name: string;
  description: string;
  isReal: boolean; // true for real settings, false for decoys
}

export interface EnhancedEvent {
  id: string;
  text: string;
  order: number;
}

export interface EnhancedMainIdeaOption {
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface EnhancedVocabularyWord {
  word: string;
  definition: string;
  contextSentence: string;
  isReal: boolean; // true for real words, false for decoys
}

export interface EnhancedPredictionOption {
  text: string;
  plausibilityScore: number; // 1-10
  feedback: string;
}

// Enhanced Activity Content Structure
export interface EnhancedWhoContent {
  realCharacters: EnhancedCharacter[];
  decoyCharacters: EnhancedCharacter[];
  question: string;
  instructions: string;
}

export interface EnhancedWhereContent {
  realSettings: EnhancedSetting[];
  decoySettings: EnhancedSetting[];
  question: string;
  instructions: string;
}

export interface EnhancedSequenceContent {
  events: EnhancedEvent[];
  question: string;
  instructions: string;
}

export interface EnhancedMainIdeaContent {
  question: string;
  options: EnhancedMainIdeaOption[];
  instructions: string;
}

export interface EnhancedVocabularyContent {
  realWords: EnhancedVocabularyWord[];
  decoyWords: EnhancedVocabularyWord[];
  question: string;
  instructions: string;
}

export interface EnhancedPredictContent {
  question: string;
  options: EnhancedPredictionOption[];
  instructions: string;
}

// Union type for all enhanced activity content
export type EnhancedActivityContent = 
  | { type: 'who'; content: EnhancedWhoContent }
  | { type: 'where'; content: EnhancedWhereContent }
  | { type: 'sequence'; content: EnhancedSequenceContent }
  | { type: 'main-idea'; content: EnhancedMainIdeaContent }
  | { type: 'vocabulary'; content: EnhancedVocabularyContent }
  | { type: 'predict'; content: EnhancedPredictContent };

// Enhanced Activity Progress Types
export interface ActivityProgress {
  id: string;
  activityType: 'who' | 'where' | 'sequence' | 'main-idea' | 'vocabulary' | 'predict';
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
  timeSpent?: number; // in seconds
  attempts: number;
  responses: ActivityResponse[];
}

export interface ActivityResponse {
  id: string;
  question: string;
  answer: any; // string, string[], number, etc.
  isCorrect?: boolean;
  feedback?: string;
  score?: number;
  timeSpent?: number; // in seconds
  createdAt: Date;
}

// Enhanced Activity API Response Types
export interface EnhancedActivitiesResponse {
  planId: string;
  dayIndex: number;
  studentAge: number;
  activities: {
    who?: EnhancedWhoContent;
    where?: EnhancedWhereContent;
    sequence?: EnhancedSequenceContent;
    'main-idea'?: EnhancedMainIdeaContent;
    vocabulary?: EnhancedVocabularyContent;
    predict?: EnhancedPredictContent;
  };
  progress: {
    who?: ActivityProgress;
    where?: ActivityProgress;
    sequence?: ActivityProgress;
    'main-idea'?: ActivityProgress;
    vocabulary?: ActivityProgress;
    predict?: ActivityProgress;
  };
}

// Enhanced Activity Props for Components
export interface EnhancedActivityProps {
  content: EnhancedActivityContent;
  progress?: ActivityProgress;
  onComplete: (activityType: string, answers: any[], responses?: ActivityResponse[]) => void;
  onProgressUpdate?: (activityType: string, status: ActivityProgress['status'], timeSpent?: number) => void;
  onJumpToContext?: (anchorId: string) => void;
  className?: string;
  disabled?: boolean;
}

// Device-specific interaction patterns
export interface InteractionPattern {
  primaryInteraction: 'tap' | 'click' | 'hover';
  secondaryInteraction: 'longPress' | 'rightClick' | 'doubleClick';
  dragPattern: 'touchDrag' | 'mouseDrag' | 'hybridDrag';
}

// Activity completion feedback
export interface ActivityFeedback {
  isCorrect: boolean;
  score: number;
  feedback: string;
  suggestions?: string[];
  nextSteps?: string[];
}

// Activity state management
export interface ActivityState {
  isLoading: boolean;
  error?: string;
  isCompleted: boolean;
  currentAttempt: number;
  timeSpent: number;
  answers: any[];
  feedback?: ActivityFeedback;
  status: 'not_started' | 'in_progress' | 'completed';
  canProceed: boolean;
  isLocked: boolean;
}
