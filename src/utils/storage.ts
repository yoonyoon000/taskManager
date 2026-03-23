import { Subject, TaskPlan } from '../types/task';

const SUBJECTS_KEY = 'assignment-dashboard/subjects';
const TASKS_KEY = 'assignment-dashboard/tasks';

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
  return readStorage<Subject>(SUBJECTS_KEY);
}

export function getSubjectById(subjectId: string) {
  return getSubjects().find((subject) => subject.id === subjectId);
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
}

export function deleteSubject(subjectId: string) {
  const subjects = getSubjects().filter((subject) => subject.id !== subjectId);
  const tasks = getTasks().filter((task) => task.subjectId !== subjectId);
  writeStorage(SUBJECTS_KEY, subjects);
  writeStorage(TASKS_KEY, tasks);
}

export function getTasks() {
  return readStorage<TaskPlan>(TASKS_KEY);
}

export function getTaskById(taskId: string) {
  return getTasks().find((task) => task.id === taskId);
}

export function saveTask(task: TaskPlan) {
  const tasks = getTasks();
  const existingIndex = tasks.findIndex((item) => item.id === task.id);

  if (existingIndex >= 0) {
    tasks[existingIndex] = task;
  } else {
    tasks.unshift(task);
  }

  writeStorage(TASKS_KEY, tasks);
}

export function deleteTask(taskId: string) {
  const tasks = getTasks().filter((task) => task.id !== taskId);
  writeStorage(TASKS_KEY, tasks);
}
