import { NextRequest, NextResponse } from 'next/server';
import { memoryStore, usingMemoryStore } from '../../../../../lib/blobStore';

export const dynamic = 'force-dynamic';

/** Serves files held by the in-memory store, standing in for the Blob CDN. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!usingMemoryStore) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const { path } = await params;
  const file = memoryStore.getFile(path.join('/'));
  if (!file) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  return new NextResponse(Buffer.from(file.bytes), {
    headers: { 'Content-Type': file.contentType, 'Cache-Control': 'no-store' },
  });
}
