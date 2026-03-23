import { useMemo, useState } from 'react';
import { Subject, TaskFormValues } from '../types/task';
import { getTodayString } from '../utils/date';
import IconButton from './IconButton';

interface QuickAddTaskProps {
  subjects: Subject[];
  onCreateTask: (values: TaskFormValues) => Promise<void>;
}

const NEW_SUBJECT_VALUE = '__new_subject__';

const initialValues: TaskFormValues = {
  subjectId: '',
  subjectName: '',
  subjectCategory: '전공',
  subjectDescription: '',
  title: '',
  description: '',
  dueDate: '',
  isTeamProject: false,
};

function QuickAddTask({ subjects, onCreateTask }: QuickAddTaskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [values, setValues] = useState(initialValues);
  const today = useMemo(() => getTodayString(), []);
  const isCreatingSubject = values.subjectId === NEW_SUBJECT_VALUE;

  const resetValues = () => {
    setValues({
      ...initialValues,
      subjectId: subjects.length === 0 ? NEW_SUBJECT_VALUE : '',
    });
  };

  const handleOpen = () => {
    resetValues();
    setErrorMessage('');
    setIsOpen(true);
  };

  const handleClose = () => {
    setErrorMessage('');
    setIsOpen(false);
  };

  const handleSubjectSelect = (subjectId: string) => {
    if (subjectId === NEW_SUBJECT_VALUE) {
      setValues((prev) => ({
        ...prev,
        subjectId,
        subjectName: '',
        subjectCategory: '전공',
        subjectDescription: '',
      }));
      return;
    }

    const subject = subjects.find((item) => item.id === subjectId);

    if (!subject) {
      setValues((prev) => ({
        ...prev,
        subjectId: '',
        subjectName: '',
        subjectCategory: '전공',
        subjectDescription: '',
      }));
      return;
    }

    setValues((prev) => ({
      ...prev,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCategory: subject.category,
      subjectDescription: subject.description,
    }));
  };

  const handleSubmit = async () => {
    if (!values.subjectId && !values.subjectName.trim()) {
      setErrorMessage('과목을 선택해주세요.');
      return;
    }

    if (isCreatingSubject && !values.subjectName.trim()) {
      setErrorMessage('과목명을 입력해주세요.');
      return;
    }

    if (!values.title.trim()) {
      setErrorMessage('과제명을 입력해주세요.');
      return;
    }

    if (!values.dueDate) {
      setErrorMessage('마감일을 선택해주세요.');
      return;
    }

    if (!values.description.trim()) {
      setErrorMessage('과제 설명을 입력해주세요');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await onCreateTask(values);
      resetValues();
      setIsOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '과제를 만들지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button type="button" className="quick-add-trigger" onClick={handleOpen}>
        <span className="material-symbols-outlined" aria-hidden>
          add
        </span>
        <span>과제 추가</span>
      </button>
    );
  }

  return (
    <section className="quick-add-panel">
      <div className="quick-add-head">
        <strong>새 과제</strong>
        <div className="quick-add-actions">
          <IconButton icon="close" label="닫기" onClick={handleClose} />
        </div>
      </div>
      <div className="quick-add-grid">
        <select value={values.subjectId || ''} onChange={(event) => handleSubjectSelect(event.target.value)}>
          <option value="">{subjects.length > 0 ? '과목 선택' : '먼저 과목을 선택하거나 새로 추가하세요'}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name} · {subject.category}
            </option>
          ))}
          <option value={NEW_SUBJECT_VALUE}>새 과목 직접 추가</option>
        </select>
        <input
          type="text"
          placeholder="과제명"
          value={values.title}
          onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
        />
        <input
          type="date"
          min={today}
          value={values.dueDate}
          onChange={(event) => setValues((prev) => ({ ...prev, dueDate: event.target.value }))}
        />
        <label className="inline-check">
          <input
            type="checkbox"
            checked={values.isTeamProject}
            onChange={(event) => setValues((prev) => ({ ...prev, isTeamProject: event.target.checked }))}
          />
          <span>팀플 과제</span>
        </label>
      </div>
      {isCreatingSubject ? (
        <div className="quick-add-advanced">
          <input
            type="text"
            placeholder="새 과목명"
            value={values.subjectName}
            onChange={(event) => setValues((prev) => ({ ...prev, subjectName: event.target.value }))}
          />
          <select
            value={values.subjectCategory}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                subjectCategory: event.target.value as TaskFormValues['subjectCategory'],
              }))
            }
          >
            <option value="교양">교양</option>
            <option value="전공">전공</option>
          </select>
          <textarea
            rows={3}
            placeholder="과목 설명"
            value={values.subjectDescription}
            onChange={(event) => setValues((prev) => ({ ...prev, subjectDescription: event.target.value }))}
          />
        </div>
      ) : null}
      <div className="quick-add-description">
        <textarea
          rows={5}
          placeholder="교수 요구사항, 과제 조건, 주제 설명 등을 자세히 적어주세요"
          value={values.description}
          onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
        />
        <p className="field-hint">과제 내용을 자세히 적을수록 더 정확한 작업 단계가 생성됩니다</p>
      </div>
      {errorMessage ? <p className="inline-error">{errorMessage}</p> : null}
      <div className="quick-add-submit">
        <button type="button" className="primary-action" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? '생성 중...' : '체크리스트 만들기'}
        </button>
      </div>
    </section>
  );
}

export default QuickAddTask;
