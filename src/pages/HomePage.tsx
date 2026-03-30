import { FormEvent, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { addLog, createProject, deleteLog, subscribeLogs, subscribeProjects } from '../lib/projectService';
import { login, logout } from '../services/auth';
import { ProjectItem, ProjectLog } from '../types/project';
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

function groupLogs(logs: ProjectLog[]) {
  return logs.reduce<
    Array<{
      dateKey: string;
      dateLabel: string;
      items: ProjectLog[];
    }>
  >((groups, log) => {
    const dateKey = getDateKey(log.createdAt);
    const existingGroup = groups.find((group) => group.dateKey === dateKey);

    if (existingGroup) {
      existingGroup.items.push(log);
      return groups;
    }

    groups.push({
      dateKey,
      dateLabel: formatDateLabel(log.createdAt),
      items: [log],
    });

    return groups;
  }, []);
}

function HomePage() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userIdInput, setUserIdInput] = useState(() => loadLastUserId());
  const [projectNameInput, setProjectNameInput] = useState('');
  const [logInput, setLogInput] = useState('');
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
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
      setProjects([]);
      setSelectedProjectId('');
      setProjectsLoading(false);
      return;
    }

    setProjectsLoading(true);
    const unsubscribe = subscribeProjects(
      authUser.uid,
      (nextProjects) => {
        setProjects(nextProjects);
        setProjectsLoading(false);
        setErrorMessage('');

        setSelectedProjectId((current) => {
          if (current && nextProjects.some((project) => project.id === current)) {
            return current;
          }

          return nextProjects[0]?.id ?? '';
        });
      },
      (message) => {
        setProjects([]);
        setSelectedProjectId('');
        setProjectsLoading(false);
        setErrorMessage(message);
      },
    );

    return unsubscribe;
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !selectedProjectId) {
      setLogs([]);
      setLogsLoading(false);
      return;
    }

    setLogsLoading(true);
    const unsubscribe = subscribeLogs(
      authUser.uid,
      selectedProjectId,
      (nextLogs) => {
        setLogs(nextLogs);
        setLogsLoading(false);
        setErrorMessage('');
      },
      (message) => {
        setLogs([]);
        setLogsLoading(false);
        setErrorMessage(message);
      },
    );

    return unsubscribe;
  }, [authUser, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const groupedLogs = useMemo(() => groupLogs(logs), [logs]);

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

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authUser) {
      return;
    }

    const trimmedName = projectNameInput.trim();

    if (!trimmedName) {
      setErrorMessage('프로젝트 이름을 입력해주세요.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await createProject(authUser.uid, trimmedName);
      setProjectNameInput('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '프로젝트를 만들지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!authUser || !selectedProject) {
      return;
    }

    const trimmedText = logInput.trim();

    if (!trimmedText) {
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await addLog(authUser.uid, selectedProject.id, trimmedText);
      setLogInput('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '작업 로그를 저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!authUser || !selectedProject) {
      return;
    }

    setErrorMessage('');

    try {
      await deleteLog(authUser.uid, selectedProject.id, logId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '작업 로그를 삭제하지 못했습니다.');
    }
  };

  const handleLogout = async () => {
    await logout();
    clearLastUserId();
    setProjects([]);
    setLogs([]);
    setSelectedProjectId('');
    setProjectNameInput('');
    setLogInput('');
    setUserIdInput('');
  };

  if (authLoading) {
    return (
      <main className="home-page">
        <section className="home-panel">
          <p className="empty-copy">데이터를 불러오는 중입니다.</p>
        </section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="home-page">
        <section className="home-panel login-panel">
          <header className="panel-head">
            <p className="section-label">프로젝트 작업 로그</p>
            <h1>사용자별 작업 기록을 관리하세요</h1>
          </header>

          <form className="inline-form" onSubmit={handleEnter}>
            <input
              type="text"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="사용자 아이디 입력"
              className="text-input"
            />
            <button type="submit" className="primary-button wide-button" disabled={isSubmitting}>
              {isSubmitting ? '...' : '시작하기'}
            </button>
          </form>

          {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="home-page">
      <section className="workspace-shell">
        <aside className="project-sidebar">
          <header className="project-sidebar-head">
            <div>
              <p className="section-label">현재 사용자: {authUser.displayName || '사용자'}</p>
              <h2>내 프로젝트</h2>
            </div>
            <button type="button" className="secondary-button" onClick={() => void handleLogout()}>
              사용자 변경
            </button>
          </header>

          <form className="inline-form project-create-form" onSubmit={handleCreateProject}>
            <input
              type="text"
              value={projectNameInput}
              onChange={(event) => setProjectNameInput(event.target.value)}
              placeholder="새 프로젝트 이름"
              className="text-input"
            />
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              +
            </button>
          </form>

          <div className="project-list">
            {projectsLoading ? (
              <p className="empty-copy">프로젝트를 불러오는 중입니다.</p>
            ) : projects.length > 0 ? (
              projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={selectedProjectId === project.id ? 'project-card is-active' : 'project-card'}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <strong>{project.name}</strong>
                  <span>{formatDateLabel(project.createdAt)} 생성</span>
                </button>
              ))
            ) : (
              <p className="empty-copy">아직 프로젝트가 없습니다.</p>
            )}
          </div>
        </aside>

        <section className="project-detail">
          {selectedProject ? (
            <>
              <header className="project-detail-head">
                <button type="button" className="back-button" onClick={() => setSelectedProjectId('')}>
                  프로젝트 목록
                </button>
                <h1>{selectedProject.name}</h1>
              </header>

              <form className="inline-form log-form" onSubmit={handleAddLog}>
                <input
                  type="text"
                  value={logInput}
                  onChange={(event) => setLogInput(event.target.value)}
                  placeholder="오늘 한 작업을 적어주세요"
                  className="text-input"
                />
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  +
                </button>
              </form>

              {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}

              <section className="log-list">
                {logsLoading ? (
                  <p className="empty-copy">작업 로그를 불러오는 중입니다.</p>
                ) : groupedLogs.length > 0 ? (
                  groupedLogs.map((group) => (
                    <div key={group.dateKey} className="log-group">
                      <h3>{group.dateLabel}</h3>
                      <ul>
                        {group.items.map((log) => (
                          <li key={log.id} className="log-item">
                            <div className="log-text-wrap">
                              <span className="log-text">{log.text}</span>
                              <time className="log-time">{formatTimeLabel(log.createdAt)}</time>
                            </div>
                            <button
                              type="button"
                              className="log-delete"
                              onClick={() => void handleDeleteLog(log.id)}
                              aria-label="로그 삭제"
                            >
                              삭제
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="empty-copy">아직 작업 로그가 없습니다.</p>
                )}
              </section>
            </>
          ) : (
            <section className="project-placeholder">
              <p className="section-label">프로젝트</p>
              <h1>프로젝트를 선택하세요</h1>
              <p className="empty-copy">왼쪽에서 프로젝트를 선택하면 작업 로그를 볼 수 있습니다.</p>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

export default HomePage;
