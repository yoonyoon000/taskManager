import { SubjectClassStyle, SubjectFormValues } from '../types/task';

interface SubjectFormProps {
  values: SubjectFormValues;
  onChange: (patch: Partial<SubjectFormValues>) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
}

const subjectStyleOptions: SubjectClassStyle[] = ['발표 중심', '결과물 중심', '리서치 중심', '혼합형'];

function SubjectForm({ values, onChange, onSubmit, onCancel, submitLabel }: SubjectFormProps) {
  return (
    <section className="card form-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">과목 정보</p>
          <h2>과목 등록 및 수정</h2>
        </div>
      </div>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">과목명</span>
          <input
            type="text"
            value={values.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="예: 편집디자인"
          />
        </label>
        <label className="field">
          <span className="field-label">수업 성향</span>
          <select
            value={values.classStyle}
            onChange={(event) => onChange({ classStyle: event.target.value as SubjectClassStyle })}
          >
            {subjectStyleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field field-full">
          <span className="field-label">과목 설명</span>
          <textarea
            rows={5}
            value={values.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="예: 편집디자인 수업으로, 그리드와 타이포 완성도를 중요하게 봄"
          />
        </label>
        <label className="field field-full">
          <span className="field-label">수업 특징 또는 중요 요소</span>
          <input
            type="text"
            value={values.focusNote}
            onChange={(event) => onChange({ focusNote: event.target.value })}
            placeholder="예: 발표 때 과정 설명을 중요하게 봄"
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="button primary" onClick={onSubmit}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="button secondary" onClick={onCancel}>
            취소
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default SubjectForm;
