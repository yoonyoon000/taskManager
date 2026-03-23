import {
  Subject,
  SubjectCategory,
  TaskBriefAnalysis,
  TaskClarification,
  TaskChecklistStageDraft,
  TaskFormValues,
  TaskPlan,
  TaskScopeFilter,
  TaskStatusFilter,
} from '../types/task';
import { formatDaysLeftLabel, getDaysLeft } from './date';
import { buildScheduledStages } from './schedule';

function normalizeChecklistLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function flattenTaskItems(task: TaskPlan) {
  return task.stages.flatMap((stage) =>
    stage.items.map((item) => ({
      ...item,
      stageId: stage.id,
      stageTitle: stage.title,
      taskId: task.id,
      taskTitle: task.title,
      subjectId: task.subjectId,
      subjectName: task.subjectName,
      subjectCategory: task.subjectCategory,
    })),
  );
}

export function calculateTaskProgress(task: TaskPlan) {
  const items = flattenTaskItems(task);

  if (items.length === 0) {
    return 0;
  }

  const completed = items.filter((item) => item.completed).length;
  return Math.round((completed / items.length) * 100);
}

export function getTaskStatus(task: TaskPlan): Exclude<TaskStatusFilter, 'all'> {
  const progress = calculateTaskProgress(task);
  const daysLeft = getDaysLeft(task.dueDate);

  if (progress === 100) {
    return 'completed';
  }

  if (daysLeft <= 3) {
    return 'urgent';
  }

  return 'active';
}

export function getTaskStatusLabel(task: TaskPlan) {
  const status = getTaskStatus(task);

  if (status === 'completed') {
    return '완료';
  }

  if (status === 'urgent') {
    return `마감 임박 · ${formatDaysLeftLabel(getDaysLeft(task.dueDate))}`;
  }

  return '진행 중';
}

export function matchesTaskScope(task: TaskPlan, scope: TaskScopeFilter, status: TaskStatusFilter) {
  const categoryMatches =
    scope === 'all' ||
    (scope === 'general' && task.subjectCategory === '교양') ||
    (scope === 'major' && task.subjectCategory === '전공');

  if (!categoryMatches) {
    return false;
  }

  if (status === 'all') {
    return true;
  }

  return getTaskStatus(task) === status;
}

export function buildTaskPlan(params: {
  subject: Subject;
  formValues: TaskFormValues;
  analysis: TaskBriefAnalysis;
  questions: string[];
  clarifications?: TaskClarification[];
  stageDrafts: TaskChecklistStageDraft[];
  analysisSource: TaskPlan['analysisSource'];
  analysisError?: string;
}): TaskPlan {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    subjectId: params.subject.id,
    subjectName: params.subject.name,
    subjectCategory: params.subject.category,
    title: params.formValues.title.trim(),
    description: params.formValues.description.trim(),
    dueDate: params.formValues.dueDate,
    isTeamProject: params.formValues.isTeamProject,
    createdAt: now,
    updatedAt: now,
    stages: buildScheduledStages(params.formValues.dueDate, params.stageDrafts),
    analysis: params.analysis,
    questions: params.questions,
    clarifications: params.clarifications ?? [],
    analysisSource: params.analysisSource,
    analysisError: params.analysisError,
  };
}

export function refreshTaskChecklist(task: TaskPlan, params: {
  stageDrafts: TaskChecklistStageDraft[];
  analysis: TaskBriefAnalysis;
  questions: string[];
  clarifications: TaskClarification[];
  analysisSource: TaskPlan['analysisSource'];
  analysisError?: string;
}) {
  const existingItems = flattenTaskItems(task);
  const existingByTitle = new Map(
    existingItems.map((item) => [normalizeChecklistLabel(item.title), item]),
  );

  const stages = buildScheduledStages(task.dueDate, params.stageDrafts).map((stage) => ({
    ...stage,
    items: stage.items.map((item) => {
      const existing = existingByTitle.get(normalizeChecklistLabel(item.title));

      if (!existing) {
        return item;
      }

      return {
        ...item,
        completed: existing.completed,
        dueDate: existing.dueDate,
      };
    }),
  }));

  return {
    ...task,
    updatedAt: new Date().toISOString(),
    stages,
    analysis: params.analysis,
    questions: params.questions,
    clarifications: params.clarifications,
    analysisSource: params.analysisSource,
    analysisError: params.analysisError,
  };
}

export function sortTasks(tasks: TaskPlan[]) {
  return [...tasks].sort((first, second) => {
    const firstWeight = { urgent: 0, active: 1, completed: 2 }[getTaskStatus(first)];
    const secondWeight = { urgent: 0, active: 1, completed: 2 }[getTaskStatus(second)];

    if (firstWeight !== secondWeight) {
      return firstWeight - secondWeight;
    }

    return new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime();
  });
}

export function createSubjectRecord(values: {
  name: string;
  category: SubjectCategory;
  description: string;
}) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: values.name.trim(),
    category: values.category,
    description: values.description.trim(),
    createdAt: now,
    updatedAt: now,
  } as Subject;
}

export function updateTaskMeta(
  task: TaskPlan,
  patch: Partial<Pick<TaskPlan, 'title' | 'description' | 'dueDate'>>,
) {
  return {
    ...task,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export function updateTaskItem(
  task: TaskPlan,
  itemId: string,
  updater: (current: TaskPlan['stages'][number]['items'][number]) => TaskPlan['stages'][number]['items'][number],
) {
  return {
    ...task,
    updatedAt: new Date().toISOString(),
    stages: task.stages.map((stage) => ({
      ...stage,
      items: stage.items.map((item) => (item.id === itemId ? updater(item) : item)),
    })),
  };
}

export function addChecklistItem(task: TaskPlan, stageId: string, baseDate: string) {
  return {
    ...task,
    updatedAt: new Date().toISOString(),
    stages: task.stages.map((stage) =>
      stage.id === stageId
        ? {
            ...stage,
            items: [
              ...stage.items,
              {
                id: `${stageId}-custom-${crypto.randomUUID()}`,
                title: '새 할 일',
                notes: '',
                dueDate: baseDate,
                completed: false,
              },
            ],
          }
        : stage,
    ),
  };
}

export function removeChecklistItem(task: TaskPlan, itemId: string) {
  return {
    ...task,
    updatedAt: new Date().toISOString(),
    stages: task.stages.map((stage) => ({
      ...stage,
      items: stage.items.filter((item) => item.id !== itemId),
    })),
  };
}
