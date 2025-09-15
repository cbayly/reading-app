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
  sourceParagraph?: number;
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
  metadata?: Record<string, any>; // For additional tracking data
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
  planId?: string;
  dayIndex?: number;
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

// Feature Flag Types
export interface FeatureFlags {
  enhancedActivities: {
    enabled: boolean;
    rolloutPercentage: number;
    allowedStudentIds: string[];
    allowedPlanIds: string[];
    abTestEnabled: boolean;
    abTestPercentage: number;
  };
  enhancedProgressTracking: {
    enabled: boolean;
    rolloutPercentage: number;
  };
  enhancedAnalytics: {
    enabled: boolean;
    rolloutPercentage: number;
  };
}

export interface FeatureFlagStatus {
  enhancedActivities: boolean;
  abTest: boolean;
  enhancedProgressTracking: boolean;
  enhancedAnalytics: boolean;
  flags: FeatureFlags;
}

// Analytics Types
export interface ActivityEvent {
  eventType: 'activity_started' | 'activity_completed' | 'activity_error' | 'activity_abandoned';
  activityType: string;
  planId: string;
  dayIndex: number;
  studentId: string;
  timestamp: number;
  duration?: number;
  attempts?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceEvent {
  eventType: 'page_load' | 'activity_load' | 'content_generation' | 'api_call';
  component: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface UserEngagementEvent {
  eventType: 'session_start' | 'session_end' | 'feature_used' | 'interaction';
  feature: string;
  studentId: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ABTestEvent {
  eventType: 'ab_test_assigned' | 'ab_test_completed';
  testName: string;
  variant: 'control' | 'treatment';
  studentId: string;
  timestamp: number;
  success?: boolean;
  metadata?: Record<string, any>;
}

// Session Management Types
export interface SessionInfo {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  totalTimeSpent: number;
  activityCount: number;
  unsavedChanges: boolean;
}

export interface SessionData {
  sessionId: string;
  studentId: string;
  planId: string;
  dayIndex: number;
  progress: Record<string, ActivityProgress>;
  startTime: Date;
  lastActivity: Date;
}

// Progress Management Types
export interface ProgressRestorationInfo {
  isRestoring: boolean;
  restoredFrom: 'none' | 'server' | 'local' | 'session';
  canRestore: boolean;
  error?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'save' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface ConnectionQuality {
  status: 'offline' | 'poor' | 'fair' | 'good' | 'excellent';
  latency: number;
  lastChecked: Date;
}

// Enhanced Activity Pane Props
export interface EnhancedActivityPaneProps {
  planId: string;
  dayIndex: number;
  studentId: string;
  activities: EnhancedActivityContent[];
  onJumpToContext?: (anchorId: string) => void;
  className?: string;
}

// Activity Progress Hook Return Type
export interface UseActivityProgressReturn {
  // Progress state
  progress: ActivityProgress | null;
  isLoading: boolean;
  error: string | null;
  
  // Progress management
  updateProgress: (status: ActivityProgress['status'], responses?: ActivityResponse[]) => Promise<void>;
  saveResponse: (response: ActivityResponse) => Promise<void>;
  completeActivity: (responses: ActivityResponse[]) => Promise<void>;
  resetProgress: () => Promise<void>;
  
  // State queries
  getActivityState: () => ActivityState;
  getAnswerHistory: () => ActivityResponse[];
  getLastAnswer: () => ActivityResponse | null;
  getAnswersByType: (type: string) => ActivityResponse[];
  exportAnswers: () => string;
  
  // Restoration
  isRestoring: boolean;
  restoredFrom: ProgressRestorationInfo['restoredFrom'];
  canRestore: boolean;
  restoreProgress: () => Promise<void>;
  
  // Synchronization
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  pendingSyncCount: number;
  lastSyncAttempt: Date | null;
  forceSync: () => Promise<void>;
  
  // Session management
  sessionInterrupted: boolean;
  sessionRecovered: boolean;
  saveSession: () => void;
  recoverSession: () => Promise<void>;
  clearSession: () => void;
  getSessionInfo: () => SessionInfo;
  
  // Auto-save
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  lastAutoSave: Date | null;
}

// Analytics Summary Types
export interface AnalyticsSummary {
  queueLength: number;
  isProcessing: boolean;
}

// Performance Monitor Types
export interface PerformanceMetrics {
  component: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// Activity Tracker Types
export interface ActivityMetrics {
  activityType: string;
  planId: string;
  dayIndex: number;
  studentId: string;
  duration: number;
  attempts: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// Session Tracker Types
export interface SessionMetrics {
  studentId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  featuresUsed: string[];
  interactions: string[];
}

// API Error Types
export interface APIError {
  message: string;
  code: string;
  details?: any;
  timestamp: Date;
}

// Content Generation Types
export interface ContentGenerationRequest {
  storyTitle: string;
  storyParts: string[];
  themes: string[];
  gradeLevel: number;
  interests: string;
}

export interface ContentGenerationResponse {
  activities: EnhancedActivityContent[];
  metadata: {
    generationTime: number;
    modelUsed: string;
    cacheHit: boolean;
  };
}

// Migration Types
export interface MigrationStatus {
  planId: string;
  planName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
  enhancedContentGenerated: boolean;
  lastUpdated: Date;
}
