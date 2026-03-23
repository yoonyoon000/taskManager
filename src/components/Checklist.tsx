import { TaskPlan } from '../types/task';
import IconButton from './IconButton';

interface ChecklistProps {
  task: TaskPlan;
  onToggleItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, patch: { title?: string; dueDate?: string }) => void;
  onAddItem: (stageId: string) => void;
  onRemoveItem: (itemId: string) => void;
}

function Checklist({
  task,
  onToggleItem,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
}: ChecklistProps) {
  return (
    <div className="task-stage-list">
      {task.stages.map((stage) => (
        <section key={stage.id} className="task-stage">
          <div className="task-stage-head">
            <div>
              <strong>{stage.title}</strong>
              <p>{stage.description}</p>
            </div>
            <IconButton icon="add" label="할 일 추가" onClick={() => onAddItem(stage.id)} />
          </div>
          <div className="checklist-list">
            {stage.items.map((item) => (
              <div key={item.id} className={item.completed ? 'checklist-row is-complete' : 'checklist-row'}>
                <label className="checklist-check">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => onToggleItem(item.id)}
                  />
                </label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(event) => onUpdateItem(item.id, { title: event.target.value })}
                  placeholder="할 일을 입력하세요"
                  className="checklist-text"
                />
                <input
                  type="date"
                  value={item.dueDate}
                  onChange={(event) => onUpdateItem(item.id, { dueDate: event.target.value })}
                  className="checklist-date"
                />
                <IconButton icon="delete" label="할 일 삭제" onClick={() => onRemoveItem(item.id)} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default Checklist;
