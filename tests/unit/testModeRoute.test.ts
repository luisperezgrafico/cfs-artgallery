import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { memoryStore } from '../../lib/blobStore';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../../lib/storage';
import { GET, PUT } from '../../app/api/admin/developer/test-mode/route';

function request(method: 'GET' | 'PUT', body?: unknown, role = 'dev') {
  return new NextRequest('http://test.local/api/admin/developer/test-mode', {
    method,
    headers: { 'x-gallery-admin-role': role, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('developer test mode route', () => {
  beforeEach(async () => {
    memoryStore.reset();
    await saveSettings({ ...DEFAULT_SETTINGS, moderatorEmails: ['dev@example.test', 'partner@example.test'] });
  });

  it('defaults on and lets dev select a moderator recipient', async () => {
    const initial = await GET(request('GET'));
    expect(await initial.json()).toMatchObject({ enabled: true, recipient: '' });

    const saved = await PUT(request('PUT', { enabled: true, recipient: 'dev@example.test' }));
    expect(saved.ok).toBe(true);
    expect((await getSettings()).testModeRecipient).toBe('dev@example.test');
  });

  it('rejects non-moderator recipients and non-dev callers', async () => {
    const invalidRecipient = await PUT(request('PUT', { recipient: 'other@example.test' }));
    const nonDev = await GET(request('GET', undefined, 'admin'));
    expect(invalidRecipient.status).toBe(400);
    expect(nonDev.status).toBe(403);
  });
});
