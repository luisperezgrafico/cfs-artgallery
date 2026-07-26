import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Basic ')) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Gallery Admin", charset="UTF-8"' },
    });
  }

  const decoded = atob(authHeader.slice(6));
  const colonAt = decoded.indexOf(':');
  const user = decoded.slice(0, colonAt);
  const pass = decoded.slice(colonAt + 1);

  const expectedUser = process.env.ADMIN_USER ?? 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedPass || user !== expectedUser || pass !== expectedPass) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Gallery Admin", charset="UTF-8"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
