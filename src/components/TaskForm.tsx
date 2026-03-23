import CalendarField from './CalendarField';
import { Subject, TaskFormValues } from '../types/task';

interface TaskFormProps {
  subjects: Subject[];
  values: TaskFormValues;
  today: string;
  loading: boolean;
  errorMessage: string;
  onChange: (patch: Partial<TaskFormValues>) => void;
  onSubmit: () => void;
}

function TaskForm({
  subjects,
  values,
  today,
  loading,
  errorMessage,
  onChange,
  onSubmit,
}: TaskFormProps) {
  const selectedSubject = subjects.find((subject) => subject.id === values.subjectId);

  return (
    <section className="card form-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">과제 생성</p>
          <h2>체크리스트 만들기</h2>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">연결할 과목</span>
          <select value={values.subjectId} onChange={(event) => onChange({ subjectId: event.target.value })}>
            <option value="">과목을 선택하세요</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">팀플 여부</span>
          <select
            value={values.isTeamProject ? 'yes' : 'no'}
            onChange={(event) => onChange({ isTeamProject: event.target.value === 'yes' })}
          >
            <option value="no">아니오</option>
            <option value="yes">예</option>
          </select>
        </label>
        <label className="field field-full">
          <span className="field-label">과제명</span>
          <input
            type="text"
            value={values.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="예: 브랜드 북 편집안 제작"
          />
        </label>
        <label className="field field-full">
          <span className="field-label">과제 설명</span>
          <textarea
            rows={5}
            value={values.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="필요한 산출물, 교수님 피드백, 발표 조건 등을 적어주세요."
          />
        </label>
        <CalendarField
          id="taskDueDate"
          label="마감일"
          value={values.dueDate}
          min={today}
          onChange={(value) => onChange({ dueDate: value })}
        />
      </div>

      {selectedSubject ? (
        <div className="subject-summary-box">
          <strong>{selectedSubject.name}</strong>
          <p>{selectedSubject.description}</p>
          <span>
            {selectedSubject.classStyle}
            {selectedSubject.focusNote ? ` · ${selectedSubject.focusNote}` : ''}
          </span>
        </div>
      ) : null}

      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      <div className="form-actions">
        <button type="button" className="button primary" onClick={onSubmit} disabled={loading}>
          {loading ? '체크리스트 만드는 중...' : '체크리스트 만들기'}
        </button>
      </div>
    </section>
  );
}

export default TaskForm;
