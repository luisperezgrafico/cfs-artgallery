import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, type AudioSettings, type ElevenLabsAudioSettings } from '../../../../../lib/storage';

export const dynamic = 'force-dynamic';

function maskSecret(value: string): string {
  return value ? `${value.slice(0, 6)}${'•'.repeat(20)}` : '';
}

function keySlots(settings: ElevenLabsAudioSettings): string[] {
  return [settings.apiKey, ...(settings.apiKeys ?? [])].slice(0, 4);
}

function publicElevenLabsSettings(settings: ElevenLabsAudioSettings) {
  const slots = keySlots(settings);
  return {
    ...settings,
    apiKey: maskSecret(settings.apiKey),
    apiKeys: slots.slice(1).map(maskSecret),
    apiKeySet: Boolean(settings.apiKey),
    apiKeySlotsSet: Array.from({ length: 4 }, (_, index) => Boolean(slots[index])),
  };
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : '') : [];
}

function nextElevenLabsKeys(body: Partial<ElevenLabsAudioSettings> & { apiKeyClear?: boolean }, current: AudioSettings): [string, string[]] {
  const currentSlots = keySlots(current.elevenlabs);
  const incomingSlots = [
    body.apiKey,
    ...stringArrayValue(body.apiKeys),
  ].slice(0, 4);

  const nextSlots = Array.from({ length: 4 }, (_, index) => {
    const incoming = incomingSlots[index];
    if (typeof incoming === 'string' && incoming.trim()) return incoming.trim();
    if (body.apiKeyClear) return '';
    return currentSlots[index] ?? '';
  });

  return [nextSlots[0] ?? '', nextSlots.slice(1).filter(Boolean)];
}

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(publicElevenLabsSettings(settings.audioSettings.elevenlabs));
  } catch (err) {
    console.error('[admin/settings/audio GET]', err);
    return NextResponse.json({ error: 'Failed to load audio settings.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Partial<ElevenLabsAudioSettings> & {
      apiKeyClear?: boolean;
    };
    const current = await getSettings();
    const [apiKey, apiKeys] = nextElevenLabsKeys(body, current.audioSettings);
    const elevenlabs: ElevenLabsAudioSettings = {
      apiKey,
      apiKeys,
      voiceId: stringValue(body.voiceId, current.audioSettings.elevenlabs.voiceId),
      modelId: stringValue(body.modelId, current.audioSettings.elevenlabs.modelId),
      outputFormat: stringValue(body.outputFormat, current.audioSettings.elevenlabs.outputFormat),
      timeoutMs: numberValue(body.timeoutMs, current.audioSettings.elevenlabs.timeoutMs),
    };

    await saveSettings({
      ...current,
      audioSettings: {
        ...current.audioSettings,
        elevenlabs,
      },
    });

    return NextResponse.json({ ok: true, elevenlabs: publicElevenLabsSettings(elevenlabs) });
  } catch (err) {
    console.error('[admin/settings/audio PUT]', err);
    return NextResponse.json({ error: 'Failed to save audio settings.' }, { status: 500 });
  }
}
