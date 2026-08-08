import { describe, it, expect } from 'vitest';
import { adminReducer, initialAdminState, hasArtworks, type AdminState } from '../../app/admin/adminState';
import type { Submission } from '../../lib/storage';
import type { ImageMetadata } from '../../types/museum';

function submission(id: string): Submission {
  return {
    id,
    title: `Piece ${id}`,
    artist: 'Artist',
    email: 'artist@example.com',
    medium: '',
    year: '2026',
    shortDescription: '',
    statement: '',
    imageUrl: `https://example.test/${id}.png`,
    aspectRatio: 1,
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };
}

function artwork(id: string): ImageMetadata {
  return { id, url: `https://example.test/${id}.png`, title: `Piece ${id}`, artist: 'Artist', date: '2026', link: '' };
}

/** Runs a sequence of actions from the initial state. */
function reduce(...actions: Parameters<typeof adminReducer>[1][]): AdminState {
  return actions.reduce(adminReducer, initialAdminState);
}

const loadedWith = (submissions: Submission[], artworks: Record<string, ImageMetadata[]>) =>
  ({ type: 'loadSuccess', submissions, artworks }) as const;

describe('loading', () => {
  it('clears the spinner and shows what the server returned', () => {
    const state = reduce(loadedWith([submission('a')], { 'room-1': [artwork('x')] }));
    expect(state.loading).toBe(false);
    expect(state.submissions.map(s => s.id)).toEqual(['a']);
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['x']);
  });

  it('surfaces a load failure', () => {
    const state = reduce({ type: 'loadFailure', message: 'Error 500' });
    expect(state).toMatchObject({ loading: false, loadError: 'Error 500' });
  });
});

describe('approving', () => {
  it('moves the submission out of the queue and into the room', () => {
    const state = reduce(
      loadedWith([submission('a'), submission('b')], { 'room-1': [] }),
      { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') },
    );
    expect(state.submissions.map(s => s.id)).toEqual(['b']);
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['a']);
  });

  it('does not add the artwork twice if the action repeats', () => {
    const approve = { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') } as const;
    const state = reduce(loadedWith([submission('a')], { 'room-1': [] }), approve, approve);
    expect(state.artworks['room-1']).toHaveLength(1);
  });

  it('reports a failure without touching the lists', () => {
    const state = reduce(
      loadedWith([submission('a')], {}),
      { type: 'approveStart', submissionId: 'a' },
      { type: 'approveFailure', message: 'Approval failed.' },
    );
    expect(state.submissions.map(s => s.id)).toEqual(['a']);
    expect(state.actionError).toBe('Approval failed.');
    expect(state.busySubmissionId).toBeNull();
  });
});

describe('rejecting', () => {
  it('removes the card from the queue', () => {
    const state = reduce(
      loadedWith([submission('a'), submission('b')], {}),
      { type: 'rejectSuccess', submissionId: 'a' },
    );
    expect(state.submissions.map(s => s.id)).toEqual(['b']);
  });
});

describe('stale reads never undo a moderation', () => {
  // This is the regression that made approved cards come back: the panel used to
  // drop its local result and re-read a Blob snapshot taken before the write.

  it('keeps an approved submission out of the queue when a later load still lists it', () => {
    const state = reduce(
      loadedWith([submission('a')], { 'room-1': [] }),
      { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') },
      // Stale read: the server still thinks 'a' is pending.
      loadedWith([submission('a')], { 'room-1': [] }),
    );
    expect(state.submissions).toEqual([]);
  });

  it('keeps a rejected submission out of the queue on a stale read', () => {
    const state = reduce(
      loadedWith([submission('a')], {}),
      { type: 'rejectSuccess', submissionId: 'a' },
      loadedWith([submission('a')], {}),
    );
    expect(state.submissions).toEqual([]);
  });

  it('keeps a freshly approved artwork that a stale read has not caught up with', () => {
    const state = reduce(
      loadedWith([submission('a')], { 'room-1': [] }),
      { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') },
      loadedWith([], { 'room-1': [] }),
    );
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['a']);
  });

  it('does not resurrect a deleted artwork that a stale read still returns', () => {
    const state = reduce(
      loadedWith([], { 'room-1': [artwork('x'), artwork('y')] }),
      { type: 'removeStart', roomId: 'room-1', artworkId: 'x' },
      { type: 'removeSuccess' },
      loadedWith([], { 'room-1': [artwork('x'), artwork('y')] }),
    );
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['y']);
  });

  it('accepts artworks added by someone else in a later load', () => {
    const state = reduce(
      loadedWith([], { 'room-1': [artwork('x')] }),
      loadedWith([], { 'room-1': [artwork('x'), artwork('z')] }),
    );
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['x', 'z']);
  });
});

