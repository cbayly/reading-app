// New 5-Day Plan Types

export interface Story {
  id: number;
  planId: number;
  title: string;
  themes: string[];
  part1: string;  // Chapter 1 (350–500 words)
  part2: string;  // Chapter 2 (350–500 words)
  part3: string;  // Chapter 3 (350–500 words)
  vocabulary: VocabularyWord[];
  createdAt: string;
}

export interface VocabularyWord {
  word: string;
  definition: string;
}

export interface Activity {
  id: number;
  dayId: number;
  type: 'matching' | 'reflection' | 'writing' | 'multi-select' | 'upload' | 'sequence';
  prompt: string;
  data: ActivityData;
  response?: any;
  isValid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityData {
  // For matching activities (Day 1 & 2)
  pairs?: MatchingPair[];
  instructions?: string;
  
  // For reflection activities (Day 3)
  choice?: 'oneGoodTwoBad' | 'twoGoodOneBad' | null;
  options?: {
    oneGoodTwoBad: {
      label: string;
      fields: { label: string; required: boolean }[];
    };
    twoGoodOneBad: {
      label: string;
      fields: { label: string; required: boolean }[];
    };
  };
  
  // For writing activities (Day 4)
  conditionalPrompt?: {
    oneGoodTwoBad: string;
    twoGoodOneBad: string;
  };
  requiresDay3Choice?: boolean;
  
  // For upload activities (Day 4 optional)
  acceptedTypes?: string[];
  maxSize?: number;
  isOptional?: boolean;
  
  // For multi-select activities (Day 5)
  activities?: MultiSelectActivity[];
  minRequired?: number;
}

export interface MatchingPair {
  word?: string;
  definition?: string;
  prompt?: string;
  answer?: string;
}

export interface MultiSelectActivity {
  id: string;
  type: 'sequence' | 'writing' | 'upload';
  label: string;
  description: string;
  required: boolean;
}

export interface Day {
  id: number;
  planId: number;
  dayIndex: number; // 1-5
  state: 'locked' | 'available' | 'complete';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  activities: Activity[];
}

export interface Plan {
  id: number;
  studentId: number;
  name: string;
  theme: string;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  story?: Story;
  days: Day[];
  student?: {
    id: number;
    name: string;
    gradeLevel: number;
  };
}

// Legacy types for backward compatibility (can be removed after migration)
export interface Chapter {
  id: number;
  chapterNumber: number;
  title: string;
  content: string;
  summary: string;
  createdAt: string;
}

export interface DailyActivity {
  id: number;
  planId: number;
  dayOfWeek: number;
  activityType: string;
  content: any;
  studentResponse?: any;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlan {
  id: number;
  studentId: number;
  interestTheme: string;
  genreCombination?: string;
  cachedPrompt?: any;
  cachedOutput?: any;
  createdAt: string;
  chapters: Chapter[];
  dailyActivities: DailyActivity[];
  student?: {
    name: string;
  };
}

// Component Props
export interface PlanViewProps {
  plan: Plan;
  onActivityResponse?: (activityId: number, response: any) => void;
  onDayComplete?: (dayIndex: number) => Promise<void>;
  onPlanComplete?: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export interface DayViewProps {
  day: Day;
  story: Story;
  onActivityResponse?: (activityId: number, response: any) => void;
  onDayComplete?: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export interface ActivityViewProps {
  activity: Activity;
  onResponse?: (response: any) => void;
  isReadOnly?: boolean;
  error?: string;
}

// API Request/Response Types
export interface CreatePlanRequest {
  studentId: number;
  name: string;
  theme: string;
  genreCombination?: string;
}

export interface UpdateDayActivitiesRequest {
  activities: {
    id: number;
    response: any;
  }[];
}

export interface CompletePlanRequest {
  // No additional data needed
}

export interface PlanResponse {
  message: string;
  plan: Plan;
  completionStats?: {
    totalDays: number;
    completedDays: number;
    totalActivities: number;
    completedActivities: number;
    completionRate: number;
    completedAt: string;
  };
  newPlan?: {
    id: number;
    name: string;
    theme: string;
    storyTitle: string;
  };
  error?: string;
  errorDetails?: string;
  nextSteps?: string;
}

export interface DayResponse {
  message: string;
  activities: Activity[];
  validationResults: {
    activityId: number;
    type: string;
    isValid: boolean;
  }[];
  dayComplete: boolean;
  plan: Plan;
}

// Activity Response Types
export interface MatchingActivityResponse {
  matches: {
    word: string;
    definition: string;
    isCorrect: boolean;
  }[];
}

export interface ReflectionActivityResponse {
  choice: 'oneGoodTwoBad' | 'twoGoodOneBad';
  responses: string[];
}

export interface WritingActivityResponse {
  writing: string;
}

export interface MultiSelectActivityResponse {
  selectedActivities: {
    id: string;
    type: string;
    response: any;
  }[];
}

export interface UploadActivityResponse {
  url?: string;
  filename?: string;
} 