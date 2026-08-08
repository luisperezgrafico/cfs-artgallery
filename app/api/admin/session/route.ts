import { NextResponse } from 'next/server';
import type { AdminRole } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const role = request.headers.get('x-gallery-admin-role') as AdminRole | null;
  return NextResponse.json({ role: role === 'dev' ? 'dev' : 'admin' });
}
