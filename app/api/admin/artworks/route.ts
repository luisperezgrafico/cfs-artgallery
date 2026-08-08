import { NextResponse } from 'next/server';
import { getAllRoomArtworks, getPublishingSubmissions } from '../../../../lib/storage';
import { rooms } from '../../../../config/roomsConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const artworks = await getAllRoomArtworks(rooms.map(r => r.id));
    // Anything approved but not visible in a room read yet — see the storage
    // helper. Sent alongside so the panel can show it as still publishing rather
    // than as missing, including after a full page reload.
    const publishing = await getPublishingSubmissions(artworks);
    return NextResponse.json({ artworks, publishing });
  } catch (err) {
    console.error('[admin/artworks GET]', err);
    return NextResponse.json({ error: 'Failed to load artworks.' }, { status: 500 });
  }
}
