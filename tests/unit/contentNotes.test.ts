import { describe, expect, it } from 'vitest';
import { normalizeContentNotes } from '../../config/contentNotes';

describe('normalizeContentNotes', () => {
  it('keeps only known content notes', () => {
    expect(normalizeContentNotes(['dark-imagery', 'unknown', 'loss'])).toEqual(['dark-imagery', 'loss']);
  });

  it('deduplicates while preserving the first occurrence order', () => {
    expect(normalizeContentNotes(['loss', 'dark-imagery', 'loss'])).toEqual(['loss', 'dark-imagery']);
  });

  it('ignores malformed input', () => {
    expect(normalizeContentNotes(null)).toEqual([]);
    expect(normalizeContentNotes('dark-imagery')).toEqual([]);
    expect(normalizeContentNotes(['dark-imagery', 123, null])).toEqual(['dark-imagery']);
  });
});
