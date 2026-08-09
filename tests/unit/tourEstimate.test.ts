import { describe, expect, it } from 'vitest';
import { estimateRoomSeconds, formatEstimate } from '../../utils/tourEstimate';
import type { ImageMetadata } from '../../types/museum';

function art(overrides: Partial<ImageMetadata> = {}): ImageMetadata {
  return {
    url: 'https://example.test/a.png', title: 'A', artist: 'Artist', date: '2026', link: '',
    ...overrides,
  };
}

describe('estimateRoomSeconds', () => {
  it('is zero for a room with no artworks', () => {
    expect(estimateRoomSeconds([art({ isEmpty: true })], { narrated: true, dwellSeconds: 20 })).toBe(0);
  });

  it('ignores empty submit-canvas slots', () => {
    const withEmpty = estimateRoomSeconds(
      [art(), art({ isEmpty: true })],
      { narrated: false, dwellSeconds: 20 },
    );
    const withoutEmpty = estimateRoomSeconds([art()], { narrated: false, dwellSeconds: 20 });
    expect(withEmpty).toBe(withoutEmpty);
  });

  it('uses the dwell timer per artwork when not narrated', () => {
    const seconds = estimateRoomSeconds([art(), art()], { narrated: false, dwellSeconds: 10 });
    // 2 artworks * (10s dwell + 3s transition)
    expect(seconds).toBe(26);
  });

  it('prefers a measured audioDurationSec over the word-count fallback', () => {
    const seconds = estimateRoomSeconds(
      [art({ audioDurationSec: 45, shortDescription: 'irrelevant text that would estimate differently' })],
      { narrated: true, dwellSeconds: 20 },
    );
    expect(seconds).toBe(48); // 45s audio + 3s transition
  });

  it('never drops below half the dwell time, even with no description at all', () => {
    const seconds = estimateRoomSeconds([art()], { narrated: true, dwellSeconds: 20 });
    expect(seconds).toBe(13); // floor of dwellSeconds/2 (10s) + 3s transition
  });

  it('grows with a longer narration text, once past the floor', () => {
    const longBody = Array(60).fill('word').join(' ');
    const short = estimateRoomSeconds([art({ shortDescription: 'a short line' })], { narrated: true, dwellSeconds: 20 });
    const long = estimateRoomSeconds([art({ shortDescription: longBody })], { narrated: true, dwellSeconds: 20 });
    expect(long).toBeGreaterThan(short);
  });
});

describe('formatEstimate', () => {
  it('rounds to whole minutes, minimum one', () => {
    expect(formatEstimate(45)).toBe('about 1 min');
    expect(formatEstimate(0)).toBe('a moment');
    expect(formatEstimate(605)).toBe('about 10 min');
  });
});
