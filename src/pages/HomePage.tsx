import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getWorkspace, saveWorkspace } from '../lib/projectService';
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
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [logsByProject, setLogsByProject] = useState<Record<string, ProjectLog[]>>({});
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectNameInput, setProjectNameInput] = useState('');
  const [logInput, setLogInput] = useState('');
  const [saveUserIdInput, setSaveUserIdInput] = useState(() => loadLastUserId());
  const [savedUserId, setSavedUserId] = useState(() => loadLastUserId());
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOnboarding && savedUserId) {
      void loadWorkspace(savedUserId);
    }
  }, [isOnboarding]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const groupedLogs = useMemo(
    () => groupLogs(selectedProject ? logsByProject[selectedProject.id] ?? [] : []),
    [logsByProject, selectedProject],
  );

  const selectProjectIfNeeded = (nextProjects: ProjectItem[]) => {
    setSelectedProjectId((current) => {
      if (current && nextProjects.some((project) => project.id === current)) {
        return current;
      }

      return nextProjects[0]?.id ?? '';
    });
  };

  const loadWorkspace = async (userId: string) => {
    const trimmedUserId = userId.trim();

    if (!trimmedUserId) {
      return;
    }

    setIsLoadingWorkspace(true);
    setErrorMessage('');

    try {
      const credential = await login(trimmedUserId);
      const workspace = await getWorkspace(credential.user.uid);

      setProjects(workspace.projects);
      setLogsByProject(workspace.logsByProject);
      selectProjectIfNeeded(workspace.projects);
      setSavedUserId(trimmedUserId);
      setSaveUserIdInput(trimmedUserId);
      saveLastUserId(trimmedUserId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '저장한 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  const handleCreateProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = projectNameInput.trim();

    if (!trimmedName) {
      setErrorMessage('프로젝트 이름을 입력해주세요.');
      return;
    }

    const nextProject: ProjectItem = {
      id: crypto.randomUUID(),
      name: trimmedName,
      createdAt: Date.now(),
    };

    const nextProjects = [nextProject, ...projects];
    setProjects(nextProjects);
    setLogsByProject((prev) => ({
      ...prev,
      [nextProject.id]: [],
    }));
    setSelectedProjectId(nextProject.id);
    setProjectNameInput('');
    setErrorMessage('');
  };

  const handleAddLog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProject) {
      setErrorMessage('먼저 프로젝트를 선택해주세요.');
      return;
    }

    const trimmedText = logInput.trim();

    if (!trimmedText) {
      return;
    }

    const nextLog: ProjectLog = {
      id: crypto.randomUUID(),
      text: trimmedText,
      createdAt: Date.now(),
    };

    setLogsByProject((prev) => ({
      ...prev,
      [selectedProject.id]: [nextLog, ...(prev[selectedProject.id] ?? [])],
    }));
    setLogInput('');
    setErrorMessage('');
  };

  const handleDeleteLog = (logId: string) => {
    if (!selectedProject) {
      return;
    }

    setLogsByProject((prev) => ({
      ...prev,
      [selectedProject.id]: (prev[selectedProject.id] ?? []).filter((log) => log.id !== logId),
    }));
  };

  const handleSaveWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUserId = saveUserIdInput.trim();

    if (!trimmedUserId) {
      setErrorMessage('아이디를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const credential = await login(trimmedUserId);
      await saveWorkspace(credential.user.uid, {
        projects,
        logsByProject,
      });
      setSavedUserId(trimmedUserId);
      saveLastUserId(trimmedUserId);
      setIsSaveModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeSavedUser = async () => {
    await logout();
    clearLastUserId();
    setSavedUserId('');
    setSaveUserIdInput('');
  };

  if (isOnboarding) {
    return (
      <main className="home-page">
        <section className="onboarding-panel">
          <p className="section-label">프로젝트 작업 로그</p>
          <h1>프로젝트별로 내가 한 작업을 기록하고 쌓아보세요</h1>
          <ol className="onboarding-steps">
            <li>프로젝트를 만든다</li>
            <li>오늘 한 작업을 기록한다</li>
            <li>저장해서 나중에 이어본다</li>
          </ol>
          <button type="button" className="primary-button onboarding-button" onClick={() => setIsOnboarding(false)}>
            시작하기
          </button>
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
              <p className="section-label">프로젝트 작업 로그</p>
              <h2>내 프로젝트</h2>
            </div>
            <div className="sidebar-actions">
              <button type="button" className="secondary-button" onClick={() => setIsSaveModalOpen(true)}>
                저장하기
              </button>
            </div>
          </header>

          <div className="save-status">
            <span>{savedUserId ? `이어보는 아이디: ${savedUserId}` : '아직 저장 전입니다.'}</span>
            {savedUserId ? (
              <button type="button" className="user-link" onClick={() => void handleChangeSavedUser()}>
                아이디 변경
              </button>
            ) : null}
          </div>

          <form className="inline-form project-create-form" onSubmit={handleCreateProject}>
            <input
              type="text"
              value={projectNameInput}
              onChange={(event) => setProjectNameInput(event.target.value)}
              placeholder="새 프로젝트 이름"
              className="text-input"
            />
            <button type="submit" className="primary-button">
              +
            </button>
          </form>

          <div className="project-list">
            {isLoadingWorkspace ? (
              <p className="empty-copy">저장된 데이터를 불러오는 중입니다.</p>
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
                <div>
                  <p className="section-label">작업 로그</p>
                  <h1>{selectedProject.name}</h1>
                </div>
              </header>

              <form className="inline-form log-form" onSubmit={handleAddLog}>
                <input
                  type="text"
                  value={logInput}
                  onChange={(event) => setLogInput(event.target.value)}
                  placeholder="오늘 한 작업을 적어주세요"
                  className="text-input"
                />
                <button type="submit" className="primary-button">
                  +
                </button>
              </form>

              {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}

              <section className="log-list">
                {groupedLogs.length > 0 ? (
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
                              onClick={() => handleDeleteLog(log.id)}
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
              <p className="empty-copy">왼쪽에서 프로젝트를 선택하거나 새로 만들어서 작업 로그를 시작할 수 있습니다.</p>
            </section>
          )}
        </section>
      </section>

      {isSaveModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsSaveModalOpen(false)}>
          <section className="save-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p className="section-label">기록을 저장할게요</p>
            <h2>아이디를 입력하면 나중에 이어서 볼 수 있어요</h2>
            <form className="save-modal-form" onSubmit={handleSaveWorkspace}>
              <input
                type="text"
                value={saveUserIdInput}
                onChange={(event) => setSaveUserIdInput(event.target.value)}
                placeholder="아이디 입력"
                className="text-input"
              />
              <div className="save-modal-actions">
                <button type="button" className="secondary-button" onClick={() => setIsSaveModalOpen(false)}>
                  닫기
                </button>
                <button type="submit" className="primary-button wide-button" disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default HomePage;
