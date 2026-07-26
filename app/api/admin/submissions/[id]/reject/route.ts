import { NextRequest, NextResponse } from 'next/server';
import { getSubmission, updateSubmissionStatus, getSettings } from '../../../../../../lib/storage';
import { sendArtistRejection } from '../../../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json() as { reason?: string };

    const submission = await getSubmission(id);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }
    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already processed.' }, { status: 409 });
    }

    await updateSubmissionStatus(id, 'rejected');

    const settings = await getSettings();
    await sendArtistRejection(settings, {
      artist: submission.artist,
      title: submission.title,
      email: submission.email,
      reason: body.reason,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/reject]', err);
    return NextResponse.json({ error: 'Failed to reject submission.' }, { status: 500 });
  }
}
