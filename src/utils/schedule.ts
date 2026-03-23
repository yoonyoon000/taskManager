import { TaskChecklistStage, TaskChecklistStageDraft } from '../types/task';
import { addDays, getDaysLeft, getTodayString } from './date';

function clampOffset(offset: number, daysLeft: number) {
  return Math.max(0, Math.min(offset, Math.max(daysLeft, 0)));
}

export function buildScheduledStages(
  dueDate: string,
  stageDrafts: TaskChecklistStageDraft[],
): TaskChecklistStage[] {
  const safeStages = stageDrafts.filter((stage) => stage.checklist.length > 0);
  const totalItems = safeStages.reduce((sum, stage) => sum + stage.checklist.length, 0);
  const daysLeft = getDaysLeft(dueDate);
  const today = getTodayString();
  let itemCursor = 0;

  return safeStages.map((stage, stageIndex) => ({
    id: stage.id || `stage-${stageIndex + 1}`,
    title: stage.title,
    description: stage.description,
    items: stage.checklist.map((label, itemIndex) => {
      const denominator = Math.max(totalItems - 1, 1);
      const ratio = itemCursor / denominator;
      const weightedRatio = Math.min(1, Math.max(0, ratio * 0.88));
      const offset = clampOffset(Math.round(weightedRatio * Math.max(daysLeft, 1)), daysLeft);
      const scheduledDate = addDays(today, offset);
      itemCursor += 1;

      return {
        id: `${stage.id || `stage-${stageIndex + 1}`}-item-${itemIndex + 1}`,
        title: label,
        notes: '',
        dueDate: scheduledDate > dueDate ? dueDate : scheduledDate,
        completed: false,
      };
    }),
  }));
}
