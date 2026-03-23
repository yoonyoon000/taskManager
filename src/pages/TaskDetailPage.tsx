import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CalendarView, { type CalendarEntry } from '../components/CalendarView';
import ChecklistPanel from '../components/ChecklistPanel';
import ProgressBar from '../components/ProgressBar';
import {
  formatDate,
  formatDaysLeftLabel,
  formatShortDate,
  getDaysLeft,
  getTodayString,
  parseDateString,
} from '../utils/date';
import { deleteTask, getTaskById, saveTask } from '../utils/storage';
import { addChecklistItem, calculateTaskProgress, flattenTaskItems, removeChecklistItem, updateTaskItem } from '../utils/tasks';

function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(() => (taskId ? getTaskById(taskId) ?? null : null));
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [month, setMonth] = useState(() => (taskId ? parseDateString(getTaskById(taskId)?.dueDate ?? getTodayString()) : new Date()));

  const progress = task ? calculateTaskProgress(task) : 0;
  const daysLeft = task ? getDaysLeft(task.dueDate) : 0;
  const allItems = useMemo(() => (task ? flattenTaskItems(task) : []), [task]);
  const selectedItems = useMemo(
    () => allItems.filter((item) => item.dueDate === selectedDate),
    [allItems, selectedDate],
  );
  const calendarEntries = useMemo(() => {
    if (!task) {
      return {} as Record<string, CalendarEntry[]>;
    }

    return allItems.reduce<Record<string, CalendarEntry[]>>(
      (acc, item) => {
        acc[item.dueDate] = [
          ...(acc[item.dueDate] ?? []),
          {
            id: item.id,
            label: item.title,
            tone: item.completed ? 'complete' : 'checklist',
            draggableId: item.id,
          },
        ];
        return acc;
      },
      {
        [task.dueDate]: [
          {
            id: `${task.id}-deadline`,
            label: `${task.title} 마감`,
            tone: 'deadline',
          },
        ],
      },
    );
  }, [allItems, task]);

  if (!task) {
    return (
      <div className="page narrow-page">
        <section className="card empty-state">
          <h1>과제를 찾을 수 없습니다</h1>
          <p>대시보드에서 다시 선택하거나 새 과제를 만들어주세요.</p>
          <Link to="/" className="button primary">
            대시보드로 이동
          </Link>
        </section>
      </div>
    );
  }

  const persistTask = (nextTask: typeof task) => {
    setTask(nextTask);
    saveTask(nextTask);
  };

  const handleToggleItem = (itemId: string) => {
    persistTask(
      updateTaskItem(task, itemId, (item) => ({
        ...item,
        completed: !item.completed,
      })),
    );
  };

  const handleUpdateItem = (
    itemId: string,
    patch: {
      title?: string;
      notes?: string;
      dueDate?: string;
    },
  ) => {
    persistTask(
      updateTaskItem(task, itemId, (item) => ({
        ...item,
        ...patch,
      })),
    );
  };

  const handleAddItem = (stageId: string) => {
    persistTask(addChecklistItem(task, stageId, selectedDate || task.dueDate));
  };

  const handleRemoveItem = (itemId: string) => {
    persistTask(removeChecklistItem(task, itemId));
  };

  const handleMoveItem = (itemId: string, dateKey: string) => {
    persistTask(
      updateTaskItem(task, itemId, (item) => ({
        ...item,
        dueDate: dateKey,
      })),
    );
    setSelectedDate(dateKey);
  };

  const handleTaskFieldChange = (patch: { title?: string; description?: string; dueDate?: string }) => {
    const nextTask = {
      ...task,
      ...patch,
      dueDate: patch.dueDate ? patch.dueDate : task.dueDate,
      updatedAt: new Date().toISOString(),
    };
    persistTask(nextTask);
  };

  const handleDeleteTask = () => {
    deleteTask(task.id);
    navigate('/');
  };

  return (
    <div className="page detail-page">
      <section className="card detail-summary-card">
        <div className="summary-header">
          <div>
            <p className="eyebrow">과제 상세 페이지</p>
            <h1>{task.title}</h1>
          </div>
          <div className="hero-actions">
            <Link to="/" className="button secondary small">
              대시보드
            </Link>
            <button type="button" className="button ghost small" onClick={handleDeleteTask}>
              과제 삭제
            </button>
          </div>
        </div>
        <div className="summary-grid">
          <div>
            <span className="summary-label">과목명</span>
            <strong>{task.subjectName}</strong>
          </div>
          <div>
            <span className="summary-label">마감일</span>
            <strong>{formatDate(task.dueDate)}</strong>
          </div>
          <div>
            <span className="summary-label">남은 기간</span>
            <strong>{formatDaysLeftLabel(daysLeft)}</strong>
          </div>
          <div>
            <span className="summary-label">진행도</span>
            <strong>{progress}%</strong>
          </div>
        </div>
        <ProgressBar value={progress} />
        {task.analysisError ? <p className="error-message">{task.analysisError}</p> : null}
        <div className="form-grid">
          <label className="field field-full">
            <span className="field-label">과제명 수정</span>
            <input
              type="text"
              value={task.title}
              onChange={(event) => handleTaskFieldChange({ title: event.target.value })}
            />
          </label>
          <label className="field field-full">
            <span className="field-label">과제 설명 수정</span>
            <textarea
              rows={4}
              value={task.description}
              onChange={(event) => handleTaskFieldChange({ description: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">마감일 변경</span>
            <input
              type="date"
              value={task.dueDate}
              min={getTodayString()}
              onChange={(event) => {
                const nextDate = event.target.value;
                if (nextDate && parseDateString(nextDate) >= parseDateString(getTodayString())) {
                  handleTaskFieldChange({ dueDate: nextDate });
                }
              }}
            />
          </label>
        </div>
      </section>

      <div className="detail-layout">
        <ChecklistPanel
          task={task}
          onToggleItem={handleToggleItem}
          onUpdateItem={handleUpdateItem}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
        />

        <div className="detail-side">
          <CalendarView
            month={month}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onMonthChange={setMonth}
            entriesByDate={calendarEntries}
            onDropEntry={handleMoveItem}
          />

          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">선택한 날짜 일정</p>
                <h2>{formatShortDate(selectedDate)}</h2>
              </div>
            </div>
            <p className="card-description">달력에서 항목을 다른 날짜로 끌어 옮기면 체크리스트 일정이 바로 바뀝니다.</p>
            {selectedItems.length === 0 ? (
              <p className="card-description">이 날짜에 배정된 체크리스트가 없습니다.</p>
            ) : (
              <div className="selected-date-list">
                {selectedItems.map((item) => (
                  <label key={item.id} className={item.completed ? 'quick-item is-complete' : 'quick-item'}>
                    <input type="checkbox" checked={item.completed} onChange={() => handleToggleItem(item.id)} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.stageTitle}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailPage;
