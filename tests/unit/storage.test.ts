import { describe, it, expect, beforeEach } from 'vitest';
import { memoryStore } from '../../lib/blobStore';
import {
  saveSubmission,
  getPendingSubmissions,
  getSubmission,
  claimSubmission,
  releaseSubmission,
  addArtworkToRoom,
  removeArtworkFromRoom,
  getRoomArtworks,
  getPublishingSubmissions,
  updateManagedArtwork,
  updateArtworkAudio,
  clearArtworkAudio,
  resetRoomArtworksToSeed,
  getSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  DEFAULT_ELEVENLABS_VOICE_ID,
  type Submission,
} from '../../lib/storage';
import type { ImageMetadata } from '../../types/museum';

function submission(id: string, overrides: Partial<Submission> = {}): Submission {
  return {
    id,
    title: `Piece ${id}`,
    artist: 'Artist',
    email: 'artist@example.com',
    medium: 'Watercolour',
    year: '2026',
    shortDescription: '',
    statement: '',
    imageUrl: `https://example.test/${id}.png`,
    aspectRatio: 1,
    submittedAt: new Date().toISOString(),
    status: 'pending',
    ...overrides,
  };
}

function artwork(id: string): ImageMetadata {
  return { id, url: `https://example.test/${id}.png`, title: `Piece ${id}`, artist: 'Artist', date: '2026', link: '' };
}

beforeEach(() => memoryStore.reset());

