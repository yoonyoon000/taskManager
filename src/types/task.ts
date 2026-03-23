export type SubjectClassStyle =
  | '발표 중심'
  | '결과물 중심'
  | '리서치 중심'
  | '혼합형';

export type AnalysisSource = 'api' | 'mock' | 'fallback';

export interface Subject {
  id: string;
  name: string;
  description: string;
  focusNote: string;
  classStyle: SubjectClassStyle;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectFormValues {
  name: string;
  description: string;
  focusNote: string;
  classStyle: SubjectClassStyle;
}

export interface TaskFormValues {
  subjectId: string;
  title: string;
  description: string;
  dueDate: string;
  isTeamProject: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  notes: string;
  dueDate: string;
  completed: boolean;
}

export interface TaskChecklistStageDraft {
  id: string;
  title: string;
  description: string;
  checklist: string[];
}

export interface TaskChecklistStage {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

export interface TaskPlan {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  description: string;
  dueDate: string;
  isTeamProject: boolean;
  createdAt: string;
  updatedAt: string;
  stages: TaskChecklistStage[];
  analysisSource?: AnalysisSource;
  analysisError?: string;
}

export interface TaskAnalysisResult {
  stages: TaskChecklistStageDraft[];
}

export type TaskStatusFilter = 'all' | 'active' | 'completed' | 'urgent';
