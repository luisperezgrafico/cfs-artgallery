import { NextResponse } from 'next/server';
import { getAllRoomArtworks } from '../../../lib/storage';
import { rooms } from '../../../config/roomsConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const roomIds = rooms.map(r => r.id);
    const artworks = await getAllRoomArtworks(roomIds);
    return NextResponse.json(artworks);
  } catch {
    return NextResponse.json({}, { status: 200 });
  }
}
