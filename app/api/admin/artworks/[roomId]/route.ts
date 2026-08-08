import { NextRequest, NextResponse } from 'next/server';
import {
  removeArtworkFromRoom,
  updateManagedArtwork,
  type EditableArtworkFields,
} from '../../../../../lib/storage';
import { rooms } from '../../../../../config/roomsConfig';

export const dynamic = 'force-dynamic';

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function editableFields(input: unknown): Partial<EditableArtworkFields> {
  const body = (input ?? {}) as Record<string, unknown>;
  const fields: Partial<EditableArtworkFields> = {};
  const title = optionalString(body.title);
  const artist = optionalString(body.artist);
  const date = optionalString(body.date);
  const medium = optionalString(body.medium);
  const shortDescription = optionalString(body.shortDescription);
  const longDescription = optionalString(body.longDescription);
  const link = optionalString(body.link);

  if (title !== undefined) fields.title = title;
  if (artist !== undefined) fields.artist = artist;
  if (date !== undefined) fields.date = date;
  if (medium !== undefined) fields.medium = medium;
  if (shortDescription !== undefined) fields.shortDescription = shortDescription;
  if (longDescription !== undefined) fields.longDescription = longDescription;
  if (link !== undefined) fields.link = link;

  return fields;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const body = await request.json().catch(() => ({})) as {
      id?: unknown;
      targetRoomId?: unknown;
      slot?: unknown;
      fields?: unknown;
    };

    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const targetRoomId = typeof body.targetRoomId === 'string' && body.targetRoomId
      ? body.targetRoomId
      : roomId;
    if (!rooms.some(room => room.id === targetRoomId)) {
      return NextResponse.json({ error: 'Unknown target room.' }, { status: 400 });
    }

    const slot = typeof body.slot === 'number' && Number.isInteger(body.slot)
      ? body.slot
      : undefined;
    if (slot !== undefined && (slot < 0 || slot > 7)) {
      return NextResponse.json({ error: 'Slot must be between 1 and 8.' }, { status: 400 });
    }

    const fields = editableFields(body.fields);
    if (fields.title === '' || fields.artist === '') {
      return NextResponse.json({ error: 'Title and artist are required.' }, { status: 400 });
    }

    const result = await updateManagedArtwork(roomId, body.id, {
      targetRoomId,
      slot,
      fields,
    });

    if (!result) {
      return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update artwork.';
    console.error('[admin/artworks PATCH]', err);
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
