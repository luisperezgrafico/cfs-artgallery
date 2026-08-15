import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'gallery_admin_auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  // Match the login cookie's scope and attributes. A hard navigation in the
  // client then makes middleware evaluate the now-cleared session, rather than
  // reusing a cached authenticated admin route.
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
