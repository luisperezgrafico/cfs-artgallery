import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { memoryStore } from '../../lib/blobStore';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../../lib/storage';
import { PUT } from '../../app/api/admin/settings/route';
import { POST as POST_TEST_EMAIL } from '../../app/api/admin/settings/test-email/route';

const resendMocks = vi.hoisted(() => {
  const send = vi.fn();
  const constructor = vi.fn(() => ({ emails: { send } }));
  return { constructor, send };
});

vi.mock('resend', () => ({ Resend: resendMocks.constructor }));

function putSettings(body: unknown): Promise<Response> {
  return PUT(new NextRequest('http://test.local/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

function postTestEmail(body: unknown): Promise<Response> {
  return POST_TEST_EMAIL(new NextRequest('http://test.local/api/admin/settings/test-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('admin Resend settings routes', () => {
  beforeEach(() => {
    memoryStore.reset();
    resendMocks.constructor.mockClear();
    resendMocks.send.mockReset();
    resendMocks.send.mockResolvedValue({ id: 'email-one' });
  });

  it('returns the updated masked key state after saving a Resend API key', async () => {
    const res = await putSettings({
      resendApiKey: 're_test_123456',
      moderatorEmails: ['moderator@example.test'],
      approvalTemplate: DEFAULT_SETTINGS.approvalTemplate,
      rejectionTemplate: DEFAULT_SETTINGS.rejectionTemplate,
    });
    const body = await res.json() as {
      ok?: boolean;
      settings?: { resendApiKey: string; resendApiKeySet: boolean };
    };

    expect(res.ok).toBe(true);
    expect(body.ok).toBe(true);
    expect(body.settings?.resendApiKeySet).toBe(true);
    expect(body.settings?.resendApiKey).toBe('re_tes••••••••••••••••••••');

    const settings = await getSettings();
    expect(settings.resendApiKey).toBe('re_test_123456');
  });

  it('uses a draft Resend API key for test email without saving it first', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      resendApiKey: '',
      moderatorEmails: ['moderator@example.test'],
    });

    const res = await postTestEmail({
      to: 'moderator@example.test',
      resendApiKey: 're_draft_key',
    });

    expect(res.ok).toBe(true);
    expect(resendMocks.constructor).toHaveBeenCalledWith('re_draft_key');
    expect(resendMocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'moderator@example.test',
    }));
    const settings = await getSettings();
    expect(settings.resendApiKey).toBe('');
  });
});
