import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as SUBMIT } from '../../app/api/submit/route';
import { POST as APPROVE } from '../../app/api/admin/submissions/[id]/approve/route';
import { POST as REJECT } from '../../app/api/admin/submissions/[id]/reject/route';
import { memoryStore } from '../../lib/blobStore';
import {
  DEFAULT_SETTINGS,
  getPendingSubmissions,
  getRoomArtworks,
  saveSettings,
  saveSubmission,
  type Submission,
} from '../../lib/storage';

const resendMocks = vi.hoisted(() => {
  const send = vi.fn();
  const constructor = vi.fn(() => ({ emails: { send } }));
  return { constructor, send };
});

vi.mock('resend', () => ({ Resend: resendMocks.constructor }));

const TEST_EMAIL = 'luis@example.test';

async function configureEmail(): Promise<void> {
  await saveSettings({
    ...DEFAULT_SETTINGS,
    resendApiKey: 're_test_key',
    moderatorEmails: [TEST_EMAIL],
    testModeEnabled: true,
    testModeRecipient: TEST_EMAIL,
    audioSettings: {
      ...DEFAULT_SETTINGS.audioSettings,
      provider: 'disabled',
    },
  });
}

function submission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: 'piece-one',
    title: 'Quiet Window',
    artist: 'Ada Rivers',
    email: TEST_EMAIL,
    medium: 'Watercolour',
    year: '2026',
    shortDescription: 'A pale window above a quiet table.',
    statement: 'Soft morning light crosses the room.',
    imageUrl: 'https://example.test/quiet-window.png',
    aspectRatio: 1,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    preferredRoom: 'room-1',
    preferredSlot: 0,
    ...overrides,
  };
}

async function submitArtwork(options: { artistAudio?: File; artistAudioDuration?: number } = {}): Promise<Response> {
  const form = new FormData();
  form.set('title', 'Quiet Window');
  form.set('artist', 'Ada Rivers');
  form.set('email', TEST_EMAIL);
  form.set('medium', 'Watercolour');
  form.set('year', '2026');
  form.set('shortDescription', 'A pale window above a quiet table.');
  form.set('statement', 'Soft morning light crosses the room.');
  form.set('preferredRoom', 'room-1');
  form.set('preferredSlot', '0');
  form.set('aspectRatio', '1');
  form.set('file', new File(['image'], 'quiet-window.png', { type: 'image/png' }));
  if (options.artistAudio) form.set('artistAudio', options.artistAudio);
  if (options.artistAudioDuration) form.set('artistAudioDuration', String(options.artistAudioDuration));

  return SUBMIT(new NextRequest('https://gallery.test/api/submit', {
    method: 'POST',
    headers: { origin: 'https://gallery.test' },
    body: form,
  }));
}

