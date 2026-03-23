import type { DragEvent } from 'react';
import {
  WEEKDAY_LABELS,
  formatShortDate,
  getMonthDaysGrid,
  isSameMonth,
  isToday,
  shiftMonth,
  toDateKey,
} from '../utils/date';

export interface CalendarEntry {
  id: string;
  label: string;
  tone?: 'deadline' | 'checklist' | 'complete';
  draggableId?: string;
}

interface CalendarViewProps {
  month: Date;
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onMonthChange: (date: Date) => void;
  entriesByDate: Record<string, CalendarEntry[]>;
  onDropEntry?: (entryId: string, dateKey: string) => void;
}

function CalendarView({
  month,
  selectedDate,
  onSelectDate,
  onMonthChange,
  entriesByDate,
  onDropEntry,
}: CalendarViewProps) {
  const days = getMonthDaysGrid(month);
  const monthLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
  }).format(month);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, entryId: string) => {
    event.dataTransfer.setData('text/plain', entryId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>, dateKey: string) => {
    if (!onDropEntry) {
      return;
    }

    event.preventDefault();
    const entryId = event.dataTransfer.getData('text/plain');

    if (entryId) {
      onDropEntry(entryId, dateKey);
    }
  };

  return (
    <section className="card calendar-card">
      <div className="calendar-header">
        <div>
          <p className="eyebrow">달력 보기</p>
          <h2>{monthLabel}</h2>
        </div>
        <div className="calendar-nav">
          <button type="button" className="button ghost small" onClick={() => onMonthChange(shiftMonth(month, -1))}>
            이전
          </button>
          <button type="button" className="button ghost small" onClick={() => onMonthChange(new Date())}>
            오늘
          </button>
          <button type="button" className="button ghost small" onClick={() => onMonthChange(shiftMonth(month, 1))}>
            다음
          </button>
        </div>
      </div>

      <div className="calendar-grid calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="calendar-weekday">
            {label}
          </span>
        ))}
      </div>

      <div className="calendar-grid calendar-days">
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const entries = entriesByDate[dateKey] ?? [];
          const isCurrentMonth = isSameMonth(day, month);
          const isSelected = selectedDate === dateKey;

          return (
            <button
              key={dateKey}
              type="button"
              className={[
                'calendar-day',
                isCurrentMonth ? '' : 'is-muted',
                isSelected ? 'is-selected' : '',
                isToday(dateKey) ? 'is-today' : '',
              ]
                .join(' ')
                .trim()}
              onClick={() => onSelectDate(dateKey)}
              onDragOver={onDropEntry ? (event) => event.preventDefault() : undefined}
              onDrop={onDropEntry ? (event) => handleDrop(event, dateKey) : undefined}
            >
              <div className="calendar-day-top">
                <span>{day.getDate()}</span>
                <span className="calendar-day-label">{formatShortDate(dateKey)}</span>
              </div>
              <div className="calendar-entry-list">
                {entries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    className={entry.tone ? `calendar-entry is-${entry.tone}` : 'calendar-entry'}
                    draggable={Boolean(onDropEntry && entry.draggableId)}
                    onDragStart={
                      entry.draggableId && onDropEntry
                        ? (event) => handleDragStart(event, entry.draggableId as string)
                        : undefined
                    }
                  >
                    {entry.label}
                  </div>
                ))}
                {entries.length > 3 ? <span className="calendar-more">+{entries.length - 3}개 더</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default CalendarView;
