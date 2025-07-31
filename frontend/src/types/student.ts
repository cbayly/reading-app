export interface Student {
  id: number;
  parentId: number;
  name: string;
  birthday: string; // Using string for simplicity, can be Date object if needed
  gradeLevel: number;
  interests: string; // This will be a comma-separated string
  createdAt: string;
  updatedAt: string;
} 