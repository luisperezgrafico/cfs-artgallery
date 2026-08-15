export interface RememberedAdminLogin {
  username: string;
  password: string;
}

const REMEMBER_LOGIN_KEY = 'cfs-gallery:admin-remember:v1';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readRememberedAdminLogin(): RememberedAdminLogin | null {
  const ls = storage();
  if (!ls) return null;

  try {
    const raw = ls.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RememberedAdminLogin>;
    if (typeof parsed.username !== 'string' || typeof parsed.password !== 'string') return null;

    return { username: parsed.username, password: parsed.password };
  } catch {
    return null;
  }
}

export function saveRememberedAdminLogin(login: RememberedAdminLogin): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(REMEMBER_LOGIN_KEY, JSON.stringify(login));
  } catch {
    /* storage disabled/full - remember-me is optional */
  }
}

export function clearRememberedAdminLogin(): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.removeItem(REMEMBER_LOGIN_KEY);
  } catch {
    /* storage disabled/full */
  }
}
