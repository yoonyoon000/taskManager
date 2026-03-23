import { Subject, TaskChecklistStageDraft, TaskFormValues, TaskPlan, TaskStatusFilter } from '../types/task';
import { formatDaysLeftLabel, getDaysLeft } from './date';
import { buildScheduledStages } from './schedule';

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

export function matchesTaskFilter(task: TaskPlan, subjectId: string, status: TaskStatusFilter) {
  if (subjectId !== 'all' && task.subjectId !== subjectId) {
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
  stageDrafts: TaskChecklistStageDraft[];
  analysisSource: TaskPlan['analysisSource'];
  analysisError?: string;
}): TaskPlan {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    subjectId: params.subject.id,
    subjectName: params.subject.name,
    title: params.formValues.title.trim(),
    description: params.formValues.description.trim(),
    dueDate: params.formValues.dueDate,
    isTeamProject: params.formValues.isTeamProject,
    createdAt: now,
    updatedAt: now,
    stages: buildScheduledStages(params.formValues.dueDate, params.stageDrafts),
    analysisSource: params.analysisSource,
    analysisError: params.analysisError,
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
