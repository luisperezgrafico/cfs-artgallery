import { NextRequest, NextResponse } from 'next/server';
import {
  getSubmission,
  updateSubmissionStatus,
  addArtworkToRoom,
  getSettings,
} from '../../../../../../lib/storage';
import { sendArtistApproval } from '../../../../../../lib/email';
import { ImageMetadata } from '../../../../../../types/museum';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json() as { roomId?: string };
    const submission = await getSubmission(id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }
    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already processed.' }, { status: 409 });
    }

    const roomId = body.roomId || submission.preferredRoom;
    console.log(`[approve] id=${id} roomId=${roomId} preferredRoom=${submission.preferredRoom}`);
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required.' }, { status: 400 });
    }

    const artwork: ImageMetadata = {
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
    };

    await addArtworkToRoom(roomId, artwork);
    console.log(`[approve] artwork added to ${roomId}`);
    await updateSubmissionStatus(id, 'approved');
    console.log(`[approve] submission ${id} marked approved`);

    const origin = request.headers.get('origin') ?? '';
    const settings = await getSettings();
    await sendArtistApproval(settings, {
      artist: submission.artist,
      title: submission.title,
      email: submission.email,
      galleryUrl: origin || 'https://cfs-gallery.art',
    });

    return NextResponse.json({ ok: true, artwork, roomId });
  } catch (err) {
    console.error('[admin/approve]', err);
    return NextResponse.json({ error: 'Failed to approve submission.' }, { status: 500 });
  }
}
