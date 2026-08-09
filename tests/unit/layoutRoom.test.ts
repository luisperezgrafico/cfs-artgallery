import { describe, it, expect } from 'vitest';
import { layoutRoom, findNextRealIndex } from '../../utils/roomLayout';
import type { ImageMetadata } from '../../types/museum';

function art(id: string, slot?: number): ImageMetadata {
  return { id, url: `https://example.test/${id}.png`, title: id, artist: 'A', date: '2026', link: '', slot };
}

const idsOf = (list: ImageMetadata[]) => list.map(a => (a.isEmpty ? null : a.id));

describe('layoutRoom', () => {
  it('pads an empty room to eight submit canvases', () => {
    const laid = layoutRoom([]);
    expect(laid).toHaveLength(8);
    expect(laid.every(a => a.isEmpty)).toBe(true);
  });

  it('hangs an artwork on the canvas the artist submitted through', () => {
    // The whole point: the artist tapped slot 5, so the piece goes to slot 5 —
    // not to the first free wall.
    expect(idsOf(layoutRoom([art('a', 5)]))).toEqual([null, null, null, null, null, 'a', null, null]);
  });

  it('fills artworks without a slot in order, around the reserved ones', () => {
    const laid = layoutRoom([art('free1'), art('pinned', 1), art('free2')]);
    expect(idsOf(laid)).toEqual(['free1', 'pinned', 'free2', null, null, null, null, null]);
  });

  it('falls back to a free wall when two artworks want the same slot', () => {
    const laid = layoutRoom([art('first', 3), art('second', 3)]);
    expect(idsOf(laid)[3]).toBe('first');
    expect(idsOf(laid)).toContain('second');
    expect(laid.filter(a => !a.isEmpty)).toHaveLength(2);
  });

  it('ignores a slot outside the room', () => {
    const laid = layoutRoom([art('a', 99)]);
    expect(idsOf(laid)[0]).toBe('a');
  });

  it('leaves a full room untouched', () => {
    const full = Array.from({ length: 8 }, (_, i) => art(`a${i}`));
    expect(layoutRoom(full)).toEqual(full);
  });
});

describe('findNextRealIndex', () => {
  it('skips trailing empty submit canvases', () => {
    const laid = layoutRoom([art('a'), art('b')]); // slots 2-7 empty
    expect(findNextRealIndex(laid, 0)).toBe(1);
    expect(findNextRealIndex(laid, 1)).toBe(-1);
  });

  it('jumps over a gap in the middle, left by a pinned slot', () => {
    // Pinned to slot 5, only two free artworks — leaves slots 2-4 empty in the middle.
    const laid = layoutRoom([art('free1'), art('free2'), art('pinned', 5)]);
    expect(idsOf(laid)).toEqual(['free1', 'free2', null, null, null, 'pinned', null, null]);
    expect(findNextRealIndex(laid, 1)).toBe(5);
  });

  it('returns -1 when every remaining slot is empty', () => {
    const laid = layoutRoom([]);
    expect(findNextRealIndex(laid, -1)).toBe(-1);
  });
});
