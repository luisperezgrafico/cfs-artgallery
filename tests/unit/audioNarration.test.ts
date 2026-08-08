import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildNarrationText, generateArtworkAudio } from '../../lib/audioNarration';
import { memoryStore } from '../../lib/blobStore';
import type { Submission } from '../../lib/storage';

function submission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: 'piece-a',
    title: 'Quiet Window',
    artist: 'Ada',
    email: 'ada@example.test',
    medium: 'Watercolour',
    year: '2026',
    shortDescription: 'A short note.',
    statement: 'The longer artist statement.',
    imageUrl: 'https://example.test/image.png',
    aspectRatio: 1,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    ...overrides,
  };
}

beforeEach(() => {
  memoryStore.reset();
  vi.unstubAllGlobals();
  delete process.env.TTS_BASE_URL;
  delete process.env.TTS_API_KEY;
  delete process.env.TTS_MODEL;
  delete process.env.TTS_VOICE;
  delete process.env.TTS_FORMAT;
  delete process.env.OPENAI_API_KEY;
});

describe('buildNarrationText', () => {
  it('combines artwork metadata with the short and long descriptions', () => {
    expect(buildNarrationText(submission())).toBe(
      'Quiet Window, by Ada, 2026, Watercolour.\n\nA short note.\n\nThe longer artist statement.',
    );
  });

  it('returns an empty string when there is no description to narrate', () => {
    expect(buildNarrationText(submission({ shortDescription: '', statement: '' }))).toBe('');
  });
});

describe('generateArtworkAudio', () => {
  it('does nothing when no TTS backend is configured', async () => {
    vi.stubGlobal('fetch', vi.fn());

    expect(await generateArtworkAudio(submission())).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls an OpenAI-compatible speech endpoint and stores the returned audio', async () => {
    process.env.TTS_BASE_URL = 'http://localhost:8880/v1';
    process.env.TTS_API_KEY = 'local-key';
    process.env.TTS_MODEL = 'kokoro';
    process.env.TTS_VOICE = 'af_sky';
    process.env.TTS_FORMAT = 'mp3';

    const fetchMock = vi.fn(async () => new Response(
      new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }),
      { status: 200, headers: { 'content-type': 'audio/mpeg' } },
    ));
    vi.stubGlobal('fetch', fetchMock);

    const audio = await generateArtworkAudio(submission());

    expect(audio?.url).toMatch(/^\/api\/testing\/blob\/gallery\/audio\/piece-a-\d+\.mp3$/);
    expect(audio?.voice).toBe('af_sky');
    const pathname = audio!.url.replace('/api/testing/blob/', '');
    expect(memoryStore.getFile(pathname)?.contentType).toBe('audio/mpeg');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8880/v1/audio/speech', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer local-key',
        'Content-Type': 'application/json',
      }),
    }));
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const [, options] = calls[0];
    expect(JSON.parse(options.body as string)).toEqual({
      model: 'kokoro',
      voice: 'af_sky',
      input: 'Quiet Window, by Ada, 2026, Watercolour.\n\nA short note.\n\nThe longer artist statement.',
      response_format: 'mp3',
    });
  });
});