describe('deleting', () => {
  it('removes the row immediately, before the server answers', () => {
    const state = reduce(
      loadedWith([], { 'room-1': [artwork('x'), artwork('y')] }),
      { type: 'removeStart', roomId: 'room-1', artworkId: 'x' },
    );
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['y']);
    expect(state.busyArtworkId).toBe('x');
  });

  it('removes by identity, so the right artwork goes even from the middle', () => {
    const state = reduce(
      loadedWith([], { 'room-1': [artwork('x'), artwork('y'), artwork('z')] }),
      { type: 'removeStart', roomId: 'room-1', artworkId: 'y' },
    );
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['x', 'z']);
  });

  it('rolls the row back and explains why when the delete fails', () => {
    const snapshot = [artwork('x'), artwork('y')];
    const state = reduce(
      loadedWith([], { 'room-1': snapshot }),
      { type: 'removeStart', roomId: 'room-1', artworkId: 'x' },
      { type: 'removeFailure', roomId: 'room-1', artworkId: 'x', snapshot, message: 'Failed to remove artwork.' },
    );
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['x', 'y']);
    expect(state.actionError).toBe('Failed to remove artwork.');
    expect(state.busyArtworkId).toBeNull();
  });

  it('lets a rolled-back artwork come back on the next load', () => {
    const snapshot = [artwork('x')];
    const state = reduce(
      loadedWith([], { 'room-1': snapshot }),
      { type: 'removeStart', roomId: 'room-1', artworkId: 'x' },
      { type: 'removeFailure', roomId: 'room-1', artworkId: 'x', snapshot, message: 'nope' },
      loadedWith([], { 'room-1': [artwork('x')] }),
    );
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['x']);
  });

  it('allows re-approving an artwork that was deleted earlier', () => {
    const state = reduce(
      loadedWith([submission('a')], { 'room-1': [artwork('a')] }),
      { type: 'removeStart', roomId: 'room-1', artworkId: 'a' },
      { type: 'removeSuccess' },
      { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') },
      loadedWith([], { 'room-1': [artwork('a')] }),
    );
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['a']);
  });
});

describe('updating approved artworks', () => {
  it('updates an artwork in place', () => {
    const state = reduce(
      loadedWith([], { 'room-1': [artwork('x'), artwork('y')] }),
      { type: 'artworkUpdateSuccess', previousRoomId: 'room-1', roomId: 'room-1', artwork: { ...artwork('x'), title: 'Edited' } },
    );
    expect(state.artworks['room-1'].map(a => a.title)).toEqual(['Edited', 'Piece y']);
  });

  it('moves an artwork between rooms', () => {
    const state = reduce(
      loadedWith([], { 'room-1': [artwork('x')], 'room-2': [artwork('y')] }),
      { type: 'artworkUpdateSuccess', previousRoomId: 'room-1', roomId: 'room-2', artwork: { ...artwork('x'), slot: 4 } },
    );
    expect(state.artworks['room-1']).toEqual([]);
    expect(state.artworks['room-2'].map(a => a.id)).toEqual(['y', 'x']);
    expect(state.artworks['room-2'][1].slot).toBe(4);
  });
});

describe('hasArtworks', () => {
  it('is false for empty rooms and true once one has a piece', () => {
    expect(hasArtworks({ 'room-1': [], 'room-2': [] })).toBe(false);
    expect(hasArtworks({ 'room-1': [], 'room-2': [artwork('x')] })).toBe(true);
  });
});

describe('the publishing gap', () => {
  // Right after an approval the piece is in neither list — gone from the queue,
  // not yet readable in the room. It must be visibly *somewhere*.

  it('flags a fresh approval as still publishing', () => {
    const state = reduce(
      loadedWith([submission('a')], { 'room-1': [] }),
      { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') },
    );
    expect(state.publishingArtworkIds).toEqual(['a']);
  });

  it('keeps the flag while the server read still cannot see it', () => {
    const state = reduce(
      loadedWith([submission('a')], { 'room-1': [] }),
      { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') },
      loadedWith([], { 'room-1': [] }),
    );
    expect(state.publishingArtworkIds).toEqual(['a']);
    // …and the row is still on screen while it waits.
    expect(state.artworks['room-1'].map(a => a.id)).toEqual(['a']);
  });

  it('clears the flag as soon as the server read confirms it', () => {
    const state = reduce(
      loadedWith([submission('a')], { 'room-1': [] }),
      { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') },
      loadedWith([], { 'room-1': [artwork('a')] }),
    );
    expect(state.publishingArtworkIds).toEqual([]);
    expect(state.publishingSubmissions).toEqual([]);
  });

  it('adopts the server’s own report after a reload, with a row to show', () => {
    // Fresh page: no local memory of the approval, and the artwork is in no room.
    const state = reduce({
      type: 'loadSuccess',
      submissions: [],
      artworks: { 'room-1': [] },
      publishing: [submission('a')],
    });
    expect(state.publishingArtworkIds).toEqual(['a']);
    expect(state.publishingSubmissions.map(s => s.id)).toEqual(['a']);
  });

  it('does not duplicate a placeholder for a piece that already has a row', () => {
    const state = reduce(
      loadedWith([submission('a')], { 'room-1': [] }),
      { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') },
      { type: 'loadSuccess', submissions: [], artworks: { 'room-1': [] }, publishing: [submission('a')] },
    );
    expect(state.publishingArtworkIds).toEqual(['a']);
    expect(state.publishingSubmissions).toEqual([]);
  });

  it('stops calling a deleted artwork publishing', () => {
    const state = reduce(
      loadedWith([submission('a')], { 'room-1': [] }),
      { type: 'approveSuccess', submissionId: 'a', roomId: 'room-1', artwork: artwork('a') },
      { type: 'removeStart', roomId: 'room-1', artworkId: 'a' },
      { type: 'removeSuccess' },
      { type: 'loadSuccess', submissions: [], artworks: { 'room-1': [] }, publishing: [submission('a')] },
    );
    expect(state.publishingArtworkIds).toEqual([]);
    expect(state.publishingSubmissions).toEqual([]);
  });
});
