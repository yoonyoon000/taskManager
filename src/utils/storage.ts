import { Subject, SubjectCategory, TaskPlan } from '../types/task';

const SUBJECTS_KEY = 'assignment-dashboard/subjects';
const TASKS_KEY = 'assignment-dashboard/tasks';

function normalizeCategory(value: string | undefined): SubjectCategory {
  return value === '교양' ? '교양' : '전공';
}

function readStorage<T>(key: string) {
  if (typeof window === 'undefined') {
    return [] as T[];
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [] as T[];
  }
}

function writeStorage<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getSubjects() {
  return readStorage<Subject & { category?: string }>(SUBJECTS_KEY).map((subject) => ({
    ...subject,
    category: normalizeCategory(subject.category),
    description: subject.description ?? '',
    createdAt: subject.createdAt ?? new Date().toISOString(),
    updatedAt: subject.updatedAt ?? new Date().toISOString(),
  }));
}

export function getSubjectById(subjectId: string) {
  return getSubjects().find((subject) => subject.id === subjectId);
}

export function findSubjectByName(name: string) {
  const normalized = name.trim().toLowerCase();
  return getSubjects().find((subject) => subject.name.trim().toLowerCase() === normalized);
}

export function saveSubject(subject: Subject) {
  const subjects = getSubjects();
  const existingIndex = subjects.findIndex((item) => item.id === subject.id);

  if (existingIndex >= 0) {
    subjects[existingIndex] = subject;
  } else {
    subjects.unshift(subject);
  }

  writeStorage(SUBJECTS_KEY, subjects);

  const tasks = getTasks().map((task) =>
    task.subjectId === subject.id
      ? {
          ...task,
          subjectName: subject.name,
          subjectCategory: subject.category,
          updatedAt: new Date().toISOString(),
        }
      : task,
  );
  writeStorage(TASKS_KEY, tasks);
}

export function deleteSubject(subjectId: string) {
  const subjects = getSubjects().filter((subject) => subject.id !== subjectId);
  const tasks = getTasks().filter((task) => task.subjectId !== subjectId);
  writeStorage(SUBJECTS_KEY, subjects);
  writeStorage(TASKS_KEY, tasks);
}

export function getTasks() {
  return readStorage<TaskPlan & { subjectCategory?: string }>(TASKS_KEY).map((task) => ({
    ...task,
    subjectCategory: normalizeCategory(task.subjectCategory),
    subjectDescription: task.subjectDescription ?? '',
  }));
}

export function getTaskById(taskId: string) {
  return getTasks().find((task) => task.id === taskId);
}

export function saveTask(task: TaskPlan) {
  const tasks = getTasks();
  const existingIndex = tasks.findIndex((item) => item.id === task.id);
  const normalizedTask = {
    ...task,
    subjectDescription: task.subjectDescription ?? '',
  };

  if (existingIndex >= 0) {
    tasks[existingIndex] = normalizedTask;
  } else {
    tasks.unshift(normalizedTask);
  }

  writeStorage(TASKS_KEY, tasks);
}

export function deleteTask(taskId: string) {
  const tasks = getTasks().filter((task) => task.id !== taskId);
  writeStorage(TASKS_KEY, tasks);
}
