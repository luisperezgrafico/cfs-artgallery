import { NextRequest, NextResponse } from 'next/server';
import { clearDiagnosticLogs, getDiagnosticLogs } from '../../../../../lib/storage';

export const dynamic = 'force-dynamic';

function requireDev(request: NextRequest): NextResponse | null {
  return request.headers.get('x-gallery-admin-role') === 'dev'
    ? null
    : NextResponse.json({ error: 'Developer access required.' }, { status: 403 });
}

// Temporary — see the note above appendDiagnosticLog in lib/storage.ts.
export async function GET(request: NextRequest) {
  const forbidden = requireDev(request);
  if (forbidden) return forbidden;

  try {
    const entries = await getDiagnosticLogs();
    return NextResponse.json({ entries: [...entries].reverse() });
  } catch (err) {
    console.error('[developer/diagnostics GET]', err);
    return NextResponse.json({ error: 'Failed to load diagnostics.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const forbidden = requireDev(request);
  if (forbidden) return forbidden;

  try {
    await clearDiagnosticLogs();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[developer/diagnostics DELETE]', err);
    return NextResponse.json({ error: 'Failed to clear diagnostics.' }, { status: 500 });
  }
}