describe('submissions', () => {
  it('saves a submission and lists it as pending', async () => {
    await saveSubmission(submission('a'));
    const pending = await getPendingSubmissions();
    expect(pending.map(s => s.id)).toEqual(['a']);
  });

  it('leaves processed submissions out of the pending list', async () => {
    await saveSubmission(submission('a'));
    await saveSubmission(submission('b', { status: 'approved' }));
    const pending = await getPendingSubmissions();
    expect(pending.map(s => s.id)).toEqual(['a']);
  });

  it('does not lose a submission that arrives during another write', async () => {
    // Both calls read-modify-write the same JSON file. Without serialization the
    // second read starts before the first write lands and one submission is lost.
    await Promise.all([
      saveSubmission(submission('a')),
      saveSubmission(submission('b')),
      saveSubmission(submission('c')),
    ]);
    const pending = await getPendingSubmissions();
    expect(pending.map(s => s.id).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('claimSubmission', () => {
  it('returns the submission the first time and null afterwards', async () => {
    await saveSubmission(submission('a'));

    const first = await claimSubmission('a', 'approved');
    expect(first?.id).toBe('a');

    const second = await claimSubmission('a', 'approved');
    expect(second).toBeNull();
  });

  it('lets exactly one of two concurrent claims win', async () => {
    await saveSubmission(submission('a'));
    const results = await Promise.all([
      claimSubmission('a', 'approved'),
      claimSubmission('a', 'approved'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('returns null for an unknown id', async () => {
    expect(await claimSubmission('nope', 'approved')).toBeNull();
  });

  it('marks the stored status so the card leaves the queue', async () => {
    await saveSubmission(submission('a'));
    await claimSubmission('a', 'rejected');
    expect((await getSubmission('a'))?.status).toBe('rejected');
    expect(await getPendingSubmissions()).toHaveLength(0);
  });

  it('can be undone by releaseSubmission', async () => {
    await saveSubmission(submission('a'));
    await claimSubmission('a', 'approved');
    await releaseSubmission('a');
    expect((await getPendingSubmissions()).map(s => s.id)).toEqual(['a']);
  });
});

describe('room artworks', () => {
  it('appends artworks in order', async () => {
    await addArtworkToRoom('room-1', artwork('a'));
    await addArtworkToRoom('room-1', artwork('b'));
    expect((await getRoomArtworks('room-1'))?.map(a => a.id)).toEqual(['a', 'b']);
  });

  it('ignores a repeated add of the same artwork', async () => {
    await addArtworkToRoom('room-1', artwork('a'));
    await addArtworkToRoom('room-1', artwork('a'));
    expect(await getRoomArtworks('room-1')).toHaveLength(1);
  });

  it('removes the artwork with the given id, not a position', async () => {
    await addArtworkToRoom('room-1', artwork('a'));
    await addArtworkToRoom('room-1', artwork('b'));
    await addArtworkToRoom('room-1', artwork('c'));

    expect(await removeArtworkFromRoom('room-1', 'b')).toBe(true);
    expect((await getRoomArtworks('room-1'))?.map(a => a.id)).toEqual(['a', 'c']);
  });

  it('falls back to the url for artworks approved before ids existed', async () => {
    const legacy: ImageMetadata = { url: 'https://example.test/legacy.png', title: 'Legacy', artist: 'A', date: '2020', link: '' };
    await addArtworkToRoom('room-1', legacy);
    expect(await removeArtworkFromRoom('room-1', 'https://example.test/legacy.png')).toBe(true);
    expect(await getRoomArtworks('room-1')).toEqual([]);
  });

  it('reports false when nothing matched', async () => {
    await addArtworkToRoom('room-1', artwork('a'));
    expect(await removeArtworkFromRoom('room-1', 'ghost')).toBe(false);
    expect(await getRoomArtworks('room-1')).toHaveLength(1);
  });

  it('keeps both artworks when two are added at once', async () => {
    await Promise.all([
      addArtworkToRoom('room-1', artwork('a')),
      addArtworkToRoom('room-1', artwork('b')),
    ]);
    expect((await getRoomArtworks('room-1'))?.map(a => a.id).sort()).toEqual(['a', 'b']);
  });
});

describe('preferred slot', () => {
  it('keeps the slot the artist submitted through', async () => {
    await addArtworkToRoom('room-1', { ...artwork('a'), slot: 4 });
    expect((await getRoomArtworks('room-1'))?.[0].slot).toBe(4);
  });

  it('drops the slot when it is already taken, rather than displacing a piece', async () => {
    await addArtworkToRoom('room-1', { ...artwork('a'), slot: 2 });
    await addArtworkToRoom('room-1', { ...artwork('b'), slot: 2 });

    const list = await getRoomArtworks('room-1');
    expect(list?.find(a => a.id === 'a')?.slot).toBe(2);
    expect(list?.find(a => a.id === 'b')?.slot).toBeUndefined();
  });
});

describe('managed artworks', () => {
  it('updates editable artwork fields in place', async () => {
    await addArtworkToRoom('room-1', artwork('a'));

    const result = await updateManagedArtwork('room-1', 'a', {
      targetRoomId: 'room-1',
      slot: 3,
      fields: { title: 'Edited', shortDescription: 'New note', contentNotes: ['dark-imagery', 'loss'] },
    });

    expect(result?.artwork.title).toBe('Edited');
    expect(result?.artwork.shortDescription).toBe('New note');
    expect(result?.artwork.contentNotes).toEqual(['dark-imagery', 'loss']);
    expect(result?.artwork.slot).toBe(3);
    expect((await getRoomArtworks('room-1'))?.map(a => a.title)).toEqual(['Edited']);
  });

  it('moves an artwork to another room and slot', async () => {
    await addArtworkToRoom('room-1', artwork('a'));

    const result = await updateManagedArtwork('room-1', 'a', {
      targetRoomId: 'room-2',
      slot: 5,
      fields: {},
    });

    expect(result?.previousRoomId).toBe('room-1');
    expect(result?.roomId).toBe('room-2');
    expect(await getRoomArtworks('room-1')).toEqual([]);
    expect((await getRoomArtworks('room-2'))?.[0]).toMatchObject({ id: 'a', slot: 5 });
  });

  it('refuses to move into an occupied slot', async () => {
    await addArtworkToRoom('room-1', artwork('a'));
    await addArtworkToRoom('room-2', { ...artwork('b'), slot: 2 });

    await expect(updateManagedArtwork('room-1', 'a', {
      targetRoomId: 'room-2',
      slot: 2,
      fields: {},
    })).rejects.toThrow('Slot 3 is already occupied');

    expect((await getRoomArtworks('room-1'))?.map(a => a.id)).toEqual(['a']);
    expect((await getRoomArtworks('room-2'))?.map(a => a.id)).toEqual(['b']);
  });

  it('updates generated audio metadata without changing the rest of the artwork', async () => {
    await addArtworkToRoom('room-1', artwork('a'));

    const updated = await updateArtworkAudio('room-1', 'a', {
      audioUrl: 'https://example.test/audio.mp3',
      audioGeneratedAt: '2026-08-08T12:00:00.000Z',
      audioVoice: 'coral',
      audioSource: 'generated',
      audioTextSignature: 'sig-a',
    });

    expect(updated).toMatchObject({ id: 'a', audioVoice: 'coral', audioSource: 'generated' });
    expect((await getRoomArtworks('room-1'))?.[0].audioUrl).toBe('https://example.test/audio.mp3');
  });

  it('removes audio metadata without changing the rest of the artwork', async () => {
    await addArtworkToRoom('room-1', {
      ...artwork('a'),
      audioUrl: 'https://example.test/audio.mp3',
      audioGeneratedAt: '2026-08-08T12:00:00.000Z',
      audioVoice: 'coral',
      audioSource: 'generated',
      audioTextSignature: 'sig-a',
    });

    const updated = await clearArtworkAudio('room-1', 'a');

    expect(updated).toMatchObject({ id: 'a', title: 'Piece a' });
    expect(updated?.audioUrl).toBeUndefined();
    expect((await getRoomArtworks('room-1'))?.[0].audioUrl).toBeUndefined();
  });
});

describe('approved artwork seed', () => {
  it('can reset Room I to the built-in template artworks', async () => {
    await addArtworkToRoom('room-1', artwork('custom'));

    const reset = await resetRoomArtworksToSeed('room-1');

    expect(reset.map(a => a.id)).toContain('static-lux-perpetua');
    expect((await getRoomArtworks('room-1'))?.map(a => a.id)).toEqual(reset.map(a => a.id));
    expect((await getRoomArtworks('room-1'))?.map(a => a.id)).not.toContain('custom');
  });

  it('hydrates stored static artworks with the current template metadata', async () => {
    await addArtworkToRoom('room-1', {
      ...artwork('static-lux-perpetua'),
      artist: 'Artist Placeholder',
      longDescription: 'Lorem ipsum',
      slot: 0,
      audioUrl: 'https://example.test/audio.mp3',
      audioGeneratedAt: '2026-08-08T12:00:00.000Z',
      audioVoice: 'old-voice',
      audioSource: 'generated',
      audioTextSignature: 'sig-a',
    });

    const stored = (await getRoomArtworks('room-1'))?.find(a => a.id === 'static-lux-perpetua');

    expect(stored).toMatchObject({
      title: 'Lux Perpetua',
      artist: 'Mira Solenne',
      slot: 0,
      audioUrl: 'https://example.test/audio.mp3',
    });
    expect(stored?.longDescription).not.toBe('Lorem ipsum');
  });
});

describe('settings', () => {
  it('fills a missing ElevenLabs voice id with the default voice', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      audioSettings: {
        ...DEFAULT_SETTINGS.audioSettings,
        elevenlabs: {
          ...DEFAULT_SETTINGS.audioSettings.elevenlabs,
          voiceId: '',
        },
      },
    });

    expect((await getSettings()).audioSettings.elevenlabs.voiceId).toBe(DEFAULT_ELEVENLABS_VOICE_ID);
  });
});

describe('getPublishingSubmissions', () => {
  it('reports an approved submission whose artwork a read cannot see yet', async () => {
    await saveSubmission(submission('a'));
    await claimSubmission('a', 'approved', { approvedRoom: 'room-1' });
    // Deliberately not added to the room: this is the eventual-consistency gap.
    const publishing = await getPublishingSubmissions({ 'room-1': [] });
    expect(publishing.map(s => s.id)).toEqual(['a']);
  });

  it('stops reporting it once the artwork is readable', async () => {
    await saveSubmission(submission('a'));
    await claimSubmission('a', 'approved', { approvedRoom: 'room-1' });
    const publishing = await getPublishingSubmissions({ 'room-1': [artwork('a')] });
    expect(publishing).toEqual([]);
  });

  it('ignores pending and rejected submissions', async () => {
    await saveSubmission(submission('pending'));
    await saveSubmission(submission('rejected'));
    await claimSubmission('rejected', 'rejected');
    expect(await getPublishingSubmissions({})).toEqual([]);
  });

  it('lets an old approval fall out of the window instead of waiting forever', async () => {
    // An artwork approved long ago and since deleted is also absent from every
    // room; without the window it would be reported as publishing forever.
    const anHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
    await saveSubmission(submission('a', { status: 'approved', moderatedAt: anHourAgo }));
    expect(await getPublishingSubmissions({})).toEqual([]);
  });

  it('ignores approvals from before moderatedAt was recorded', async () => {
    await saveSubmission(submission('legacy', { status: 'approved' }));
    expect(await getPublishingSubmissions({})).toEqual([]);
  });
});
