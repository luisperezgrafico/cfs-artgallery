import { BenchDesign, benchDesignForKey } from './benchDesign';

/**
 * Previewing a prototype bench.
 *
 *   /?room=room-4&bench=room-4-alt-a   — Room IV with the sled prototype
 *
 * The parameter is the whole mechanism, and deliberately so: no menu entry, no
 * toggle, no state anywhere. A visit with no `bench` param — which is every
 * visit a real visitor makes — resolves to nothing here and the room draws its
 * own bench, exactly as before. An unknown value is ignored for the same reason
 * a typo should never break a room.
 *
 * Only the design id is read from the URL; the room still comes from the tour
 * (`?room=`, the visitor's saved position, or the menu), so a preview can be
 * judged in the room it was designed for.
 */
export const BENCH_PREVIEW_PARAM = 'bench';

/** The design key the URL asks for, or null when there is nothing to preview. */
export function benchPreviewKey(search?: string | null): string | null {
  if (!search) return null;
  const key = new URLSearchParams(search).get(BENCH_PREVIEW_PARAM)?.trim();
  if (!key) return null;
  return benchDesignForKey(key) ? key : null;
}

/** The prototype the URL asks for, or null on an ordinary visit. */
export function benchPreviewDesign(search?: string | null): BenchDesign | null {
  return benchDesignForKey(benchPreviewKey(search));
}
