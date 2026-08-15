import { NextRequest, NextResponse } from 'next/server';
import { store } from '../../../../../lib/blobStore';
import { getSettings, saveSettings } from '../../../../../lib/storage';

const MAX_AMBIENT_BYTES = 2 * 1024 * 1024;
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav']);

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Choose an audio file first.' }, { status: 400 });
    }
    if (!AUDIO_TYPES.has(file.type) || file.size > MAX_AMBIENT_BYTES) {
      return NextResponse.json({ error: 'Use an MP3, OGG, or WAV file under 2 MB.' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'audio';
    const saved = await store.putFile(
      `gallery/ambient/${Date.now()}.${extension}`,
      new Blob([await file.arrayBuffer()], { type: file.type }),
      file.type,
    );
    const current = await getSettings();
    const ambientMusic = { title: file.name, sourceUrl: saved.url };
    await saveSettings({ ...current, ambientMusic });
    return NextResponse.json({ ok: true, ambientMusic });
  } catch (error) {
    console.error('[admin/ambient-music POST]', error);
    return NextResponse.json({ error: 'Could not upload ambient music.' }, { status: 500 });
  }
}
