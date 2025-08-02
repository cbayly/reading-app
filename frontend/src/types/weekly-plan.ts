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
  cachedPrompt?: any;
  cachedOutput?: any;
  createdAt: string;
  chapters: Chapter[];
  dailyActivities: DailyActivity[];
  student?: {
    name: string;
  };
}

export interface WeeklyPlanViewProps {
  plan: WeeklyPlan;
  onActivityResponse?: (activityId: number, response: any) => void;
}

export interface GeneratePlanRequest {
  studentId: number;
}

export interface GenerateActivityRequest {
  planId: number;
  dayOfWeek: number;
  activityType: string;
}

export interface SaveActivityResponseRequest {
  response: any;
} 