describe('submission email flow', () => {
  beforeEach(async () => {
    memoryStore.reset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    resendMocks.constructor.mockClear();
    resendMocks.send.mockReset();
    resendMocks.send.mockResolvedValue({ data: { id: 'email-one' }, error: null });
    await configureEmail();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends one moderator notification on submit and one artist email on approval', async () => {
    const submitResponse = await submitArtwork();
    const [pending] = await getPendingSubmissions();

    expect(submitResponse.ok).toBe(true);
    expect(pending).toBeDefined();
    expect(resendMocks.send).toHaveBeenCalledTimes(1);
    expect(resendMocks.send).toHaveBeenNthCalledWith(1, expect.objectContaining({
      from: 'ME/CFS Gallery <gallery@notifications.cfs-gallery.art>',
      to: [TEST_EMAIL],
      subject: 'New artwork submission: "Quiet Window" by Ada Rivers',
      text: expect.stringContaining('https://gallery.test/admin'),
    }));

    const approveResponse = await APPROVE(
      new NextRequest(`https://gallery.test/api/admin/submissions/${pending.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://gallery.test' },
        body: JSON.stringify({ roomId: 'room-1', slot: 0 }),
      }),
      { params: Promise.resolve({ id: pending.id }) },
    );

    expect(approveResponse.ok).toBe(true);
    expect(resendMocks.send).toHaveBeenCalledTimes(2);
    expect(resendMocks.send).toHaveBeenNthCalledWith(2, expect.objectContaining({
      from: 'ME/CFS Gallery <gallery@notifications.cfs-gallery.art>',
      to: TEST_EMAIL,
      subject: 'Your artwork "Quiet Window" has been accepted',
      text: expect.stringMatching(/Ada Rivers[\s\S]*Quiet Window[\s\S]*https:\/\/gallery\.test/),
    }));
  });

  it('keeps an artist audio attachment when approving a submission', async () => {
    const submitResponse = await submitArtwork({
      artistAudio: new File(['audio'], 'quiet-window.mp3', { type: 'audio/mpeg' }),
      artistAudioDuration: 18.5,
    });
    const [pending] = await getPendingSubmissions();

    expect(submitResponse.ok).toBe(true);
    expect(pending.artistAudioUrl).toMatch(/submissions\/.*-audio\.mp3$/);
    expect(pending.artistAudioDurationSec).toBe(18.5);

    const approveResponse = await APPROVE(
      new NextRequest(`https://gallery.test/api/admin/submissions/${pending.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://gallery.test' },
        body: JSON.stringify({ roomId: 'room-1', slot: 0 }),
      }),
      { params: Promise.resolve({ id: pending.id }) },
    );

    expect(approveResponse.ok).toBe(true);
    expect(await getRoomArtworks('room-1')).toEqual([
      expect.objectContaining({
        audioUrl: pending.artistAudioUrl,
        audioSource: 'uploaded',
        audioDurationSec: 18.5,
      }),
    ]);
  });

  it('sends the rejection template and the curator reason to the artist', async () => {
    await saveSubmission(submission());

    const response = await REJECT(
      new NextRequest('https://gallery.test/api/admin/submissions/piece-one/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'The current room is already full.' }),
      }),
      { params: Promise.resolve({ id: 'piece-one' }) },
    );

    expect(response.ok).toBe(true);
    expect(resendMocks.send).toHaveBeenCalledOnce();
    expect(resendMocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: TEST_EMAIL,
      subject: 'Your submission "Quiet Window"',
      text: expect.stringMatching(/Ada Rivers[\s\S]*Quiet Window[\s\S]*The current room is already full\./),
    }));
  });

  it('keeps a submission pending when the moderator email fails', async () => {
    resendMocks.send.mockResolvedValue({
      data: null,
      error: { message: 'Resend is temporarily unavailable.' },
    });

    const response = await submitArtwork();

    expect(response.ok).toBe(true);
    expect(await getPendingSubmissions()).toHaveLength(1);
  });

  it('routes submission notifications to the test recipient instead of all moderators', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      resendApiKey: 're_test_key',
      moderatorEmails: [TEST_EMAIL, 'partner@example.test'],
      testModeEnabled: true,
      testModeRecipient: 'partner@example.test',
    });

    await submitArtwork();

    expect(resendMocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: ['partner@example.test'],
    }));
  });

  it('keeps an approved artwork published when the artist email fails', async () => {
    await saveSubmission(submission());
    resendMocks.send.mockResolvedValue({
      data: null,
      error: { message: 'Resend is temporarily unavailable.' },
    });

    const response = await APPROVE(
      new NextRequest('https://gallery.test/api/admin/submissions/piece-one/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://gallery.test' },
        body: JSON.stringify({ roomId: 'room-1', slot: 0 }),
      }),
      { params: Promise.resolve({ id: 'piece-one' }) },
    );
    const body = await response.json() as { ok?: boolean; emailFailed?: boolean };

    expect(body).toMatchObject({ ok: true, emailFailed: true });
    expect(await getPendingSubmissions()).toHaveLength(0);
    expect(await getRoomArtworks('room-1')).toEqual([
      expect.objectContaining({ id: 'piece-one', title: 'Quiet Window' }),
    ]);
  });
});
