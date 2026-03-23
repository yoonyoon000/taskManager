import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TaskForm from '../components/TaskForm';
import { TaskFormValues } from '../types/task';
import { requestTaskChecklist } from '../services/taskAnalysis';
import { getTodayString, parseDateString } from '../utils/date';
import { getSubjectById, getSubjects, saveTask } from '../utils/storage';
import { buildTaskPlan } from '../utils/tasks';

const initialValues: TaskFormValues = {
  subjectId: '',
  title: '',
  description: '',
  dueDate: '',
  isTeamProject: false,
};

function CreateTaskPage() {
  const navigate = useNavigate();
  const [subjects] = useState(() => getSubjects());
  const [formValues, setFormValues] = useState<TaskFormValues>(initialValues);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const today = useMemo(() => getTodayString(), []);

  const handleSubmit = async () => {
    if (!formValues.subjectId) {
      setErrorMessage('연결할 과목을 선택해주세요.');
      return;
    }

    if (!formValues.title.trim()) {
      setErrorMessage('과제명을 입력해주세요.');
      return;
    }

    if (!formValues.dueDate) {
      setErrorMessage('마감일을 선택해주세요.');
      return;
    }

    if (parseDateString(formValues.dueDate) < parseDateString(today)) {
      setErrorMessage('마감일은 오늘 이후로 선택해주세요.');
      return;
    }

    const subject = getSubjectById(formValues.subjectId);

    if (!subject) {
      setErrorMessage('선택한 과목 정보를 찾을 수 없습니다.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const analysis = await requestTaskChecklist(subject, formValues);
      const taskPlan = buildTaskPlan({
        subject,
        formValues,
        stageDrafts: analysis.data.stages,
        analysisSource: analysis.source,
        analysisError: analysis.errorMessage,
      });

      saveTask(taskPlan);
      navigate(`/tasks/${taskPlan.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="page narrow-page">
        <section className="card empty-state">
          <h1>먼저 과목을 등록해주세요</h1>
          <p>과목 설명이 있어야 과제별 체크리스트를 수업 기준에 맞게 만들 수 있습니다.</p>
          <Link to="/subjects" className="button primary">
            과목 관리로 이동
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page narrow-page">
      <section className="page-header">
        <p className="eyebrow">과제 생성 페이지</p>
        <h1>과목에 연결된 과제를 만드세요</h1>
        <p>과목 설명과 과제 정보를 바탕으로 실제 할 일 중심의 체크리스트를 만듭니다.</p>
      </section>

      <TaskForm
        subjects={subjects}
        values={formValues}
        today={today}
        loading={isLoading}
        errorMessage={errorMessage}
        onChange={(patch) => setFormValues((prev) => ({ ...prev, ...patch }))}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default CreateTaskPage;
