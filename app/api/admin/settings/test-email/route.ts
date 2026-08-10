import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSettings } from '../../../../../lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { to, resendApiKey } = await request.json() as { to: string; resendApiKey?: string };
    const settings = await getSettings();
    const apiKey = resendApiKey?.trim() || settings.resendApiKey || process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured.' }, { status: 400 });
    }

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'ME/CFS Gallery <gallery@notifications.cfs-gallery.art>',
      to,
      subject: 'Gallery admin — test email',
      text: 'This is a test notification from the ME/CFS Community Gallery admin panel. Email is working correctly.',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[test-email]', err);
    return NextResponse.json({ error: 'Failed to send test email.' }, { status: 500 });
  }
}
