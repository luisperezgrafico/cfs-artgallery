import { NextRequest, NextResponse } from 'next/server';
import { roleForCredentials } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'gallery_admin_auth';
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const username = body?.username ?? '';
  const password = body?.password ?? '';

  const role = roleForCredentials({ user: username, pass: password });
  if (!role) {
    return NextResponse.json({ ok: false, error: 'Incorrect username or password.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(SESSION_COOKIE, `Basic ${btoa(`${username}:${password}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS_SECONDS,
  });
  return response;
}
