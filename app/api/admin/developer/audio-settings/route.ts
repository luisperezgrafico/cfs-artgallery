import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, type AudioProvider, type AudioSettings } from '../../../../../lib/storage';

export const dynamic = 'force-dynamic';

function requireDev(request: NextRequest): NextResponse | null {
  return request.headers.get('x-gallery-admin-role') === 'dev'
    ? null
    : NextResponse.json({ error: 'Developer access required.' }, { status: 403 });
}

function maskSecret(value: string): string {
  return value ? `${value.slice(0, 6)}${'•'.repeat(20)}` : '';
}

function keySlots(settings: AudioSettings['elevenlabs']): string[] {
  return [settings.apiKey, ...(settings.apiKeys ?? [])].slice(0, 4);
}

function publicSettings(settings: AudioSettings) {
  const elevenLabsKeySlots = keySlots(settings.elevenlabs);

  return {
    ...settings,
    local: {
      ...settings.local,
      apiKey: maskSecret(settings.local.apiKey),
      apiKeySet: Boolean(settings.local.apiKey),
    },
    openai: {
      ...settings.openai,
      apiKey: maskSecret(settings.openai.apiKey),
      apiKeySet: Boolean(settings.openai.apiKey),
    },
    elevenlabs: {
      ...settings.elevenlabs,
      apiKey: maskSecret(settings.elevenlabs.apiKey),
      apiKeys: elevenLabsKeySlots.slice(1).map(maskSecret),
      apiKeySet: Boolean(settings.elevenlabs.apiKey),
      apiKeySlotsSet: Array.from({ length: 4 }, (_, index) => Boolean(elevenLabsKeySlots[index])),
    },
  };
}

function provider(value: unknown, fallback: AudioProvider): AudioProvider {
  return value === 'local' || value === 'openai' || value === 'elevenlabs' || value === 'disabled'
    ? value
    : fallback;
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

function nextElevenLabsKeys(body: Partial<AudioSettings> & { elevenlabsApiKeyClear?: boolean }, current: AudioSettings): [string, string[]] {
  const currentSlots = keySlots(current.elevenlabs);
  const incomingSlots = [
    body.elevenlabs?.apiKey,
    ...stringArrayValue(body.elevenlabs?.apiKeys),
  ].slice(0, 4);

  const nextSlots = Array.from({ length: 4 }, (_, index) => {
    const incoming = incomingSlots[index];
    if (typeof incoming === 'string' && incoming.trim()) return incoming.trim();
    if (body.elevenlabsApiKeyClear) return '';
    return currentSlots[index] ?? '';
  });

  return [nextSlots[0] ?? '', nextSlots.slice(1).filter(Boolean)];
}

export async function GET(request: NextRequest) {
  const forbidden = requireDev(request);
  if (forbidden) return forbidden;

  try {
    const settings = await getSettings();
    return NextResponse.json(publicSettings(settings.audioSettings));
  } catch (err) {
    console.error('[developer/audio-settings GET]', err);
    return NextResponse.json({ error: 'Failed to load audio settings.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const forbidden = requireDev(request);
  if (forbidden) return forbidden;

  try {
    const body = await request.json().catch(() => ({})) as Partial<AudioSettings> & {
      localApiKeyClear?: boolean;
      openaiApiKeyClear?: boolean;
      elevenlabsApiKeyClear?: boolean;
    };
    const current = await getSettings();
    const [elevenLabsApiKey, elevenLabsApiKeys] = nextElevenLabsKeys(body, current.audioSettings);

    const next: AudioSettings = {
      provider: provider(body.provider, current.audioSettings.provider),
      local: {
        baseUrl: stringValue(body.local?.baseUrl, current.audioSettings.local.baseUrl),
        apiKey: body.local?.apiKey
          ? body.local.apiKey
          : body.localApiKeyClear
          ? ''
          : current.audioSettings.local.apiKey,
        model: stringValue(body.local?.model, current.audioSettings.local.model),
        voice: stringValue(body.local?.voice, current.audioSettings.local.voice),
        format: stringValue(body.local?.format, current.audioSettings.local.format),
        timeoutMs: numberValue(body.local?.timeoutMs, current.audioSettings.local.timeoutMs),
      },
      openai: {
        baseUrl: stringValue(body.openai?.baseUrl, current.audioSettings.openai.baseUrl),
        apiKey: body.openai?.apiKey
          ? body.openai.apiKey
          : body.openaiApiKeyClear
          ? ''
          : current.audioSettings.openai.apiKey,
        model: stringValue(body.openai?.model, current.audioSettings.openai.model),
        voice: stringValue(body.openai?.voice, current.audioSettings.openai.voice),
        format: stringValue(body.openai?.format, current.audioSettings.openai.format),
        timeoutMs: numberValue(body.openai?.timeoutMs, current.audioSettings.openai.timeoutMs),
      },
      elevenlabs: {
        apiKey: elevenLabsApiKey,
        apiKeys: elevenLabsApiKeys,
        voiceId: stringValue(body.elevenlabs?.voiceId, current.audioSettings.elevenlabs.voiceId),
        modelId: stringValue(body.elevenlabs?.modelId, current.audioSettings.elevenlabs.modelId),
        outputFormat: stringValue(body.elevenlabs?.outputFormat, current.audioSettings.elevenlabs.outputFormat),
        timeoutMs: numberValue(body.elevenlabs?.timeoutMs, current.audioSettings.elevenlabs.timeoutMs),
      },
    };

    await saveSettings({ ...current, audioSettings: next });
    return NextResponse.json({ ok: true, audioSettings: publicSettings(next) });
  } catch (err) {
    console.error('[developer/audio-settings PUT]', err);
    return NextResponse.json({ error: 'Failed to save audio settings.' }, { status: 500 });
  }
}
