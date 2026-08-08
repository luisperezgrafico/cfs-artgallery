import { NextRequest, NextResponse } from 'next/server';
import { store } from '../../../../../../../lib/blobStore';
import { getRoomArtworks, updateArtworkAudio } from '../../../../../../../lib/storage';
import { artworkKey } from '../../../../../../../utils/artworkKey';

export const dynamic = 'force-dynamic';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
};

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'artwork';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const form = await request.formData();
    const id = (form.get('id') as string | null)?.trim() ?? '';
    const file = form.get('file') as File | null;

    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 });
    }
    const extension = AUDIO_TYPES[file.type];
    if (!extension) {
      return NextResponse.json({ error: 'Audio must be MP3, WAV, M4A, AAC or OGG.' }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio must be under 25 MB.' }, { status: 400 });
    }

    const artworks = (await getRoomArtworks(roomId)) ?? [];
    const artwork = artworks.find(a => artworkKey(a) === id);
    if (!artwork) {
      return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    }

    const saved = await store.putFile(
      `gallery/audio/${safeId(id)}-${Date.now()}-artist.${extension}`,
      file,
      file.type,
    );
    const updated = await updateArtworkAudio(roomId, id, {
      audioUrl: saved.url,
      audioGeneratedAt: new Date().toISOString(),
      audioVoice: 'artist-upload',
      audioSource: 'uploaded',
    });
    if (!updated) {
      return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, artwork: updated, roomId });
  } catch (err) {
    console.error('[admin/artworks audio upload]', err);
    const message = err instanceof Error ? err.message : 'Failed to upload audio.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
