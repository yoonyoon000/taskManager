import { Link } from 'react-router-dom';
import { TaskPlan } from '../types/task';
import { formatDate, formatDaysLeftLabel, getDaysLeft } from '../utils/date';
import { calculateTaskProgress, getTaskStatus, getTaskStatusLabel } from '../utils/tasks';
import ProgressBar from './ProgressBar';

interface TaskCardProps {
  task: TaskPlan;
}

function TaskCard({ task }: TaskCardProps) {
  const progress = calculateTaskProgress(task);
  const daysLeft = getDaysLeft(task.dueDate);
  const status = getTaskStatus(task);

  return (
    <article className={`card task-card ${status === 'urgent' ? 'is-urgent' : ''}`}>
      <div className="task-card-top">
        <div>
          <p className="eyebrow">{task.subjectName}</p>
          <h3>{task.title}</h3>
        </div>
        <span className={`task-status status-${status}`}>{getTaskStatusLabel(task)}</span>
      </div>
      <div className="task-meta-list">
        <span>마감일 {formatDate(task.dueDate)}</span>
        <span>{formatDaysLeftLabel(daysLeft)}</span>
        <span>{task.isTeamProject ? '팀플 과제' : '개인 과제'}</span>
      </div>
      <ProgressBar value={progress} label="진행도" compact />
      <div className="task-card-actions">
        <Link to={`/tasks/${task.id}`} className="button secondary small">
          과제 열기
        </Link>
      </div>
    </article>
  );
}

export default TaskCard;
