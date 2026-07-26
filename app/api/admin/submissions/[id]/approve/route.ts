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
    const body = await request.json() as { roomId: string; shortDescription?: string };
    const { roomId, shortDescription } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required.' }, { status: 400 });
    }

    const submission = await getSubmission(id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }
    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already processed.' }, { status: 409 });
    }

    const artwork: ImageMetadata = {
      url: submission.imageUrl,
      title: submission.title,
      artist: submission.artist,
      date: submission.year || new Date().getFullYear().toString(),
      medium: submission.medium || undefined,
      shortDescription: shortDescription || undefined,
      longDescription: submission.statement || undefined,
      link: '',
      aspectRatio: submission.aspectRatio,
    };

    await addArtworkToRoom(roomId, artwork);
    await updateSubmissionStatus(id, 'approved');

    const origin = request.headers.get('origin') ?? '';
    const settings = await getSettings();
    await sendArtistApproval(settings, {
      artist: submission.artist,
      title: submission.title,
      email: submission.email,
      galleryUrl: origin || 'https://cfs-gallery.art',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/approve]', err);
    return NextResponse.json({ error: 'Failed to approve submission.' }, { status: 500 });
  }
}
