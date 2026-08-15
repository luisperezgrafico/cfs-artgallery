import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { memoryStore } from '../../lib/blobStore';
import { getSettings } from '../../lib/storage';
import { POST } from '../../app/api/admin/settings/ambient-music/route';

function upload(file: File): Promise<Response> {
  const form = new FormData();
  form.set('file', file);
  return POST(new NextRequest('http://test.local/api/admin/settings/ambient-music', {
    method: 'POST',
    body: form,
  }));
}

describe('ambient music upload route', () => {
  beforeEach(() => memoryStore.reset());

  it('stores an uploaded audio file and makes it the current track', async () => {
    const file = new File(['calm'], 'quiet-loop.mp3', { type: 'audio/mpeg' });

    const response = await upload(file);
    const body = await response.json() as { ambientMusic?: { title: string; sourceUrl: string } };

    expect(response.ok).toBe(true);
    expect(body.ambientMusic).toEqual({
      title: 'quiet-loop.mp3',
      sourceUrl: expect.stringMatching(/^\/api\/testing\/blob\/gallery\/ambient\//),
    });
    expect((await getSettings()).ambientMusic).toEqual(body.ambientMusic);
  });

  it('rejects non-audio uploads', async () => {
    const response = await upload(new File(['not audio'], 'notes.txt', { type: 'text/plain' }));

    expect(response.status).toBe(400);
    expect((await response.json() as { error: string }).error).toContain('MP3');
  });
});
