import { useMemo, useState } from 'react';
import SubjectForm from '../components/SubjectForm';
import { Subject, SubjectFormValues } from '../types/task';
import { deleteSubject, getTasks, getSubjects, saveSubject } from '../utils/storage';

const initialValues: SubjectFormValues = {
  name: '',
  description: '',
  focusNote: '',
  classStyle: '혼합형',
};

function SubjectsPage() {
  const [subjects, setSubjects] = useState(() => getSubjects());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<SubjectFormValues>(initialValues);
  const [errorMessage, setErrorMessage] = useState('');

  const taskCounts = useMemo(() => {
    const tasks = getTasks();
    return tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.subjectId] = (acc[task.subjectId] ?? 0) + 1;
      return acc;
    }, {});
  }, [subjects]);

  const resetForm = () => {
    setEditingId(null);
    setFormValues(initialValues);
    setErrorMessage('');
  };

  const refreshSubjects = () => {
    setSubjects(getSubjects());
  };

  const handleSubmit = () => {
    if (!formValues.name.trim()) {
      setErrorMessage('과목명을 입력해주세요.');
      return;
    }

    if (!formValues.description.trim()) {
      setErrorMessage('과목 설명을 입력해주세요.');
      return;
    }

    const now = new Date().toISOString();
    const nextSubject: Subject = {
      id: editingId ?? crypto.randomUUID(),
      name: formValues.name.trim(),
      description: formValues.description.trim(),
      focusNote: formValues.focusNote.trim(),
      classStyle: formValues.classStyle,
      createdAt: editingId ? subjects.find((subject) => subject.id === editingId)?.createdAt ?? now : now,
      updatedAt: now,
    };

    saveSubject(nextSubject);
    refreshSubjects();
    resetForm();
  };

  const handleEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setFormValues({
      name: subject.name,
      description: subject.description,
      focusNote: subject.focusNote,
      classStyle: subject.classStyle,
    });
    setErrorMessage('');
  };

  const handleDelete = (subjectId: string) => {
    deleteSubject(subjectId);
    refreshSubjects();
    if (editingId === subjectId) {
      resetForm();
    }
  };

  return (
    <div className="page subjects-page">
      <section className="page-header">
        <p className="eyebrow">과목 관리 페이지</p>
        <h1>과목 설명을 먼저 정리하세요</h1>
        <p>과목 설명은 과제 생성 시 체크리스트를 현실적으로 만드는 기준이 됩니다.</p>
      </section>

      <SubjectForm
        values={formValues}
        onChange={(patch) => setFormValues((prev) => ({ ...prev, ...patch }))}
        onSubmit={handleSubmit}
        onCancel={editingId ? resetForm : undefined}
        submitLabel={editingId ? '과목 수정 저장' : '과목 등록'}
      />
      {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

      <section className="subject-list-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">등록된 과목</p>
            <h2>과목 목록</h2>
          </div>
        </div>
        {subjects.length === 0 ? (
          <section className="card empty-state">
            <p>아직 등록된 과목이 없습니다.</p>
          </section>
        ) : (
          <div className="subject-list">
            {subjects.map((subject) => (
              <article key={subject.id} className="card subject-card">
                <div className="subject-card-top">
                  <div>
                    <h3>{subject.name}</h3>
                    <p className="card-description">{subject.description}</p>
                  </div>
                  <span className="subject-style-badge">{subject.classStyle}</span>
                </div>
                <div className="subject-meta">
                  <span>{subject.focusNote || '수업 특징 없음'}</span>
                  <span>연결 과제 {taskCounts[subject.id] ?? 0}개</span>
                </div>
                <div className="subject-actions">
                  <button type="button" className="button secondary small" onClick={() => handleEdit(subject)}>
                    수정
                  </button>
                  <button type="button" className="button ghost small" onClick={() => handleDelete(subject.id)}>
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SubjectsPage;
