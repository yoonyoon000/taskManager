import { TaskPlan } from '../types/task';
import { formatShortDate } from '../utils/date';

interface ChecklistPanelProps {
  task: TaskPlan;
  onToggleItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, patch: { title?: string; notes?: string; dueDate?: string }) => void;
  onAddItem: (stageId: string) => void;
  onRemoveItem: (itemId: string) => void;
}

function ChecklistPanel({
  task,
  onToggleItem,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
}: ChecklistPanelProps) {
  return (
    <div className="checklist-stage-list">
      {task.stages.map((stage) => (
        <section key={stage.id} className="card checklist-stage-card">
          <div className="stage-title-row">
            <div>
              <p className="eyebrow">체크리스트 단계</p>
              <h3>{stage.title}</h3>
            </div>
            <button type="button" className="button ghost small" onClick={() => onAddItem(stage.id)}>
              항목 추가
            </button>
          </div>
          <p className="card-description">{stage.description}</p>
          <div className="editable-item-list">
            {stage.items.map((item) => (
              <article key={item.id} className={item.completed ? 'editable-item is-complete' : 'editable-item'}>
                <label className="item-check">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => onToggleItem(item.id)}
                  />
                  <span>{item.completed ? '완료' : '진행 중'}</span>
                </label>
                <div className="editable-item-fields">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(event) => onUpdateItem(item.id, { title: event.target.value })}
                    placeholder="할 일을 입력하세요"
                  />
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(event) => onUpdateItem(item.id, { notes: event.target.value })}
                    placeholder="메모를 짧게 남길 수 있습니다"
                  />
                  <div className="item-date-row">
                    <span>{formatShortDate(item.dueDate)}</span>
                    <input
                      type="date"
                      value={item.dueDate}
                      onChange={(event) => onUpdateItem(item.id, { dueDate: event.target.value })}
                    />
                  </div>
                </div>
                <button type="button" className="button ghost small" onClick={() => onRemoveItem(item.id)}>
                  삭제
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default ChecklistPanel;
