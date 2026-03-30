import { FormEvent, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { addRecord, deleteRecord, subscribeRecords } from '../services/records';
import { login, logout } from '../services/auth';
import { DailyRecord } from '../types/record';
import { clearLastUserId, loadLastUserId, saveLastUserId } from '../utils/records';

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
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [userIdInput, setUserIdInput] = useState(() => loadLastUserId());
  const [inputValue, setInputValue] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const savedUserId = loadLastUserId();
    let restoreAttempted = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);

      if (user?.displayName) {
        setUserIdInput(user.displayName);
        saveLastUserId(user.displayName);
      }

      if (!restoreAttempted) {
        restoreAttempted = true;

        if (!user && savedUserId) {
          try {
            await login(savedUserId);
            return;
          } catch (error) {
            clearLastUserId();
            setErrorMessage(error instanceof Error ? error.message : '아이디로 입장하지 못했습니다.');
          }
        }
      }

      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authUser) {
      setRecords([]);
      setRecordsLoading(false);
      return;
    }

    setRecordsLoading(true);
    const unsubscribe = subscribeRecords(
      authUser.uid,
      (nextRecords) => {
        setRecords(nextRecords);
        setRecordsLoading(false);
        setErrorMessage('');
      },
      (message) => {
        setRecords([]);
        setRecordsLoading(false);
        setErrorMessage(message);
      },
    );

    return unsubscribe;
  }, [authUser]);

  const groupedRecords = useMemo(() => groupRecords(records), [records]);

  const handleEnter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUserId = userIdInput.trim();

    if (!trimmedUserId) {
      setErrorMessage('아이디를 입력해주세요.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login(trimmedUserId);
      saveLastUserId(trimmedUserId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '아이디로 입장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authUser) {
      setErrorMessage('먼저 아이디를 입력하고 시작해주세요.');
      return;
    }

    const text = inputValue.trim();

    if (!text) {
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await addRecord(authUser.uid, text);
      setInputValue('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '기록을 저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!authUser) {
      return;
    }

    setErrorMessage('');

    try {
      await deleteRecord(authUser.uid, recordId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '기록을 삭제하지 못했습니다.');
    }
  };

  const handleLogout = async () => {
    await logout();
    clearLastUserId();
    setRecords([]);
    setInputValue('');
    setUserIdInput('');
  };

  if (authLoading) {
    return (
      <main className="home-page">
        <section className="home-panel">
          <p className="record-empty">기록 공간을 불러오는 중입니다.</p>
        </section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="home-page">
        <section className="home-panel">
          <header className="home-head">
            <p className="home-label">오늘 한 것</p>
            <h1>생각 없이 열어서 바로 기록하세요</h1>
          </header>

          <form className="user-form" onSubmit={handleEnter}>
            <input
              type="text"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="사용자 아이디 입력"
              className="record-input"
            />
            <button type="submit" className="record-submit" disabled={isSubmitting}>
              {isSubmitting ? '...' : '시작'}
            </button>
          </form>

          {errorMessage ? <p className="record-error">{errorMessage}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="home-page">
      <section className="home-panel">
        <header className="home-head">
          <div>
            <p className="home-label">오늘 한 것</p>
            <h1>생각 없이 열어서 바로 기록하세요</h1>
          </div>
          <div className="user-meta">
            <span>현재 사용자: {authUser.displayName || '사용자'}</span>
            <button type="button" className="user-change" onClick={() => void handleLogout()}>
              사용자 변경
            </button>
          </div>
        </header>

        <form className="record-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="오늘 한 것을 한 줄로 적어주세요"
            className="record-input"
          />
          <button type="submit" className="record-submit" aria-label="기록 추가" disabled={isSubmitting}>
            +
          </button>
        </form>

        {errorMessage ? <p className="record-error">{errorMessage}</p> : null}

        <section className="record-list">
          {recordsLoading ? (
            <p className="record-empty">기록을 불러오는 중입니다.</p>
          ) : groupedRecords.length > 0 ? (
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
                        onClick={() => void handleDelete(record.id)}
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
