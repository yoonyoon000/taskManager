import { TaskClarification, TaskPlan } from '../types/task';
import { formatDate, getDaysLeft } from '../utils/date';
import { calculateTaskProgress, getTaskStatusLabel } from '../utils/tasks';
import IconButton from './IconButton';
import ProgressBar from './ProgressBar';
import TaskDetail from './TaskDetail';

interface TaskCardProps {
  task: TaskPlan;
  expanded: boolean;
  onToggleExpand: (taskId: string) => void;
  onToggleItem: (taskId: string, itemId: string) => void;
  onUpdateItem: (taskId: string, itemId: string, patch: { title?: string; dueDate?: string }) => void;
  onAddItem: (taskId: string, stageId: string) => void;
  onRemoveItem: (taskId: string, itemId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenSubjectEdit: (subjectId: string) => void;
  onUpdateTask: (taskId: string, patch: { title?: string; description?: string; dueDate?: string }) => void;
  onRefineTask: (taskId: string, clarifications: TaskClarification[]) => Promise<void>;
}

function TaskCard({
  task,
  expanded,
  onToggleExpand,
  onToggleItem,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onDeleteTask,
  onOpenSubjectEdit,
  onUpdateTask,
  onRefineTask,
}: TaskCardProps) {
  const progress = calculateTaskProgress(task);
  const daysLeft = getDaysLeft(task.dueDate);
  const isUrgent = progress < 100 && daysLeft <= 3;

  return (
    <article className={`task-card ${expanded ? 'is-expanded' : ''} ${isUrgent ? 'is-urgent' : ''}`}>
      <div className="task-card-head">
        <button type="button" className="task-card-trigger" onClick={() => onToggleExpand(task.id)}>
          <div className="task-card-title-group">
            <strong>{task.title}</strong>
            <span>
              {task.subjectName} · {task.subjectCategory}
            </span>
          </div>
          <div className="task-card-meta">
            <span>{formatDate(task.dueDate)}</span>
            <span>{getTaskStatusLabel(task)}</span>
          </div>
        </button>
        <div className="task-card-actions">
          <IconButton
            icon="edit"
            label="과목 수정"
            onClick={() => onOpenSubjectEdit(task.subjectId)}
          />
          <IconButton
            icon={expanded ? 'expand_less' : 'expand_more'}
            label={expanded ? '접기' : '펼치기'}
            onClick={() => onToggleExpand(task.id)}
          />
          <IconButton icon="delete" label="과제 삭제" onClick={() => onDeleteTask(task.id)} />
        </div>
      </div>

      <div className="task-card-progress">
        <ProgressBar value={progress} label="진행도" compact />
      </div>

      {expanded ? (
        <TaskDetail
          task={task}
          onToggleItem={(itemId) => onToggleItem(task.id, itemId)}
          onUpdateItem={(itemId, patch) => onUpdateItem(task.id, itemId, patch)}
          onAddItem={(stageId) => onAddItem(task.id, stageId)}
          onRemoveItem={(itemId) => onRemoveItem(task.id, itemId)}
          onUpdateTask={(patch) => onUpdateTask(task.id, patch)}
          onRefineTask={(clarifications) => onRefineTask(task.id, clarifications)}
        />
      ) : null}
    </article>
  );
}

export default TaskCard;
