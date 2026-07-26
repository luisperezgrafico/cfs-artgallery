import { NextResponse } from 'next/server';
import { getAllRoomArtworks } from '../../../lib/storage';
import { rooms } from '../../../config/roomsConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const roomIds = rooms.map(r => r.id);
    const artworks = await getAllRoomArtworks(roomIds);
    const counts = Object.entries(artworks).map(([id, list]) => `${id}:${list.length}`).join(' ');
    console.log(`[artworks] counts: ${counts}`);
    return NextResponse.json(artworks);
  } catch (err) {
    console.error('[artworks] GET failed:', err);
    return NextResponse.json({}, { status: 200 });
  }
}
