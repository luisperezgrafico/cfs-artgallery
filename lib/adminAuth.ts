export type AdminRole = 'admin' | 'dev';

export interface BasicCredentials {
  user: string;
  pass: string;
}

export function parseBasicAuth(authHeader: string | null): BasicCredentials | null {
  if (!authHeader?.startsWith('Basic ')) return null;

  const decoded = atob(authHeader.slice(6));
  const colonAt = decoded.indexOf(':');
  if (colonAt < 0) return null;

  return {
    user: decoded.slice(0, colonAt),
    pass: decoded.slice(colonAt + 1),
  };
}

export function roleForCredentials(credentials: BasicCredentials): AdminRole | null {
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedPass || credentials.pass !== expectedPass) return null;

  const adminUser = process.env.ADMIN_USER ?? 'admin';
  const devUser = process.env.DEV_USER ?? 'dev';

  if (credentials.user === devUser) return 'dev';
  if (credentials.user === adminUser) return 'admin';
  return null;
}
