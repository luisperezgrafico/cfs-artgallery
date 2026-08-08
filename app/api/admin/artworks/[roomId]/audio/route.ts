import { NextRequest, NextResponse } from 'next/server';
import { generateAudioForArtwork } from '../../../../../../lib/audioNarration';
import { clearArtworkAudio, getRoomArtworks, updateArtworkAudio } from '../../../../../../lib/storage';
import { artworkKey } from '../../../../../../utils/artworkKey';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const body = await request.json().catch(() => ({})) as { id?: unknown };

    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const artworks = (await getRoomArtworks(roomId)) ?? [];
    const artwork = artworks.find(a => artworkKey(a) === body.id);
    if (!artwork) {
      return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    }

    const audio = await generateAudioForArtwork(artwork);
    if (!audio) {
      return NextResponse.json({ error: 'No TTS backend configured, or no description to narrate.' }, { status: 503 });
    }

    const updated = await updateArtworkAudio(roomId, body.id, {
      audioUrl: audio.url,
      audioGeneratedAt: audio.generatedAt,
      audioVoice: audio.voice,
      audioSource: 'generated',
      audioTextSignature: audio.textSignature,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, artwork: updated, roomId });
  } catch (err) {
    console.error('[admin/artworks audio]', err);
    const message = err instanceof Error ? err.message : 'Failed to regenerate audio.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const body = await request.json().catch(() => ({})) as { id?: unknown };

    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const updated = await clearArtworkAudio(roomId, body.id);
    if (!updated) {
      return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, artwork: updated, roomId });
  } catch (err) {
    console.error('[admin/artworks audio delete]', err);
    const message = err instanceof Error ? err.message : 'Failed to remove audio.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
