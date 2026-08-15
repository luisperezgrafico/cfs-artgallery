import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSettings } from '../../../../../lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { resendApiKey, kind, template } = await request.json() as { resendApiKey?: string; kind?: 'approval' | 'rejection'; template?: string };
    const settings = await getSettings();
    const apiKey = resendApiKey?.trim() || settings.resendApiKey || process.env.RESEND_API_KEY;
    const recipient = settings.testModeRecipient;

    if (!apiKey) {
      return NextResponse.json({ error: 'No API key configured.' }, { status: 400 });
    }
    if (!recipient) {
      return NextResponse.json({ error: 'Choose and save a test recipient first.' }, { status: 400 });
    }

    const testTemplate = template?.trim() || (kind === 'rejection' ? settings.rejectionTemplate : settings.approvalTemplate);
    const text = testTemplate
      .replaceAll('{{artist}}', 'Test artist')
      .replaceAll('{{title}}', 'Test artwork')
      .replaceAll('{{gallery_url}}', 'https://cfs-gallery.art');

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: 'ME/CFS Gallery <onboarding@resend.dev>',
      to: recipient,
      subject: kind === 'rejection' ? 'Test: artwork submission' : 'Test: artwork approval',
      text,
    });
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Resend rejected the test email.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[test-email]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send test email.' },
      { status: 500 },
    );
  }
}
