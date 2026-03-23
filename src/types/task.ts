export type SubjectCategory = '교양' | '전공';

export type AnalysisSource = 'api' | 'mock' | 'fallback';

export interface Subject {
  id: string;
  name: string;
  category: SubjectCategory;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectEditValues {
  name: string;
  category: SubjectCategory;
  description: string;
}

export interface TaskFormValues {
  subjectId?: string;
  subjectName: string;
  subjectCategory: SubjectCategory;
  subjectDescription: string;
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

export interface TaskBriefAnalysis {
  assignmentType: string;
  finalOutput: string;
  needsResearch: boolean;
  needsPresentation: boolean;
  needsIteration: boolean;
  reasoningSummary: string;
}

export interface TaskClarification {
  question: string;
  answer: string;
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
  subjectCategory: SubjectCategory;
  title: string;
  description: string;
  dueDate: string;
  isTeamProject: boolean;
  createdAt: string;
  updatedAt: string;
  stages: TaskChecklistStage[];
  analysis?: TaskBriefAnalysis;
  questions?: string[];
  clarifications?: TaskClarification[];
  analysisSource?: AnalysisSource;
  analysisError?: string;
}

export interface TaskAnalysisResult {
  analysis: TaskBriefAnalysis;
  questions: string[];
  stages: TaskChecklistStageDraft[];
}

export type TaskStatusFilter = 'all' | 'active' | 'completed' | 'urgent';

export type TaskScopeFilter = 'all' | 'general' | 'major';
