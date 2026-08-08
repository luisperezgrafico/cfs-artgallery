import { NextRequest, NextResponse } from 'next/server';
import { parseBasicAuth, roleForCredentials } from './lib/adminAuth';

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  const credentials = parseBasicAuth(authHeader);
  const role = credentials ? roleForCredentials(credentials) : null;

  if (!role) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Gallery Admin", charset="UTF-8"' },
    });
  }

  const headers = new Headers(request.headers);
  headers.set('x-gallery-admin-role', role);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
