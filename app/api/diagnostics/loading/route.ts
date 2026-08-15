import { NextRequest, NextResponse } from 'next/server';
import { appendDiagnosticLog } from '../../../../lib/storage';

export const dynamic = 'force-dynamic';

const MAX_STRING = 500;
const MAX_ERRORS = 20;

function str(value: unknown, max = MAX_STRING): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

// Temporary diagnostic sink for the stuck-loading-screen bug — see the note
// in lib/storage.ts. Public and best-effort on purpose: it's called from the
// visitor's own browser before we know whether they're even authenticated,
// and a reporting failure must never surface to them or affect the gallery.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as Partial<{
      event: string;
      progress: number;
      assetsReady: boolean;
      currentScreen: string;
      elapsedMs: number;
      url: string;
      referrer: string;
      navigationType: string;
      errors: string[];
    }> | null;

    if (!body) return NextResponse.json({ ok: true });

    await appendDiagnosticLog({
      event: str(body.event, 60) || 'unknown',
      progress: typeof body.progress === 'number' ? body.progress : -1,
      assetsReady: Boolean(body.assetsReady),
      currentScreen: str(body.currentScreen, 20),
      elapsedMs: typeof body.elapsedMs === 'number' ? body.elapsedMs : -1,
      url: str(body.url),
      referrer: str(body.referrer),
      navigationType: str(body.navigationType, 40),
      userAgent: str(request.headers.get('user-agent') ?? ''),
      errors: Array.isArray(body.errors) ? body.errors.slice(0, MAX_ERRORS).map(e => str(e)) : [],
    });
  } catch (err) {
    console.error('[diagnostics/loading]', err);
  }
  return NextResponse.json({ ok: true });
}
