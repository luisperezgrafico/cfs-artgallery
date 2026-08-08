import { NextRequest, NextResponse } from 'next/server';
import { removeArtworkFromRoom } from '../../../../../lib/storage';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const body = await request.json().catch(() => ({})) as { id?: unknown };

    // Deletion is by artwork identity, never by array position: the admin's
    // index is a snapshot that goes stale as soon as anything else changes
    // the room, and deleting the wrong piece is unrecoverable.
    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const removed = await removeArtworkFromRoom(roomId, body.id);
    if (!removed) {
      // Already gone — the caller's intent is satisfied either way.
      return NextResponse.json({ ok: true, alreadyRemoved: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/artworks DELETE]', err);
    return NextResponse.json({ error: 'Failed to remove artwork.' }, { status: 500 });
  }
}
