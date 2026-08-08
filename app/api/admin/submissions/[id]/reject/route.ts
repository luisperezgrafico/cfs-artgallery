import { NextRequest, NextResponse } from 'next/server';
import { claimSubmission, getSettings } from '../../../../../../lib/storage';
import { sendArtistRejection } from '../../../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { reason?: string };

    const submission = await claimSubmission(id, 'rejected');
    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found or already processed.' },
        { status: 409 },
      );
    }

    // As with approval: the rejection is already committed, so an email failure
    // is reported but does not turn a successful moderation into an error.
    try {
      const settings = await getSettings();
      await sendArtistRejection(settings, {
        artist: submission.artist,
        title: submission.title,
        email: submission.email,
        reason: body.reason,
      });
    } catch (err) {
      console.error('[admin/reject] submission rejected but email failed:', err);
      return NextResponse.json({ ok: true, emailFailed: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/reject]', err);
    return NextResponse.json({ error: 'Failed to reject submission.' }, { status: 500 });
  }
}
