export interface Assessment {
  id: number;
  studentId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  passage?: string;
  questions?: any[];
  studentAnswers?: Record<number, string>;
  readingTime?: number;
  errorCount?: number;
  wpm?: number;
  accuracy?: number;
  compositeScore?: number;
  student?: {
    name: string;
  };
}
