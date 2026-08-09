import { NextResponse } from 'next/server';
import { getSettings, type ElevenLabsAudioSettings } from '../../../../../../lib/storage';

export const dynamic = 'force-dynamic';

interface ElevenLabsVoice {
  voice_id?: string;
  voiceId?: string;
  name?: string;
  preview_url?: string | null;
  previewUrl?: string | null;
}

interface VoiceRequestResult {
  ok: boolean;
  status: number;
  voices: { id: string; name: string; previewUrl?: string }[];
  message: string;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function apiKeys(settings: ElevenLabsAudioSettings): string[] {
  return uniqueValues([
    settings.apiKey,
    ...(settings.apiKeys ?? []),
    ...(process.env.ELEVENLABS_API_KEYS?.split(',') ?? []),
    process.env.ELEVENLABS_API_KEY ?? '',
  ]);
}

async function requestVoices(url: string, apiKey: string): Promise<VoiceRequestResult> {
  const res = await fetch(url, {
    headers: { 'xi-api-key': apiKey },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null) as { voices?: ElevenLabsVoice[]; detail?: unknown } | null;

  if (!res.ok) {
    const detail = typeof data?.detail === 'string' ? ` ${data.detail}` : '';
    return {
      ok: false,
      status: res.status,
      voices: [],
      message: `ElevenLabs voices request failed (${res.status}).${detail}`,
    };
  }

  const voices = (data?.voices ?? [])
    .map(voice => ({
      id: voice.voice_id ?? voice.voiceId ?? '',
      name: voice.name ?? voice.voice_id ?? voice.voiceId ?? 'Untitled voice',
      previewUrl: voice.preview_url ?? voice.previewUrl ?? undefined,
    }))
    .filter(voice => voice.id);

  return { ok: true, status: res.status, voices, message: '' };
}

export async function GET() {
  try {
    const settings = await getSettings();
    const keys = apiKeys(settings.audioSettings.elevenlabs);
    if (keys.length === 0) {
      return NextResponse.json({ voices: [] });
    }

    let lastError = 'Failed to load ElevenLabs voices.';
    const endpoints = [
      'https://api.elevenlabs.io/v2/voices',
      'https://api.elevenlabs.io/v1/voices/search?page_size=100',
    ];

    for (const apiKey of keys) {
      for (const endpoint of endpoints) {
        const result = await requestVoices(endpoint, apiKey);
        if (result.ok) return NextResponse.json({ voices: result.voices });
        lastError = result.message;
      }
    }

    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (err) {
    console.error('[admin/settings/audio/voices GET]', err);
    return NextResponse.json({ error: 'Failed to load ElevenLabs voices.' }, { status: 500 });
  }
}
