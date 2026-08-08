import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { memoryStore } from '../../lib/blobStore';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../../lib/storage';
import { PUT } from '../../app/api/admin/settings/audio/route';

function putAudioSettings(body: unknown): Promise<Response> {
  return PUT(new NextRequest('http://test.local/api/admin/settings/audio', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('admin ElevenLabs settings route', () => {
  beforeEach(() => memoryStore.reset());

  it('preserves existing API keys when no new drafts are submitted', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      audioSettings: {
        ...DEFAULT_SETTINGS.audioSettings,
        elevenlabs: {
          ...DEFAULT_SETTINGS.audioSettings.elevenlabs,
          apiKey: 'key-one',
          apiKeys: ['key-two'],
          voiceId: 'old-voice',
        },
      },
    });

    const res = await putAudioSettings({
      apiKey: '',
      apiKeys: ['', '', ''],
      voiceId: 'new-voice',
    });

    expect(res.ok).toBe(true);
    const settings = await getSettings();
    expect(settings.audioSettings.elevenlabs.apiKey).toBe('key-one');
    expect(settings.audioSettings.elevenlabs.apiKeys).toEqual(['key-two']);
    expect(settings.audioSettings.elevenlabs.voiceId).toBe('new-voice');
  });

  it('updates an individual fallback key without replacing the others', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      audioSettings: {
        ...DEFAULT_SETTINGS.audioSettings,
        elevenlabs: {
          ...DEFAULT_SETTINGS.audioSettings.elevenlabs,
          apiKey: 'key-one',
          apiKeys: ['key-two', 'key-three'],
        },
      },
    });

    const res = await putAudioSettings({
      apiKey: '',
      apiKeys: ['new-key-two', '', ''],
    });

    expect(res.ok).toBe(true);
    const settings = await getSettings();
    expect(settings.audioSettings.elevenlabs.apiKey).toBe('key-one');
    expect(settings.audioSettings.elevenlabs.apiKeys).toEqual(['new-key-two', 'key-three']);
  });

  it('does not persist masked placeholder values as API keys', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      audioSettings: {
        ...DEFAULT_SETTINGS.audioSettings,
        elevenlabs: {
          ...DEFAULT_SETTINGS.audioSettings.elevenlabs,
          apiKey: 'key-one',
          apiKeys: ['key-two'],
        },
      },
    });

    const res = await putAudioSettings({
      apiKey: 'key-on••••••••••••••••••••',
      apiKeys: ['key-tw••••••••••••••••••••'],
    });

    expect(res.ok).toBe(true);
    const settings = await getSettings();
    expect(settings.audioSettings.elevenlabs.apiKey).toBe('key-one');
    expect(settings.audioSettings.elevenlabs.apiKeys).toEqual(['key-two']);
  });
});
