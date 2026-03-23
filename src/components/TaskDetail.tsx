import { useEffect, useState } from 'react';
import { TaskClarification, TaskPlan } from '../types/task';
import { formatShortDate, getTodayString, parseDateString } from '../utils/date';
import { flattenTaskItems } from '../utils/tasks';
import Checklist from './Checklist';

interface TaskDetailProps {
  task: TaskPlan;
  onToggleItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, patch: { title?: string; dueDate?: string }) => void;
  onAddItem: (stageId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateTask: (patch: { title?: string; description?: string; dueDate?: string }) => void;
  onRefineTask: (clarifications: TaskClarification[]) => Promise<void>;
}

function TaskDetail({
  task,
  onToggleItem,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onUpdateTask,
  onRefineTask,
}: TaskDetailProps) {
  const [showAllRemaining, setShowAllRemaining] = useState(false);
  const [clarificationInputs, setClarificationInputs] = useState<Record<string, string>>({});
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState('');
  const todayKey = getTodayString();
  const allItems = flattenTaskItems(task).sort(
    (first, second) => parseDateString(first.dueDate).getTime() - parseDateString(second.dueDate).getTime(),
  );
  const todayItems = allItems.filter((item) => !item.completed && item.dueDate === todayKey);
  const remainingItems = allItems.filter((item) => !item.completed && item.dueDate !== todayKey);
  const completedItems = allItems.filter((item) => item.completed);

  useEffect(() => {
    setShowAllRemaining(false);
  }, [task.id]);

  useEffect(() => {
    const nextInputs: Record<string, string> = {};
    (task.questions ?? []).forEach((question) => {
      nextInputs[question] = task.clarifications?.find((item) => item.question === question)?.answer ?? '';
    });
    setClarificationInputs(nextInputs);
    setRefineError('');
  }, [task.id, task.questions, task.clarifications]);

  const analysisFlags = task.analysis
    ? [
        task.analysis.needsResearch ? '리서치 필요' : null,
        task.analysis.needsPresentation ? '발표 포함' : null,
        task.analysis.needsIteration ? '시안 비교·수정 필요' : null,
      ].filter(Boolean)
    : [];

  const getScheduleLabel = (dateKey: string) => {
    if (dateKey === todayKey) {
      return '오늘';
    }

    if (parseDateString(dateKey) < parseDateString(todayKey)) {
      return `기한 지남 · ${formatShortDate(dateKey)}`;
    }

    return formatShortDate(dateKey);
  };

  const handleRefine = async () => {
    const answers = (task.questions ?? [])
      .map((question) => ({
        question,
        answer: clarificationInputs[question]?.trim() ?? '',
      }))
      .filter((item) => item.answer);

    if (answers.length === 0) {
      setRefineError('답변을 하나 이상 선택해주세요.');
      return;
    }

    setRefineError('');
    setIsRefining(true);

    try {
      await onRefineTask(answers);
    } catch (error) {
      setRefineError(error instanceof Error ? error.message : '다시 분석하지 못했습니다.');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="task-detail">
      <div className="task-detail-meta">
        <input
          type="text"
          value={task.title}
          onChange={(event) => onUpdateTask({ title: event.target.value })}
          className="task-title-input"
        />
        <input
          type="date"
          value={task.dueDate}
          onChange={(event) => onUpdateTask({ dueDate: event.target.value })}
          className="task-detail-date"
        />
      </div>
      <textarea
        value={task.description}
        onChange={(event) => onUpdateTask({ description: event.target.value })}
        placeholder="간단한 메모가 필요하면 적어두세요"
        className="task-description-input"
        rows={2}
      />
      {task.analysis ? (
        <section className="task-analysis-card">
          <div className="task-analysis-head">
            <div>
              <strong>브리프 해석</strong>
              <p>{task.analysis.reasoningSummary}</p>
            </div>
            <span>{task.analysis.assignmentType}</span>
          </div>
          <div className="task-analysis-grid">
            <div className="task-analysis-block">
              <span>추론한 과제 성격</span>
              <strong>{task.analysis.assignmentType}</strong>
            </div>
            <div className="task-analysis-block">
              <span>예상 결과물</span>
              <strong>{task.analysis.finalOutput}</strong>
            </div>
          </div>
          {analysisFlags.length > 0 ? (
            <div className="task-analysis-tags">
              {analysisFlags.map((flag) => (
                <span key={flag} className="task-analysis-tag">
                  {flag}
                </span>
              ))}
            </div>
          ) : null}
          {task.analysisError ? <p className="task-analysis-note">{task.analysisError}</p> : null}
        </section>
      ) : null}
      {task.questions && task.questions.length > 0 ? (
        <section className="task-question-card">
          <div className="task-question-head">
            <strong>추가로 확인하면 더 정확해져요</strong>
            <span>{task.questions.length}개</span>
          </div>
          <div className="task-question-form">
            {task.questions.map((question) => (
              <label key={question} className="task-question-field">
                <span>{question}</span>
                <div className="task-question-chip-row">
                  {['예', '아니오'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={
                        clarificationInputs[question] === option
                          ? 'task-question-chip is-active'
                          : 'task-question-chip'
                      }
                      onClick={() =>
                        setClarificationInputs((prev) => ({
                          ...prev,
                          [question]: prev[question] === option ? '' : option,
                        }))
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </label>
            ))}
          </div>
          {refineError ? <p className="task-question-error">{refineError}</p> : null}
          <div className="task-question-actions">
            <button type="button" className="primary-action" onClick={handleRefine} disabled={isRefining}>
              {isRefining ? '다시 분석 중...' : '답변 반영해서 다시 나누기'}
            </button>
          </div>
        </section>
      ) : null}
      <div className="task-focus-grid">
        {[
          {
            key: 'today',
            title: '오늘 해야 할 일',
            description: '오늘 날짜에 배정된 미완료 항목',
            items: todayItems,
            emptyMessage: '오늘 처리할 항목이 없습니다.',
          },
          {
            key: 'remaining',
            title: '남은 할 일',
            description: '다음 순서로 진행할 항목',
            items: remainingItems,
            emptyMessage: '남아 있는 할 일이 없습니다.',
          },
          {
            key: 'completed',
            title: '완료한 할 일',
            description: '체크를 마친 항목',
            items: completedItems,
            emptyMessage: '아직 완료한 항목이 없습니다.',
          },
        ].map((section) => {
          const visibleItems =
            section.key === 'remaining' && !showAllRemaining ? section.items.slice(0, 4) : section.items;

          return (
            <section key={section.key} className="task-focus-card">
              <div className="task-focus-head">
                <div>
                  <strong>{section.title}</strong>
                  <p>{section.description}</p>
                </div>
                <span>{section.items.length}개</span>
              </div>
              <div className="task-focus-list">
                {section.items.length > 0 ? (
                  visibleItems.map((item) => (
                    <label
                      key={item.id}
                      className={item.completed ? 'task-focus-item is-complete' : 'task-focus-item'}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => onToggleItem(item.id)}
                      />
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {item.stageTitle} · {getScheduleLabel(item.dueDate)}
                        </span>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="task-focus-empty">{section.emptyMessage}</p>
                )}
              </div>
              {section.key === 'remaining' && section.items.length > 4 ? (
                <button
                  type="button"
                  className="task-focus-toggle"
                  onClick={() => setShowAllRemaining((prev) => !prev)}
                >
                  {showAllRemaining ? '접기' : `${section.items.length - 4}개 더 보기`}
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
      <div className="task-detail-section-head">
        <strong>전체 작업 관리</strong>
        <span>선택한 과제의 모든 할 일을 수정할 수 있습니다.</span>
      </div>
      <Checklist
        task={task}
        onToggleItem={onToggleItem}
        onUpdateItem={onUpdateItem}
        onAddItem={onAddItem}
        onRemoveItem={onRemoveItem}
      />
    </div>
  );
}

export default TaskDetail;
