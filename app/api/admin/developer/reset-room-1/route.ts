import { NextResponse } from 'next/server';
import { resetRoomArtworksToSeed } from '../../../../../lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (request.headers.get('x-gallery-admin-role') !== 'dev') {
      return NextResponse.json({ error: 'Developer access required.' }, { status: 403 });
    }

    const artworks = await resetRoomArtworksToSeed('room-1');
    return NextResponse.json({ ok: true, roomId: 'room-1', artworks });
  } catch (err) {
    console.error('[admin/developer/reset-room-1]', err);
    const message = err instanceof Error ? err.message : 'Failed to reset Room I.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
