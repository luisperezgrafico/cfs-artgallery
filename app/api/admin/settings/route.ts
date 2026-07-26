import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, GallerySettings } from '../../../../lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getSettings();
    // Never expose the API key in full — mask it for display
    return NextResponse.json({
      ...settings,
      resendApiKey: settings.resendApiKey
        ? `${settings.resendApiKey.slice(0, 6)}${'•'.repeat(20)}`
        : '',
      resendApiKeySet: Boolean(settings.resendApiKey),
    });
  } catch (err) {
    console.error('[admin/settings GET]', err);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Partial<GallerySettings> & { resendApiKeyClear?: boolean };
    const current = await getSettings();

    const updated: GallerySettings = {
      resendApiKey:
        body.resendApiKey !== undefined
          ? body.resendApiKey
          : body.resendApiKeyClear
          ? ''
          : current.resendApiKey,
      moderatorEmails: body.moderatorEmails ?? current.moderatorEmails,
      approvalTemplate: body.approvalTemplate ?? current.approvalTemplate,
      rejectionTemplate: body.rejectionTemplate ?? current.rejectionTemplate,
    };

    await saveSettings(updated);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin/settings PUT]', err);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}
