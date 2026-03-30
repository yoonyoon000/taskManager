import { DailyRecord } from '../types/record';

const RECORDS_KEY = 'today-records/items';

function isDailyRecord(value: unknown): value is DailyRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.text === 'string' &&
    typeof record.createdAt === 'number'
  );
}

export function loadRecords() {
  if (typeof window === 'undefined') {
    return [] as DailyRecord[];
  }

  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);

    if (!raw) {
      return [] as DailyRecord[];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [] as DailyRecord[];
    }

    return parsed.filter(isDailyRecord).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [] as DailyRecord[];
  }
}

export function saveRecords(records: DailyRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}
