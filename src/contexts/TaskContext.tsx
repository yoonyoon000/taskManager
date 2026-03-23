import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Subject,
  SubjectEditValues,
  TaskClarification,
  TaskFormValues,
  TaskPlan,
} from '../types/task';
import { useAuth } from './AuthContext';
import { requestTaskChecklist } from '../services/taskAnalysis';
import { addTaskDoc, deleteTaskDoc, subscribeTasks, updateSubjectDocs, updateTaskDoc } from '../services/tasks';
import {
  addChecklistItem,
  buildTaskPlan,
  createSubjectRecord,
  refreshTaskChecklist,
  removeChecklistItem,
  sortTasks,
  updateTaskItem,
  updateTaskMeta,
} from '../utils/tasks';

interface TaskContextValue {
  tasks: TaskPlan[];
  subjects: Subject[];
  loading: boolean;
  errorMessage: string;
  createTask: (values: TaskFormValues) => Promise<TaskPlan>;
  toggleTaskItem: (taskId: string, itemId: string) => Promise<void>;
  updateTaskItemValue: (taskId: string, itemId: string, patch: { title?: string; dueDate?: string }) => Promise<void>;
  addTaskItem: (taskId: string, stageId: string) => Promise<void>;
  removeTaskItem: (taskId: string, itemId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, patch: { title?: string; description?: string; dueDate?: string }) => Promise<void>;
  refineTask: (taskId: string, clarifications: TaskClarification[]) => Promise<void>;
  updateSubject: (subjectId: string, values: SubjectEditValues) => Promise<void>;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

function findSubjectByName(subjects: Subject[], name: string) {
  const normalized = name.trim().toLowerCase();
  return subjects.find((subject) => subject.name.trim().toLowerCase() === normalized);
}

function deriveSubjects(tasks: TaskPlan[]) {
  const subjectMap = new Map<string, Subject>();

  tasks.forEach((task) => {
    const nextSubject: Subject = {
      id: task.subjectId,
      name: task.subjectName,
      category: task.subjectCategory,
      description: task.subjectDescription ?? '',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
    const existing = subjectMap.get(task.subjectId);

    if (!existing || new Date(existing.updatedAt).getTime() < new Date(task.updatedAt).getTime()) {
      subjectMap.set(task.subjectId, nextSubject);
    }
  });

  return [...subjectMap.values()].sort((first, second) => first.name.localeCompare(second.name, 'ko'));
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      setErrorMessage('');
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeTasks(
      user.uid,
      (nextTasks) => {
        setTasks(sortTasks(nextTasks));
        setLoading(false);
        setErrorMessage('');
      },
      () => {
        setLoading(false);
        setErrorMessage('과제 데이터를 불러오지 못했습니다.');
      },
    );

    return unsubscribe;
  }, [user]);

  const subjects = useMemo(() => deriveSubjects(tasks), [tasks]);

  const requireUser = () => {
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    return user.uid;
  };

  const findTask = (taskId: string) => {
    const task = tasks.find((current) => current.id === taskId);

    if (!task) {
      throw new Error('과제를 찾을 수 없습니다.');
    }

    return task;
  };

  const createTask = async (values: TaskFormValues) => {
    const uid = requireUser();
    const selectedSubject = values.subjectId ? subjects.find((subject) => subject.id === values.subjectId) : undefined;
    const existingSubject = selectedSubject ?? findSubjectByName(subjects, values.subjectName);
    const subject =
      existingSubject
        ? {
            ...existingSubject,
            category: values.subjectCategory,
            description: values.subjectDescription.trim() || existingSubject.description,
            updatedAt: new Date().toISOString(),
          }
        : createSubjectRecord({
            name: values.subjectName,
            category: values.subjectCategory,
            description: values.subjectDescription,
          });

    const analysis = await requestTaskChecklist(subject, values);
    const task = buildTaskPlan({
      subject,
      formValues: values,
      analysis: analysis.data.analysis,
      questions: analysis.data.questions,
      stageDrafts: analysis.data.stages,
      analysisSource: analysis.source,
      analysisError: analysis.errorMessage,
    });

    return addTaskDoc(uid, task);
  };

  const persistTask = async (nextTask: TaskPlan) => {
    const uid = requireUser();
    await updateTaskDoc(uid, nextTask);
  };

  const toggleTaskItem = async (taskId: string, itemId: string) => {
    const task = findTask(taskId);
    await persistTask(
      updateTaskItem(task, itemId, (item) => ({
        ...item,
        completed: !item.completed,
      })),
    );
  };

  const updateTaskItemValue = async (
    taskId: string,
    itemId: string,
    patch: { title?: string; dueDate?: string },
  ) => {
    const task = findTask(taskId);
    await persistTask(
      updateTaskItem(task, itemId, (item) => ({
        ...item,
        ...patch,
      })),
    );
  };

  const addTaskItem = async (taskId: string, stageId: string) => {
    const task = findTask(taskId);
    await persistTask(addChecklistItem(task, stageId, task.dueDate));
  };

  const removeTaskItem = async (taskId: string, itemId: string) => {
    const task = findTask(taskId);
    await persistTask(removeChecklistItem(task, itemId));
  };

  const deleteTask = async (taskId: string) => {
    const uid = requireUser();
    await deleteTaskDoc(uid, taskId);
  };

  const updateTask = async (
    taskId: string,
    patch: { title?: string; description?: string; dueDate?: string },
  ) => {
    const task = findTask(taskId);
    await persistTask(updateTaskMeta(task, patch));
  };

  const refineTask = async (taskId: string, clarifications: TaskClarification[]) => {
    const task = findTask(taskId);
    const subject =
      subjects.find((current) => current.id === task.subjectId) ?? {
        id: task.subjectId,
        name: task.subjectName,
        category: task.subjectCategory,
        description: task.subjectDescription ?? '',
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      };

    const mergedClarifications = [
      ...(task.clarifications ?? []).filter(
        (saved) => !clarifications.some((next) => next.question === saved.question),
      ),
      ...clarifications,
    ];

    const analysis = await requestTaskChecklist(
      subject,
      {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCategory: subject.category,
        subjectDescription: subject.description,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        isTeamProject: task.isTeamProject,
      },
      { clarifications: mergedClarifications },
    );

    await persistTask(
      refreshTaskChecklist(task, {
        stageDrafts: analysis.data.stages,
        analysis: analysis.data.analysis,
        questions: analysis.data.questions,
        clarifications: mergedClarifications,
        analysisSource: analysis.source,
        analysisError: analysis.errorMessage,
      }),
    );
  };

  const updateSubject = async (subjectId: string, values: SubjectEditValues) => {
    const uid = requireUser();
    await updateSubjectDocs(uid, tasks, subjectId, {
      name: values.name.trim(),
      category: values.category,
      description: values.description.trim(),
    });
  };

  const value = useMemo(
    () => ({
      tasks,
      subjects,
      loading,
      errorMessage,
      createTask,
      toggleTaskItem,
      updateTaskItemValue,
      addTaskItem,
      removeTaskItem,
      deleteTask,
      updateTask,
      refineTask,
      updateSubject,
    }),
    [errorMessage, loading, subjects, tasks],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);

  if (!context) {
    throw new Error('useTasks는 TaskProvider 내부에서만 사용할 수 있습니다.');
  }

  return context;
}
