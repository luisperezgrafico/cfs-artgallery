import { NextRequest, NextResponse } from 'next/server';
import { sendGalleryFeedback } from '../../../lib/email';
import { getSettings } from '../../../lib/storage';

export const dynamic = 'force-dynamic';

const MAX_MESSAGE_LENGTH = 4_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as {
      message?: unknown;
      email?: unknown;
      website?: unknown;
    } | null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const website = typeof body?.website === 'string' ? body.website.trim() : '';

    // A deliberately quiet honeypot: automated form fills get no useful
    // signal, while genuine visitors never see or tab to this field.
    if (website) return NextResponse.json({ ok: true });
    if (!message) return NextResponse.json({ error: 'Please enter your feedback.' }, { status: 400 });
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Feedback must be 4,000 characters or fewer.' }, { status: 400 });
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address or leave it blank.' }, { status: 400 });
    }

    await sendGalleryFeedback(await getSettings(), { message, replyTo: email || undefined });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[feedback]', error);
    return NextResponse.json({ error: 'Feedback could not be sent. Please try again.' }, { status: 503 });
  }
}
