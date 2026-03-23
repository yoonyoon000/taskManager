export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function getTodayString() {
  return toDateKey(new Date());
}

export function parseDateString(dateString: string) {
  if (!dateString) {
    return new Date();
  }

  if (dateString.includes('T')) {
    return new Date(dateString);
  }

  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateString: string, amount: number) {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parseDateString(dateString));
}

export function formatShortDate(dateString: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(parseDateString(dateString));
}

export function getDaysLeft(dueDate: string) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = parseDateString(dueDate);
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = dueStart.getTime() - todayStart.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDaysLeftLabel(daysLeft: number) {
  if (daysLeft < 0) {
    return `${Math.abs(daysLeft)}일 지났습니다`;
  }

  if (daysLeft === 0) {
    return '오늘까지 제출해야 합니다';
  }

  if (daysLeft === 1) {
    return '하루 남았습니다';
  }

  return `${daysLeft}일 남았습니다`;
}

export function isSameDate(first: string, second: string) {
  return toDateKey(parseDateString(first)) === toDateKey(parseDateString(second));
}

export function isToday(dateString: string) {
  return isSameDate(dateString, getTodayString());
}

export function isSameMonth(date: Date, baseDate: Date) {
  return date.getFullYear() === baseDate.getFullYear() && date.getMonth() === baseDate.getMonth();
}

export function shiftMonth(baseDate: Date, amount: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + amount, 1);
}

export function getMonthDaysGrid(baseDate: Date) {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const startOffset = start.getDay();
  start.setDate(start.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}
