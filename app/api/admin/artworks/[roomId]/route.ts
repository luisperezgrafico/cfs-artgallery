import { NextRequest, NextResponse } from 'next/server';
import { removeArtworkFromRoom } from '../../../../../lib/storage';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const body = await request.json() as { index: number };

    if (typeof body.index !== 'number') {
      return NextResponse.json({ error: 'index is required.' }, { status: 400 });
    }

    await removeArtworkFromRoom(roomId, body.index);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/artworks DELETE]', err);
    return NextResponse.json({ error: 'Failed to remove artwork.' }, { status: 500 });
  }
}
