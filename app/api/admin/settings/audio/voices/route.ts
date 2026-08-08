import { NextResponse } from 'next/server';
import { getSettings, type ElevenLabsAudioSettings } from '../../../../../../lib/storage';

export const dynamic = 'force-dynamic';

interface ElevenLabsVoice {
  voice_id?: string;
  voiceId?: string;
  name?: string;
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

export async function GET() {
  try {
    const settings = await getSettings();
    const keys = apiKeys(settings.audioSettings.elevenlabs);
    if (keys.length === 0) {
      return NextResponse.json({ voices: [] });
    }

    let lastError = 'Failed to load ElevenLabs voices.';
    for (const apiKey of keys) {
      const res = await fetch('https://api.elevenlabs.io/v1/voices/search?page_size=100', {
        headers: { 'xi-api-key': apiKey },
        cache: 'no-store',
      });
      if (!res.ok) {
        lastError = `ElevenLabs voices request failed (${res.status}).`;
        continue;
      }

      const data = await res.json().catch(() => null) as { voices?: ElevenLabsVoice[] } | null;
      const voices = (data?.voices ?? [])
        .map(voice => ({
          id: voice.voice_id ?? voice.voiceId ?? '',
          name: voice.name ?? voice.voice_id ?? voice.voiceId ?? 'Untitled voice',
        }))
        .filter(voice => voice.id);

      return NextResponse.json({ voices });
    }

    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (err) {
    console.error('[admin/settings/audio/voices GET]', err);
    return NextResponse.json({ error: 'Failed to load ElevenLabs voices.' }, { status: 500 });
  }
}
