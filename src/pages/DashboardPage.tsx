import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CalendarView, { type CalendarEntry } from '../components/CalendarView';
import TaskCard from '../components/TaskCard';
import { TaskStatusFilter } from '../types/task';
import { formatShortDate, getDaysLeft, getTodayString } from '../utils/date';
import { getSubjects, getTasks, saveTask } from '../utils/storage';
import { calculateTaskProgress, flattenTaskItems, matchesTaskFilter, updateTaskItem } from '../utils/tasks';

function DashboardPage() {
  const location = useLocation();
  const [subjects, setSubjects] = useState(() => getSubjects());
  const [tasks, setTasks] = useState(() => getTasks());
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedSubjectId, setSelectedSubjectId] = useState('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [month, setMonth] = useState(() => new Date());

  useEffect(() => {
    setSubjects(getSubjects());
    setTasks(getTasks());
  }, [location.key]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => matchesTaskFilter(task, selectedSubjectId, statusFilter)),
    [selectedSubjectId, statusFilter, tasks],
  );

  const todayKey = getTodayString();

  const todayItems = useMemo(
    () =>
      filteredTasks.flatMap((task) =>
        flattenTaskItems(task).filter((item) => item.dueDate === todayKey),
      ),
    [filteredTasks, todayKey],
  );

  const selectedDateItems = useMemo(
    () =>
      filteredTasks.flatMap((task) =>
        flattenTaskItems(task).filter((item) => item.dueDate === selectedDate),
      ),
    [filteredTasks, selectedDate],
  );

  const calendarEntries = useMemo(() => {
    return filteredTasks.reduce<Record<string, CalendarEntry[]>>((acc, task) => {
      acc[task.dueDate] = [
        ...(acc[task.dueDate] ?? []),
        {
          id: `${task.id}-deadline`,
          label: `${task.title} 마감`,
          tone: 'deadline',
        },
      ];

      flattenTaskItems(task).forEach((item) => {
        acc[item.dueDate] = [
          ...(acc[item.dueDate] ?? []),
          {
            id: `${task.id}-${item.id}`,
            label: item.title,
            tone: item.completed ? 'complete' : 'checklist',
          },
        ];
      });

      return acc;
    }, {});
  }, [filteredTasks]);

  const summary = useMemo(() => {
    const completedCount = filteredTasks.filter((task) => calculateTaskProgress(task) === 100).length;
    const urgentCount = filteredTasks.filter((task) => {
      const progress = calculateTaskProgress(task);
      const daysLeft = getDaysLeft(task.dueDate);
      return progress < 100 && daysLeft <= 3;
    }).length;

    return {
      total: filteredTasks.length,
      completed: completedCount,
      urgent: urgentCount,
      today: todayItems.length,
    };
  }, [filteredTasks, todayItems.length]);

  const handleToggleItem = (taskId: string, itemId: string) => {
    const currentTask = tasks.find((task) => task.id === taskId);

    if (!currentTask) {
      return;
    }

    const nextTask = updateTaskItem(currentTask, itemId, (item) => ({
      ...item,
      completed: !item.completed,
    }));

    saveTask(nextTask);
    setTasks(getTasks());
  };

  const statusOptions: { value: TaskStatusFilter; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'active', label: '진행 중' },
    { value: 'completed', label: '완료' },
    { value: 'urgent', label: '마감 임박' },
  ];

  return (
    <div className="page dashboard-page">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">홈 / 대시보드</p>
          <h1>여러 과제를 한눈에 관리하세요</h1>
          <p>달력, 오늘 할 일, 진행도, 마감 일정을 같은 화면에서 바로 확인할 수 있습니다.</p>
        </div>
        <div className="summary-strip">
          <article className="mini-card">
            <span>전체 과제</span>
            <strong>{summary.total}</strong>
          </article>
          <article className="mini-card">
            <span>오늘 할 일</span>
            <strong>{summary.today}</strong>
          </article>
          <article className="mini-card">
            <span>마감 임박</span>
            <strong>{summary.urgent}</strong>
          </article>
          <article className="mini-card">
            <span>완료</span>
            <strong>{summary.completed}</strong>
          </article>
        </div>
      </section>

      <section className="filter-bar card">
        <div className="filter-group">
          <span className="filter-label">과목별 보기</span>
          <div className="chip-row">
            <button
              type="button"
              className={selectedSubjectId === 'all' ? 'chip is-active' : 'chip'}
              onClick={() => setSelectedSubjectId('all')}
            >
              전체 과목
            </button>
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                className={selectedSubjectId === subject.id ? 'chip is-active' : 'chip'}
                onClick={() => setSelectedSubjectId(subject.id)}
              >
                {subject.name}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">상태</span>
          <div className="chip-row">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={statusFilter === option.value ? 'chip is-active' : 'chip'}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="dashboard-layout">
        <CalendarView
          month={month}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onMonthChange={setMonth}
          entriesByDate={calendarEntries}
        />

        <section className="dashboard-side">
          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">오늘 해야 할 체크리스트</p>
                <h2>오늘 할 일</h2>
              </div>
            </div>
            {todayItems.length === 0 ? (
              <p className="card-description">오늘 일정으로 잡힌 체크리스트가 없습니다.</p>
            ) : (
              <div className="quick-item-list">
                {todayItems.map((item) => (
                  <label key={`${item.taskId}-${item.id}`} className={item.completed ? 'quick-item is-complete' : 'quick-item'}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleItem(item.taskId, item.id)}
                    />
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {item.subjectName} · {item.taskTitle}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">선택한 날짜</p>
                <h2>{formatShortDate(selectedDate)}</h2>
              </div>
            </div>
            {selectedDateItems.length === 0 ? (
              <p className="card-description">선택한 날짜에 예정된 체크리스트가 없습니다.</p>
            ) : (
              <div className="selected-date-list">
                {selectedDateItems.map((item) => (
                  <label key={`${item.taskId}-${item.id}`} className={item.completed ? 'quick-item is-complete' : 'quick-item'}>
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
              </div>
            )}
          </section>
        </section>
      </div>

      <section className="task-list-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">전체 과제 목록</p>
            <h2>진행 중인 과제</h2>
          </div>
          <Link to="/tasks/new" className="button secondary small">
            새 과제 만들기
          </Link>
        </div>
        {filteredTasks.length === 0 ? (
          <section className="card empty-state">
            <p>조건에 맞는 과제가 없습니다.</p>
            <Link to="/subjects" className="button secondary">
              과목 먼저 등록하기
            </Link>
          </section>
        ) : (
          <div className="task-list-grid">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
