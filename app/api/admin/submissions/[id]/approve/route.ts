import { NextRequest, NextResponse } from 'next/server';
import {
  getSubmission,
  claimSubmission,
  releaseSubmission,
  addArtworkToRoom,
  getSettings,
  Submission,
} from '../../../../../../lib/storage';
import { sendArtistApproval } from '../../../../../../lib/email';
import { ImageMetadata } from '../../../../../../types/museum';

export const dynamic = 'force-dynamic';

function toArtwork(submission: Submission): ImageMetadata {
  return {
    id: submission.id,
    url: submission.imageUrl,
    title: submission.title,
    artist: submission.artist,
    date: submission.year || new Date().getFullYear().toString(),
    medium: submission.medium || undefined,
    shortDescription: submission.shortDescription || undefined,
    longDescription: submission.statement || undefined,
    link: '',
    aspectRatio: submission.aspectRatio,
    slot: submission.preferredSlot,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { roomId?: string };

    // Resolve the room before claiming, so a bad request can't strand a
    // submission in "approved" with nowhere to hang it.
    const existing = await getSubmission(id);
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }
    const roomId = body.roomId || existing.preferredRoom;
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required.' }, { status: 400 });
    }

    // Claiming is the single atomic step that decides who owns this approval.
    // A duplicate click gets null and stops here, so the artwork is never
    // added twice and the artist is never emailed twice.
    const submission = await claimSubmission(id, 'approved', { approvedRoom: roomId });
    if (!submission) {
      return NextResponse.json({ error: 'Submission already processed.' }, { status: 409 });
    }

    const artwork = toArtwork(submission);
    try {
      await addArtworkToRoom(roomId, artwork);
    } catch (err) {
      console.error('[admin/approve] hanging failed, releasing submission:', err);
      await releaseSubmission(id);
      return NextResponse.json({ error: 'Failed to add artwork to the room.' }, { status: 500 });
    }

    // Email is a notification, not part of the transaction. A Resend outage must
    // not report a failed approval for work that is already committed.
    try {
      const settings = await getSettings();
      await sendArtistApproval(settings, {
        artist: submission.artist,
        title: submission.title,
        email: submission.email,
        galleryUrl: request.headers.get('origin') || 'https://cfs-gallery.art',
      });
    } catch (err) {
      console.error('[admin/approve] artwork approved but email failed:', err);
      return NextResponse.json({ ok: true, artwork, roomId, emailFailed: true });
    }

    return NextResponse.json({ ok: true, artwork, roomId });
  } catch (err) {
    console.error('[admin/approve]', err);
    return NextResponse.json({ error: 'Failed to approve submission.' }, { status: 500 });
  }
}
