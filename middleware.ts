import { NextRequest, NextResponse } from 'next/server';
import { parseBasicAuth, roleForCredentials } from './lib/adminAuth';

const SESSION_COOKIE = 'gallery_admin_auth';

/**
 * The cookie holds the exact same "Basic <base64>" value a browser would send
 * as an Authorization header — set once at login, so verifying it can reuse
 * parseBasicAuth/roleForCredentials unchanged. Real callers (fetch() from the
 * admin panel) get authenticated via this cookie; Playwright's httpCredentials
 * keeps working unmodified via the Authorization header path below.
 */
function roleFromRequest(request: NextRequest) {
  const header = request.headers.get('authorization') ?? request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const credentials = parseBasicAuth(header);
  return credentials ? roleForCredentials(credentials) : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/admin/login';
  const isLoginApi = pathname === '/api/admin/login';

  if (isLoginApi) return NextResponse.next();

  const role = roleFromRequest(request);

  if (isLoginPage) {
    // Already signed in — no reason to show the login form again.
    if (role) return NextResponse.redirect(new URL('/admin', request.url));
    return NextResponse.next();
  }

  if (!role) {
    // A page load (not a fetch()) gets a themed login page instead of the
    // browser's native Basic Auth popup, which is exactly what a WWW-Authenticate
    // header would trigger — so this path deliberately never sends one.
    if (pathname.startsWith('/admin')) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

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
