export interface AdminAccount {
  _id: string;
  name: string;
  email: string;
  isAdmin: true;
}

export interface AdminSession {
  token: string;
  user: AdminAccount;
}

export function isAdminSession(value: unknown): value is AdminSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  if (typeof session.token !== 'string' || !session.token) return false;
  const user = session.user;
  return !!user && typeof user === 'object' &&
    typeof (user as Record<string, unknown>)._id === 'string' &&
    (user as Record<string, unknown>).isAdmin === true;
}

export function readAdminSession(): AdminSession | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('appData') || 'null');
    if (isAdminSession(parsed)) return parsed;
  } catch { /* invalid stored session */ }
  localStorage.removeItem('appData');
  return null;
}
