// Core Plan3 Types
export interface Plan3 {
  id: string;
  studentId: string;
  storyId: string;
  days: Plan3Day[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan3Day {
  id: string;
  plan3Id: string;
  index: number; // 1, 2, or 3
  chapterId: string;
  answers?: ActivityAnswers;
  completed?: boolean;
  completedAt?: Date;
}

export interface Story3 {
  id: string;
  title: string;
  parts: {
    part1: string;
    part2: string;
    part3: string;
  };
  createdAt: Date;
}

// Activity Types
export type ActivityType = 'who' | 'where' | 'sequence' | 'main_idea' | 'predict';

export interface Activity {
  id: string;
  type: ActivityType;
  prompt: string;
  answer?: any;
  completed?: boolean;
  hints?: string[];
  choices?: string[];
  characters?: Character[];
  events?: Event[];
  themes?: string[];
  predictionTypes?: string[];
}

export interface Character {
  id: string;
  name: string;
  description: string;
  matched?: boolean;
}

export interface Event {
  id: string;
  text: string;
  order?: number;
}

// Activity Answers
export interface ActivityAnswers {
  who?: string[];
  where?: string;
  sequence?: string[];
  main_idea?: string;
  predict?: string;
}

// Chapter Content
export interface Chapter {
  id: string;
  title: string;
  content: string;
  anchors?: Record<string, string>;
}

// Day Data Payload
export interface DayData {
  chapter: Chapter;
  activities: Activity[];
}

// UI State Types
export type LayoutMode = 'reading' | 'split' | 'activity';

export interface ReadingUiPrefs {
  mode: LayoutMode;
  divider: number; // 0..1 fraction
  fontSize: number;
  lastTaskId?: string;
}

// API Response Types
export interface CreatePlan3Request {
  studentId: string;
  storyId?: string;
}

export interface CreatePlan3Response {
  plan: Plan3;
  story: Story3;
}

export interface GetPlan3Response {
  plan: Plan3;
  story: Story3;
}

export interface GetDayResponse {
  day: DayData;
}

export interface SaveAnswersRequest {
  answers: ActivityAnswers;
}

export interface SaveAnswersResponse {
  success: boolean;
  day: Plan3Day;
}

// Error Types
export interface Plan3Error {
  code: string;
  message: string;
  details?: any;
}

// Navigation Types
export interface Plan3Navigation {
  currentDay: number;
  totalDays: number;
  hasPreviousDay: boolean;
  hasNextDay: boolean;
  dayProgress: number;
}

// Progress Types
export interface Plan3Progress {
  planId: string;
  totalDays: number;
  completedDays: number;
  currentDay: number;
  overallProgress: number;
  dayProgress: {
    [dayIndex: number]: {
      completed: boolean;
      activitiesCompleted: number;
      totalActivities: number;
    };
  };
}

// Auto-save Types
export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error: Error | null;
  save: () => Promise<void>;
  reset: () => void;
}

// Activity State Types
export interface ActivityState {
  currentActivityIndex: number;
  completedActivities: Set<string>;
  activityResponses: Record<string, any>;
  isSubmitting: boolean;
  error: string | null;
}

// Reading State Types
export interface ReadingState {
  currentParagraph: string | null;
  readingProgress: number;
  fontSize: number;
  layoutMode: LayoutMode;
  dividerPosition: number;
  showTableOfContents: boolean;
  highlightedAnchor: string | null;
}

// Component Props Types
export interface Plan3PageProps {
  planId: string;
  dayIndex: number;
}

export interface ActivityPaneProps {
  activities: Activity[];
  onJumpToContext?: (anchorId: string) => void;
  onActivityUpdate?: (activityId: string, answer: any) => void;
  onPeekReading?: () => void;
  className?: string;
}

export interface EnhancedReadingPaneProps {
  chapter: Chapter | null;
  fontSize: number;
  onJumpToAnchor?: (anchorId: string) => void;
  onScrollToAnchor?: (scrollFunction: (anchorId: string, options?: any) => boolean) => void;
  onAnchorsReady?: (anchors: string[]) => void;
  onCurrentParagraphChange?: (paragraphId: string | null) => void;
  onChapterNavigation?: (direction: 'prev' | 'next') => void;
  hasPreviousChapter?: boolean;
  hasNextChapter?: boolean;
  layoutMode?: LayoutMode;
  className?: string;
  isLoading?: boolean;
}

// Hook Return Types
export interface UseReadingUiPrefsReturn {
  prefs: ReadingUiPrefs;
  setPrefs: (prefs: Partial<ReadingUiPrefs>) => void;
  resetPrefs: () => void;
}

export interface UsePlan3DataReturn {
  plan: Plan3 | null;
  story: Story3 | null;
  dayData: DayData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
