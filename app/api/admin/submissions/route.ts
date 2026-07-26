import { NextResponse } from 'next/server';
import { getPendingSubmissions } from '../../../../lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const submissions = await getPendingSubmissions();
    return NextResponse.json(submissions);
  } catch (err) {
    console.error('[admin/submissions]', err);
    return NextResponse.json([], { status: 200 });
  }
}
