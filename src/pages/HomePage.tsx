import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DailyRecord } from '../types/record';
import { loadRecords, saveRecords } from '../utils/records';

function getDateKey(createdAt: number) {
  const date = new Date(createdAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateLabel(createdAt: number) {
  const date = new Date(createdAt);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatTimeLabel(createdAt: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(createdAt));
}

function groupRecords(records: DailyRecord[]) {
  return records.reduce<
    Array<{
      dateKey: string;
      dateLabel: string;
      items: DailyRecord[];
    }>
  >((groups, record) => {
    const dateKey = getDateKey(record.createdAt);
    const currentGroup = groups.find((group) => group.dateKey === dateKey);

    if (currentGroup) {
      currentGroup.items.push(record);
      return groups;
    }

    groups.push({
      dateKey,
      dateLabel: formatDateLabel(record.createdAt),
      items: [record],
    });

    return groups;
  }, []);
}

function HomePage() {
  const [records, setRecords] = useState<DailyRecord[]>(() => loadRecords());
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  const groupedRecords = useMemo(() => groupRecords(records), [records]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = inputValue.trim();

    if (!text) {
      return;
    }

    const nextRecord: DailyRecord = {
      id: crypto.randomUUID(),
      text,
      createdAt: Date.now(),
    };

    setRecords((prev) => [nextRecord, ...prev]);
    setInputValue('');
  };

  const handleDelete = (recordId: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== recordId));
  };

  return (
    <main className="home-page">
      <section className="home-panel">
        <header className="home-head">
          <p className="home-label">오늘 한 것</p>
          <h1>생각 없이 열어서 바로 기록하세요</h1>
        </header>

        <form className="record-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="오늘 한 것을 한 줄로 적어주세요"
            className="record-input"
          />
          <button type="submit" className="record-submit" aria-label="기록 추가">
            +
          </button>
        </form>

        <section className="record-list">
          {groupedRecords.length > 0 ? (
            groupedRecords.map((group) => (
              <div key={group.dateKey} className="record-group">
                <h2>{group.dateLabel}</h2>
                <ul>
                  {group.items.map((record) => (
                    <li key={record.id} className="record-item">
                      <div className="record-text-wrap">
                        <span className="record-text">{record.text}</span>
                        <time className="record-time">{formatTimeLabel(record.createdAt)}</time>
                      </div>
                      <button
                        type="button"
                        className="record-delete"
                        onClick={() => handleDelete(record.id)}
                        aria-label="기록 삭제"
                      >
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="record-empty">아직 기록이 없습니다.</p>
          )}
        </section>
      </section>
    </main>
  );
}

export default HomePage;
