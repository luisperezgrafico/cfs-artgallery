import { NextRequest, NextResponse } from 'next/server';
import { memoryStore, usingMemoryStore } from '../../../../lib/blobStore';
import type { Submission } from '../../../../lib/storage';
import type { ImageMetadata } from '../../../../types/museum';

export const dynamic = 'force-dynamic';

/**
 * Test-only fixture control. Returns 404 unless GALLERY_STORAGE=memory, so it
 * cannot exist in a production deployment even by accident.
 *
 * POST body: { submissions?: Submission[], artworks?: Record<roomId, ImageMetadata[]> }
 */
export async function POST(request: NextRequest) {
  if (!usingMemoryStore) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as {
    submissions?: Submission[];
    artworks?: Record<string, ImageMetadata[]>;
  };

  memoryStore.reset();

  if (body.submissions) {
    await memoryStore.writeJson('gallery/data/submissions.json', body.submissions);
  }
  for (const [roomId, list] of Object.entries(body.artworks ?? {})) {
    await memoryStore.writeJson(`gallery/data/artworks-${roomId}.json`, list);
  }

  return NextResponse.json({ ok: true });
}
