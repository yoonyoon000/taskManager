import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ChecklistItem,
  SubjectCategory,
  TaskBriefAnalysis,
  TaskChecklistStage,
  TaskClarification,
  TaskPlan,
} from '../types/task';
import { flattenTaskItems } from '../utils/tasks';

interface StoredChecklistItem extends ChecklistItem {
  stageId?: string;
  stageTitle?: string;
}

interface TaskDocument {
  taskTitle: string;
  taskDetail: string;
  subjectId: string;
  subjectName: string;
  subjectCategory: SubjectCategory;
  subjectDescription?: string;
  dueDate: string;
  checklist: StoredChecklistItem[];
  stages: TaskChecklistStage[];
  isTeamProject: boolean;
  analysis?: TaskBriefAnalysis;
  questions?: string[];
  clarifications?: TaskClarification[];
  analysisSource?: TaskPlan['analysisSource'];
  analysisError?: string;
  createdAt: string;
  updatedAt: string;
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, current]) => current !== undefined),
  ) as T;
}

function tasksCollection(uid: string) {
  return collection(db, 'users', uid, 'tasks');
}

function normalizeCategory(value: unknown): SubjectCategory {
  return value === '교양' ? '교양' : '전공';
}

function serializeTask(task: TaskPlan): TaskDocument {
  return compactObject({
    taskTitle: task.title,
    taskDetail: task.description,
    subjectId: task.subjectId,
    subjectName: task.subjectName,
    subjectCategory: task.subjectCategory,
    subjectDescription: task.subjectDescription ?? '',
    dueDate: task.dueDate,
    checklist: flattenTaskItems(task).map((item) => ({
      id: item.id,
      title: item.title,
      notes: item.notes,
      dueDate: item.dueDate,
      completed: item.completed,
      stageId: item.stageId,
      stageTitle: item.stageTitle,
    })),
    stages: task.stages,
    isTeamProject: task.isTeamProject,
    analysis: task.analysis,
    questions: task.questions ?? [],
    clarifications: task.clarifications ?? [],
    analysisSource: task.analysisSource,
    analysisError: task.analysisError,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  });
}

function normalizeStages(
  stages: unknown,
  fallbackChecklist: StoredChecklistItem[] = [],
): TaskChecklistStage[] {
  if (Array.isArray(stages)) {
    const validStages = stages
      .map((stage, stageIndex) => {
        if (!stage || typeof stage !== 'object') {
          return null;
        }

        const value = stage as Record<string, unknown>;
        const items = Array.isArray(value.items) ? value.items : [];

        return {
          id: typeof value.id === 'string' ? value.id : `stage-${stageIndex + 1}`,
          title: typeof value.title === 'string' ? value.title : `단계 ${stageIndex + 1}`,
          description: typeof value.description === 'string' ? value.description : '',
          items: items
            .map((item, itemIndex) => {
              if (!item || typeof item !== 'object') {
                return null;
              }

              const current = item as Record<string, unknown>;
              return {
                id: typeof current.id === 'string' ? current.id : `item-${itemIndex + 1}`,
                title: typeof current.title === 'string' ? current.title : '할 일',
                notes: typeof current.notes === 'string' ? current.notes : '',
                dueDate: typeof current.dueDate === 'string' ? current.dueDate : '',
                completed: Boolean(current.completed),
              };
            })
            .filter(Boolean) as ChecklistItem[],
        };
      })
      .filter(Boolean) as TaskChecklistStage[];

    if (validStages.length > 0) {
      return validStages;
    }
  }

  if (fallbackChecklist.length > 0) {
    return [
      {
        id: 'checklist',
        title: '체크리스트',
        description: '저장된 할 일 목록입니다.',
        items: fallbackChecklist.map((item) => ({
          id: item.id,
          title: item.title,
          notes: item.notes ?? '',
          dueDate: item.dueDate,
          completed: item.completed,
        })),
      },
    ];
  }

  return [];
}

function deserializeTask(id: string, data: Partial<TaskDocument>): TaskPlan {
  const checklist = Array.isArray(data.checklist) ? (data.checklist as StoredChecklistItem[]) : [];

  return {
    id,
    subjectId: data.subjectId ?? `subject-${id}`,
    subjectName: data.subjectName ?? '미분류 과목',
    subjectCategory: normalizeCategory(data.subjectCategory),
    subjectDescription: data.subjectDescription ?? '',
    title: data.taskTitle ?? '제목 없는 과제',
    description: data.taskDetail ?? '',
    dueDate: data.dueDate ?? '',
    isTeamProject: Boolean(data.isTeamProject),
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
    stages: normalizeStages(data.stages, checklist),
    analysis: data.analysis,
    questions: Array.isArray(data.questions) ? data.questions : [],
    clarifications: Array.isArray(data.clarifications) ? data.clarifications : [],
    analysisSource: data.analysisSource,
    analysisError: data.analysisError,
  };
}

export function subscribeTasks(
  uid: string,
  onData: (tasks: TaskPlan[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    tasksCollection(uid),
    (snapshot) => {
      const tasks = snapshot.docs.map((taskDoc) =>
        deserializeTask(taskDoc.id, taskDoc.data() as Partial<TaskDocument>),
      );
      onData(tasks);
    },
    (error) => {
      onError?.(error as Error);
    },
  );
}

export async function addTaskDoc(uid: string, task: TaskPlan) {
  const taskData = serializeTask(task);
  const reference = await addDoc(tasksCollection(uid), taskData);
  return {
    ...task,
    id: reference.id,
  };
}

export async function updateTaskDoc(uid: string, task: TaskPlan) {
  const reference = doc(db, 'users', uid, 'tasks', task.id);
  await setDoc(reference, serializeTask(task));
}

export async function deleteTaskDoc(uid: string, taskId: string) {
  const reference = doc(db, 'users', uid, 'tasks', taskId);
  await deleteDoc(reference);
}

export async function updateSubjectDocs(
  uid: string,
  tasks: TaskPlan[],
  subjectId: string,
  patch: {
    name: string;
    category: SubjectCategory;
    description: string;
  },
) {
  const targetTasks = tasks.filter((task) => task.subjectId === subjectId);

  if (targetTasks.length === 0) {
    return;
  }

  const batch = writeBatch(db);

  targetTasks.forEach((task) => {
    const updatedTask = {
      ...task,
      subjectName: patch.name,
      subjectCategory: patch.category,
      subjectDescription: patch.description,
      updatedAt: new Date().toISOString(),
    };
    const reference = doc(db, 'users', uid, 'tasks', task.id);
    batch.set(reference, serializeTask(updatedTask));
  });

  await batch.commit();
}
