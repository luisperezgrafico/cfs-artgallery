import { afterEach, describe, expect, test, vi } from 'vitest';
import { parseBasicAuth, roleForCredentials } from '../../lib/adminAuth';

describe('admin auth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('accepts admin and dev with the same password by default', () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');

    expect(roleForCredentials({ user: 'admin', pass: 'secret' })).toBe('admin');
    expect(roleForCredentials({ user: 'dev', pass: 'secret' })).toBe('dev');
  });

  test('rejects missing or incorrect credentials', () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');

    expect(roleForCredentials({ user: 'admin', pass: 'wrong' })).toBeNull();
    expect(roleForCredentials({ user: 'other', pass: 'secret' })).toBeNull();
  });

  test('parses basic auth headers', () => {
    const token = btoa('dev:secret');

    expect(parseBasicAuth(`Basic ${token}`)).toEqual({ user: 'dev', pass: 'secret' });
    expect(parseBasicAuth(null)).toBeNull();
    expect(parseBasicAuth('Bearer nope')).toBeNull();
  });
});
