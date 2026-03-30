const LAST_USER_ID_KEY = 'today-records/last-user-id';

export function loadLastUserId() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(LAST_USER_ID_KEY) ?? '';
}

export function saveLastUserId(userId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LAST_USER_ID_KEY, userId);
}

export function clearLastUserId() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(LAST_USER_ID_KEY);
}
