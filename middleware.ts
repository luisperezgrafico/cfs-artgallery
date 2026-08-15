import { NextRequest, NextResponse } from 'next/server';
import { parseBasicAuth, roleForCredentials } from './lib/adminAuth';

const SESSION_COOKIE = 'gallery_admin_auth';

/**
 * The cookie holds the exact same "Basic <base64>" value a browser would send
 * as an Authorization header — set once at login, so verifying it can reuse
 * parseBasicAuth/roleForCredentials unchanged.
 *
 * The cookie always wins when present, and the `Authorization` header is only
 * consulted for `/api/admin/*` calls that have no cookie at all (tools like
 * curl or Playwright's `request` fixture, which never hold a page/cookie).
 * Two browser-caching behaviours make both parts necessary:
 *  - Page navigation under `/admin/*` ignores the header outright: browsers
 *    cache a successful native Basic Auth handshake for the whole session and
 *    keep resending that header on every request to the origin, so honouring
 *    it for page loads meant logout could never actually sign a browser out —
 *    clearing the cookie didn't stop the next /admin/login load from being
 *    bounced straight back to /admin by the still-cached header.
 *  - Even for `/api/admin/*`, the cookie must be checked *before* the header,
 *    not after: the same stale cached header rides along on every same-origin
 *    fetch() the admin panel makes, so trusting it whenever present quietly
 *    overrode a real, freshly logged-in session (e.g. showing "admin" for a
 *    user who had just signed in as "dev", because an old cached admin
 *    credential from a previous session out-prioritised their current
 *    cookie).
 */
function roleFromRequest(request: NextRequest, { allowHeader }: { allowHeader: boolean }) {
  const header = request.cookies.get(SESSION_COOKIE)?.value
    ?? (allowHeader ? request.headers.get('authorization') : null)
    ?? null;
  const credentials = parseBasicAuth(header);
  return credentials ? roleForCredentials(credentials) : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/admin/login';
  const isLoginApi = pathname === '/api/admin/login';
  const isApiRoute = pathname.startsWith('/api/');

  if (isLoginApi) return NextResponse.next();

  const role = roleFromRequest(request, { allowHeader: isApiRoute });

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
