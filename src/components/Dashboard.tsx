import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Subject,
  SubjectEditValues,
  TaskClarification,
  TaskFormValues,
  TaskScopeFilter,
  TaskStatusFilter,
} from '../types/task';
import { getDaysLeft, getTodayString, parseDateString } from '../utils/date';
import { deleteTask, findSubjectByName, getSubjects, getTasks, saveSubject, saveTask } from '../utils/storage';
import {
  addChecklistItem,
  buildTaskPlan,
  calculateTaskProgress,
  createSubjectRecord,
  refreshTaskChecklist,
  getTaskStatus,
  matchesTaskScope,
  removeChecklistItem,
  sortTasks,
  updateTaskItem,
  updateTaskMeta,
} from '../utils/tasks';
import { requestTaskChecklist } from '../services/taskAnalysis';
import QuickAddTask from './QuickAddTask';
import SubjectEditPanel from './SubjectEditPanel';
import TaskCard from './TaskCard';

function getScopeFilter(value: string | null): TaskScopeFilter {
  if (value === 'general') {
    return 'general';
  }

  if (value === 'major') {
    return 'major';
  }

  return 'all';
}

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subjects, setSubjects] = useState(() => getSubjects());
  const [tasks, setTasks] = useState(() => getTasks());
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const scope = getScopeFilter(searchParams.get('scope'));

  const refreshBoard = () => {
    setSubjects(getSubjects());
    setTasks(getTasks());
  };

  const scopedTasks = useMemo(
    () => sortTasks(tasks.filter((task) => matchesTaskScope(task, scope, 'all'))),
    [scope, tasks],
  );

  const filteredTasks = useMemo(
    () =>
      scopedTasks.filter((task) => (statusFilter === 'all' ? true : getTaskStatus(task) === statusFilter)),
    [scopedTasks, statusFilter],
  );

  const todayPendingItems = useMemo(
    () =>
      scopedTasks.flatMap((task) =>
        task.stages.flatMap((stage) =>
          stage.items
            .filter((item) => item.dueDate === getTodayString() && !item.completed)
            .map((item) => ({
              ...item,
              taskId: task.id,
              taskTitle: task.title,
              subjectName: task.subjectName,
            })),
        ),
      ),
    [scopedTasks],
  );

  const urgentCount = useMemo(
    () =>
      scopedTasks.filter(
        (task) => calculateTaskProgress(task) < 100 && getDaysLeft(task.dueDate) <= 3,
      ).length,
    [scopedTasks],
  );

  const editingSubject = editingSubjectId ? subjects.find((subject) => subject.id === editingSubjectId) ?? null : null;
  const [subjectEditValues, setSubjectEditValues] = useState<SubjectEditValues>({
    name: '',
    category: '전공',
    description: '',
  });

  const syncSubjectEditValues = (subject: Subject | null) => {
    if (!subject) {
      setSubjectEditValues({ name: '', category: '전공', description: '' });
      return;
    }

    setSubjectEditValues({
      name: subject.name,
      category: subject.category,
      description: subject.description,
    });
  };

  const handleCreateTask = async (values: TaskFormValues) => {
    if (parseDateString(values.dueDate) < parseDateString(getTodayString())) {
      throw new Error('마감일은 오늘 이후로 선택해주세요.');
    }

    const selectedSubject = values.subjectId
      ? subjects.find((subject) => subject.id === values.subjectId)
      : undefined;
    const existingSubject = selectedSubject ?? findSubjectByName(values.subjectName);
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

    saveSubject(subject);

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

    saveTask(task);
    refreshBoard();
    setExpandedTaskIds((prev) => [task.id, ...prev.filter((id) => id !== task.id)]);

    const nextScope = subject.category === '교양' ? 'general' : 'major';
    if (scope !== 'all' && scope !== nextScope) {
      setSearchParams({ scope: 'all' });
    }
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  };

  const handleToggleItem = (taskId: string, itemId: string) => {
    const task = tasks.find((current) => current.id === taskId);

    if (!task) {
      return;
    }

    saveTask(
      updateTaskItem(task, itemId, (item) => ({
        ...item,
        completed: !item.completed,
      })),
    );
    refreshBoard();
  };

  const handleUpdateItem = (taskId: string, itemId: string, patch: { title?: string; dueDate?: string }) => {
    const task = tasks.find((current) => current.id === taskId);

    if (!task) {
      return;
    }

    saveTask(
      updateTaskItem(task, itemId, (item) => ({
        ...item,
        ...patch,
      })),
    );
    refreshBoard();
  };

  const handleAddItem = (taskId: string, stageId: string) => {
    const task = tasks.find((current) => current.id === taskId);

    if (!task) {
      return;
    }

    saveTask(addChecklistItem(task, stageId, task.dueDate));
    refreshBoard();
  };

  const handleRemoveItem = (taskId: string, itemId: string) => {
    const task = tasks.find((current) => current.id === taskId);

    if (!task) {
      return;
    }

    saveTask(removeChecklistItem(task, itemId));
    refreshBoard();
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
    refreshBoard();
  };

  const handleUpdateTask = (taskId: string, patch: { title?: string; description?: string; dueDate?: string }) => {
    const task = tasks.find((current) => current.id === taskId);

    if (!task) {
      return;
    }

    saveTask(updateTaskMeta(task, patch));
    refreshBoard();
  };

  const handleRefineTask = async (taskId: string, clarifications: TaskClarification[]) => {
    const task = tasks.find((current) => current.id === taskId);

    if (!task) {
      throw new Error('과제를 찾을 수 없습니다.');
    }

    const subject =
      subjects.find((current) => current.id === task.subjectId) ?? {
        id: task.subjectId,
        name: task.subjectName,
        category: task.subjectCategory,
        description: '',
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

    saveTask(
      refreshTaskChecklist(task, {
        stageDrafts: analysis.data.stages,
        analysis: analysis.data.analysis,
        questions: analysis.data.questions,
        clarifications: mergedClarifications,
        analysisSource: analysis.source,
        analysisError: analysis.errorMessage,
      }),
    );
    refreshBoard();
  };

  const handleOpenSubjectEdit = (subjectId: string) => {
    const subject = subjects.find((item) => item.id === subjectId) ?? null;
    setEditingSubjectId(subjectId);
    syncSubjectEditValues(subject);
  };

  const handleSaveSubject = () => {
    if (!editingSubject) {
      return;
    }

    saveSubject({
      ...editingSubject,
      name: subjectEditValues.name.trim(),
      category: subjectEditValues.category,
      description: subjectEditValues.description.trim(),
      updatedAt: new Date().toISOString(),
    });
    refreshBoard();
    setEditingSubjectId(null);
  };

  return (
    <div className="dashboard-board">
      <div className="board-topline">
        <div className="board-title">
          <strong>
            {scope === 'all' ? '전체 과제' : scope === 'general' ? '교양 과목' : '전공 과목'}
          </strong>
          <span>{filteredTasks.length}개</span>
        </div>
        <div className="board-stats">
          <div>
            <strong>{todayPendingItems.length}</strong>
            <span>오늘 할 일</span>
          </div>
          <div>
            <strong>{urgentCount}</strong>
            <span>마감 임박</span>
          </div>
        </div>
      </div>

        <QuickAddTask subjects={subjects} onCreateTask={handleCreateTask} />

      <div className="status-filter-row">
        {[
          ['all', '전체'],
          ['active', '진행 중'],
          ['urgent', '마감 임박'],
          ['completed', '완료'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={statusFilter === value ? 'status-filter is-active' : 'status-filter'}
            onClick={() => setStatusFilter(value as TaskStatusFilter)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="task-card-list">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            expanded={expandedTaskIds.includes(task.id)}
            onToggleExpand={handleToggleExpand}
            onToggleItem={handleToggleItem}
            onUpdateItem={handleUpdateItem}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onDeleteTask={handleDeleteTask}
            onOpenSubjectEdit={handleOpenSubjectEdit}
            onUpdateTask={handleUpdateTask}
            onRefineTask={handleRefineTask}
          />
        ))}
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-board">
          <span className="material-symbols-outlined" aria-hidden>
            dashboard
          </span>
          <p>보여줄 과제가 없습니다.</p>
        </div>
      ) : null}

      <SubjectEditPanel
        subject={editingSubject}
        open={Boolean(editingSubject)}
        values={subjectEditValues}
        taskCount={tasks.filter((task) => task.subjectId === editingSubjectId).length}
        onChange={(patch) => setSubjectEditValues((prev) => ({ ...prev, ...patch }))}
        onClose={() => {
          setEditingSubjectId(null);
          syncSubjectEditValues(null);
        }}
        onSave={handleSaveSubject}
      />
    </div>
  );
}

export default Dashboard;
