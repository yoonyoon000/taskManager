import { Subject, SubjectEditValues } from '../types/task';
import IconButton from './IconButton';

interface SubjectEditPanelProps {
  subject: Subject | null;
  open: boolean;
  values: SubjectEditValues;
  taskCount: number;
  onChange: (patch: Partial<SubjectEditValues>) => void;
  onClose: () => void;
  onSave: () => void;
}

function SubjectEditPanel({
  subject,
  open,
  values,
  taskCount,
  onChange,
  onClose,
  onSave,
}: SubjectEditPanelProps) {
  return (
    <aside className={open ? 'subject-panel is-open' : 'subject-panel'}>
      <div className="subject-panel-head">
        <div>
          <strong>과목 수정</strong>
          <p>{subject ? `${taskCount}개의 과제와 연결됨` : ''}</p>
        </div>
        <IconButton icon="close" label="패널 닫기" onClick={onClose} />
      </div>
      <div className="subject-panel-form">
        <input
          type="text"
          value={values.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="과목명"
        />
        <select
          value={values.category}
          onChange={(event) => onChange({ category: event.target.value as SubjectEditValues['category'] })}
        >
          <option value="교양">교양</option>
          <option value="전공">전공</option>
        </select>
        <textarea
          rows={6}
          value={values.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="과목 메모"
        />
      </div>
      <div className="subject-panel-footer">
        <button type="button" className="primary-action" onClick={onSave}>
          저장
        </button>
      </div>
    </aside>
  );
}

export default SubjectEditPanel;
