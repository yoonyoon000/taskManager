import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Subject, SubjectEditValues, TaskStatusFilter, type TaskClarification, type TaskFormValues, type TaskScopeFilter } from '../types/task';
import { getDaysLeft, getTodayString, parseDateString } from '../utils/date';
import { calculateTaskProgress, getTaskStatus, sortTasks } from '../utils/tasks';
import { useTasks } from '../contexts/TaskContext';
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
  const { tasks, subjects, loading, errorMessage, createTask, toggleTaskItem, updateTaskItemValue, addTaskItem, removeTaskItem, deleteTask, updateTask, refineTask, updateSubject } =
    useTasks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectEditValues, setSubjectEditValues] = useState<SubjectEditValues>({
    name: '',
    category: '전공',
    description: '',
  });
  const scope = getScopeFilter(searchParams.get('scope'));

  const scopedTasks = useMemo(
    () =>
      sortTasks(
        tasks.filter((task) => {
          if (scope === 'general') {
            return task.subjectCategory === '교양';
          }

          if (scope === 'major') {
            return task.subjectCategory === '전공';
          }

          return true;
        }),
      ),
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

    const createdTask = await createTask(values);
    setExpandedTaskIds((prev) => [createdTask.id, ...prev.filter((id) => id !== createdTask.id)]);

    const nextScope = createdTask.subjectCategory === '교양' ? 'general' : 'major';
    if (scope !== 'all' && scope !== nextScope) {
      setSearchParams({ scope: 'all' });
    }
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  };

  const handleOpenSubjectEdit = (subjectId: string) => {
    const subject = subjects.find((item) => item.id === subjectId) ?? null;
    setEditingSubjectId(subjectId);
    syncSubjectEditValues(subject);
  };

  const handleSaveSubject = async () => {
    if (!editingSubject) {
      return;
    }

    await updateSubject(editingSubject.id, {
      name: subjectEditValues.name,
      category: subjectEditValues.category,
      description: subjectEditValues.description,
    });
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

      {errorMessage ? <p className="inline-error">{errorMessage}</p> : null}

      {loading ? (
        <div className="empty-board">
          <span className="material-symbols-outlined" aria-hidden>
            sync
          </span>
          <p>과제를 불러오는 중입니다.</p>
        </div>
      ) : (
        <div className="task-card-list">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedTaskIds.includes(task.id)}
              onToggleExpand={handleToggleExpand}
              onToggleItem={(taskId, itemId) => {
                void toggleTaskItem(taskId, itemId);
              }}
              onUpdateItem={(taskId, itemId, patch) => {
                void updateTaskItemValue(taskId, itemId, patch);
              }}
              onAddItem={(taskId, stageId) => {
                void addTaskItem(taskId, stageId);
              }}
              onRemoveItem={(taskId, itemId) => {
                void removeTaskItem(taskId, itemId);
              }}
              onDeleteTask={(taskId) => {
                void deleteTask(taskId);
              }}
              onOpenSubjectEdit={handleOpenSubjectEdit}
              onUpdateTask={(taskId, patch) => {
                void updateTask(taskId, patch);
              }}
              onRefineTask={(taskId, clarifications: TaskClarification[]) => refineTask(taskId, clarifications)}
            />
          ))}
        </div>
      )}

      {!loading && filteredTasks.length === 0 ? (
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
        onSave={() => {
          void handleSaveSubject();
        }}
      />
    </div>
  );
}

export default Dashboard;
