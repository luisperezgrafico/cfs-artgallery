import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '../../../../../lib/storage';

export const dynamic = 'force-dynamic';

function requireDev(request: NextRequest): NextResponse | null {
  return request.headers.get('x-gallery-admin-role') === 'dev'
    ? null
    : NextResponse.json({ error: 'Developer access required.' }, { status: 403 });
}

function publicTestMode(settings: Awaited<ReturnType<typeof getSettings>>) {
  return {
    enabled: settings.testModeEnabled,
    recipient: settings.testModeRecipient,
    moderatorEmails: settings.moderatorEmails,
  };
}

export async function GET(request: NextRequest) {
  const forbidden = requireDev(request);
  if (forbidden) return forbidden;
  return NextResponse.json(publicTestMode(await getSettings()));
}

export async function PUT(request: NextRequest) {
  const forbidden = requireDev(request);
  if (forbidden) return forbidden;
  try {
    const body = await request.json().catch(() => ({})) as { enabled?: unknown; recipient?: unknown };
    const current = await getSettings();
    const recipient = typeof body.recipient === 'string' ? body.recipient.trim() : current.testModeRecipient;
    if (recipient && !current.moderatorEmails.includes(recipient)) {
      return NextResponse.json({ error: 'Choose a recipient from the moderator list.' }, { status: 400 });
    }
    const next = {
      ...current,
      testModeEnabled: typeof body.enabled === 'boolean' ? body.enabled : current.testModeEnabled,
      testModeRecipient: recipient,
    };
    await saveSettings(next);
    return NextResponse.json({ ok: true, testMode: publicTestMode(next) });
  } catch (error) {
    console.error('[developer/test-mode PUT]', error);
    return NextResponse.json({ error: 'Failed to save test mode.' }, { status: 500 });
  }
}
