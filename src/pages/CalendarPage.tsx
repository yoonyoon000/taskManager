import { useMemo, useState } from 'react';
import CalendarView, { type CalendarEntry } from '../components/CalendarView';
import { useTasks } from '../contexts/TaskContext';
import { formatShortDate, getTodayString } from '../utils/date';
import { sortTasks } from '../utils/tasks';

function CalendarPage() {
  const { tasks, loading, errorMessage, toggleTaskItem, updateTaskItemValue } = useTasks();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [month, setMonth] = useState(() => new Date());

  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks]);

  const entriesByDate = useMemo(() => {
    return sortedTasks.reduce<Record<string, CalendarEntry[]>>((acc, task) => {
      acc[task.dueDate] = [
        ...(acc[task.dueDate] ?? []),
        {
          id: `${task.id}-deadline`,
          label: `${task.subjectName} · ${task.title} 마감`,
          tone: 'deadline',
        },
      ];

      task.stages.forEach((stage) => {
        stage.items.forEach((item) => {
          acc[item.dueDate] = [
            ...(acc[item.dueDate] ?? []),
            {
              id: `${task.id}-${item.id}`,
              label: `${task.title} · ${item.title}`,
              tone: item.completed ? 'complete' : 'checklist',
              draggableId: `${task.id}::${item.id}`,
            },
          ];
        });
      });

      return acc;
    }, {});
  }, [sortedTasks]);

  const selectedItems = useMemo(
    () =>
      sortedTasks.flatMap((task) =>
        task.stages.flatMap((stage) =>
          stage.items
            .filter((item) => item.dueDate === selectedDate)
            .map((item) => ({
              ...item,
              taskId: task.id,
              taskTitle: task.title,
              subjectName: task.subjectName,
              stageTitle: stage.title,
            })),
        ),
      ),
    [selectedDate, sortedTasks],
  );

  const selectedDeadlines = useMemo(
    () => sortedTasks.filter((task) => task.dueDate === selectedDate),
    [selectedDate, sortedTasks],
  );

  const handleToggleItem = (taskId: string, itemId: string) => {
    void toggleTaskItem(taskId, itemId);
  };

  const handleDropEntry = (entryId: string, dateKey: string) => {
    const [taskId, itemId] = entryId.split('::');

    if (!itemId) {
      return;
    }

    void updateTaskItemValue(taskId, itemId, { dueDate: dateKey });
    setSelectedDate(dateKey);
  };

  return (
    <div className="calendar-page">
      <div className="calendar-page-head">
        <strong>달력 보기</strong>
        <span>{formatShortDate(selectedDate)}</span>
      </div>
      {errorMessage ? <p className="inline-error">{errorMessage}</p> : null}

      <div className="calendar-page-layout">
        <CalendarView
          month={month}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onMonthChange={setMonth}
          entriesByDate={entriesByDate}
          onDropEntry={handleDropEntry}
        />
        <section className="calendar-agenda">
          <div className="calendar-agenda-head">
            <strong>{formatShortDate(selectedDate)}</strong>
            <span>
              {loading ? '불러오는 중...' : `${selectedItems.length + selectedDeadlines.length}개 일정`}
            </span>
          </div>
          <div className="calendar-agenda-list">
            {selectedDeadlines.map((task) => (
              <div key={`${task.id}-deadline`} className="agenda-item is-deadline">
                <span className="material-symbols-outlined" aria-hidden>
                  calendar_month
                </span>
                <div>
                  <strong>{task.title} 마감</strong>
                  <span>
                    {task.subjectName} · 최종 제출일
                  </span>
                </div>
              </div>
            ))}
            {selectedItems.map((item) => (
              <label
                key={`${item.taskId}-${item.id}`}
                className={item.completed ? 'agenda-item is-complete' : 'agenda-item'}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleItem(item.taskId, item.id)}
                />
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.subjectName} · {item.taskTitle} · {item.stageTitle}
                  </span>
                </div>
              </label>
            ))}
            {!loading && selectedItems.length === 0 && selectedDeadlines.length === 0 ? (
              <p className="calendar-empty">선택한 날짜 일정이 없습니다.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

export default CalendarPage;
