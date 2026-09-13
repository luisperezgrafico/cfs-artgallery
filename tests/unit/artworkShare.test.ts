import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ImageMetadata } from '../../types/museum';
import {
  artworkShare,
  browserShareEnvironment,
  isShareCancellation,
  shareArtworkLink,
  shareOutcomeIsVisible,
  shareOutcomeMessage,
  type ShareEnvironment,
  type ShareLink,
} from '../../utils/artworkShare';

const artwork: ImageMetadata = {
  id: 'static-silva-quieta',
  url: '/art/placeholder-thicket.svg',
  title: 'Silva Quieta',
  artist: 'Elena Marlow',
  date: '2024',
  link: '#',
  aspectRatio: 700 / 910,
};

const link: ShareLink = {
  url: 'http://localhost:3002/?room=room-1&art=static-silva-quieta',
  title: artwork.title,
  text: 'Silva Quieta — Elena Marlow, in the ME/CFS Community Gallery',
};

/** A share sheet that takes everything it is handed. */
const nativeSheet = (share = vi.fn(async () => {})): ShareEnvironment => ({ share });

/** A clipboard that accepts the write. */
const clipboard = (writeText = vi.fn(async () => {})): ShareEnvironment => ({ writeText });

const abortError = () => Object.assign(new Error('Share canceled'), { name: 'AbortError' });

describe('shareArtworkLink: the route it picks', () => {
  it('uses the native share sheet where there is one', async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    expect(await shareArtworkLink(link, { share, writeText })).toEqual({ kind: 'shared' });

    // The sheet is handed the whole thing, not just the URL: a phone's share
    // target should not have to fetch the page to know what it is sending.
    expect(share).toHaveBeenCalledWith({ title: link.title, text: link.text, url: link.url });
    // And nothing is copied behind the visitor's back.
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies to the clipboard on a browser without navigator.share', async () => {
    const writeText = vi.fn(async () => {});
    expect(await shareArtworkLink(link, clipboard(writeText))).toEqual({ kind: 'copied' });
    expect(writeText).toHaveBeenCalledWith(link.url);
  });

  it('treats a dismissed sheet as cancelled — and does not copy instead', async () => {
    const writeText = vi.fn(async () => {});
    const env: ShareEnvironment = {
      share: vi.fn(async () => { throw abortError(); }),
      writeText,
    };

    expect(await shareArtworkLink(link, env)).toEqual({ kind: 'cancelled' });
    // Dismissing is a decision: the clipboard would be doing what they declined.
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls through to the clipboard when the sheet could not open at all', async () => {
    const writeText = vi.fn(async () => {});
    const env: ShareEnvironment = {
      share: vi.fn(async () => { throw new TypeError('NotAllowedError: no transient activation'); }),
      writeText,
    };

    expect(await shareArtworkLink(link, env)).toEqual({ kind: 'copied' });
    expect(writeText).toHaveBeenCalledWith(link.url);
  });

  it('hands the link back when the clipboard refuses', async () => {
    const env: ShareEnvironment = {
      share: vi.fn(async () => { throw new Error('no share target'); }),
      writeText: vi.fn(async () => { throw new DOMException('Write permission denied', 'NotAllowedError'); }),
    };

    // Never silent: the outcome carries the URL the visitor can copy by hand.
    expect(await shareArtworkLink(link, env)).toEqual({ kind: 'manual', url: link.url });
  });

  it('hands the link back when there is neither a sheet nor a clipboard', async () => {
    // An insecure context: `navigator.clipboard` simply is not there.
    expect(await shareArtworkLink(link, {})).toEqual({ kind: 'manual', url: link.url });
  });
});

describe('isShareCancellation', () => {
  it('recognises the dismissal a share sheet reports, and nothing else', () => {
    expect(isShareCancellation(abortError())).toBe(true);
    // The legacy DOMException code for the same fact (ABORT_ERR).
    expect(isShareCancellation(Object.assign(new Error('x'), { code: 20 }))).toBe(true);

    expect(isShareCancellation(new Error('boom'))).toBe(false);
    expect(isShareCancellation(new DOMException('denied', 'NotAllowedError'))).toBe(false);
    expect(isShareCancellation(null)).toBe(false);
    expect(isShareCancellation('AbortError')).toBe(false);
  });
});

describe('what the visitor is told', () => {
  it('confirms the two outcomes the visitor otherwise cannot verify', () => {
    expect(shareOutcomeMessage({ kind: 'copied' })).toBe('Link copied to your clipboard.');
    expect(shareOutcomeMessage({ kind: 'manual', url: link.url }))
      .toBe('Could not copy the link. Select it below.');
    expect(shareOutcomeIsVisible({ kind: 'copied' })).toBe(true);
    expect(shareOutcomeIsVisible({ kind: 'manual', url: link.url })).toBe(true);
  });

  it('shows nothing for a cancelled share — the failure wording must not appear', () => {
    expect(shareOutcomeMessage({ kind: 'cancelled' })).toBe('');
    expect(shareOutcomeIsVisible({ kind: 'cancelled' })).toBe(false);
  });

  it('announces a completed share without repeating it on screen', () => {
    // The sheet already confirmed it; a notice over the panel would be noise.
    expect(shareOutcomeMessage({ kind: 'shared' })).toBe('Link shared.');
    expect(shareOutcomeIsVisible({ kind: 'shared' })).toBe(false);
  });
});

describe('artworkShare', () => {
  it('builds the canonical link on the origin the page is actually served from', () => {
    expect(artworkShare('http://localhost:3002', 'room-1', artwork, 2)).toEqual({
      url: 'http://localhost:3002/?room=room-1&art=static-silva-quieta',
      title: 'Silva Quieta',
      text: 'Silva Quieta — Elena Marlow, in the ME/CFS Community Gallery',
    });

    // The same page reached on a tailnet, and on Vercel: never a fixed host.
    expect(artworkShare('https://gallery.tailnet.ts.net', 'room-1', artwork, 2).url)
      .toBe('https://gallery.tailnet.ts.net/?room=room-1&art=static-silva-quieta');
    expect(artworkShare('https://cfs-gallery.vercel.app/', 'room-1', artwork, 2).url)
      .toBe('https://cfs-gallery.vercel.app/?room=room-1&art=static-silva-quieta');
  });

  it('shares an artwork without a stable id as its room, never as a slot index', () => {
    const { id: _ignored, ...withoutId } = artwork;
    const shared = artworkShare('http://localhost:3002', 'room-2', withoutId as ImageMetadata, 4);
    expect(shared.url).toBe('http://localhost:3002/?room=room-2');
    expect(shared.url).not.toContain('frame=');
  });

  it('leaves the artist out of the blurb when there is none', () => {
    const anonymous = { ...artwork, artist: '' };
    expect(artworkShare('http://localhost:3002', 'room-1', anonymous, 2).text)
      .toBe('Silva Quieta, in the ME/CFS Community Gallery');
  });
});

describe('browserShareEnvironment', () => {
  const original = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { value: original, configurable: true });
  });

  const withNavigator = (value: unknown) => {
    Object.defineProperty(globalThis, 'navigator', { value, configurable: true });
  };

  it('offers only what this browser actually has', async () => {
    expect(Object.keys(browserShareEnvironment())).toEqual([]);

    const writeText = vi.fn(async () => {});
    withNavigator({ clipboard: { writeText } });
    const clipboardOnly = browserShareEnvironment();
    expect(Object.keys(clipboardOnly)).toEqual(['writeText']);
    await clipboardOnly.writeText!(link.url);
    expect(writeText).toHaveBeenCalledWith(link.url);

    const share = vi.fn(async () => {});
    withNavigator({ share, clipboard: { writeText } });
    const both = browserShareEnvironment();
    expect(Object.keys(both).sort()).toEqual(['share', 'writeText']);
    // Bound, not handed over bare: Web Share and Clipboard are method-bound APIs.
    await both.share!({ url: link.url });
    expect(share).toHaveBeenCalledWith({ url: link.url });
  });

  it('does not reach for a browser when there is none', () => {
    withNavigator(undefined);
    expect(browserShareEnvironment()).toEqual({});
  });
});

// The panel's own wiring, which no unit test can click through: the component
// needs a running tour, a room and the shelf. The behaviour is above; this
// guards that the control in the panel is the one that uses it.
describe('the share control in the artwork panel', () => {
  const modal = readFileSync(
    new URL('../../components/ui/ArtworkInfoModal.tsx', import.meta.url),
    'utf8',
  );

  it('goes through this module, and confirms the result to the ear as well as the eye', () => {
    expect(modal).toContain('shareArtworkLink');
    expect(modal).toContain('browserShareEnvironment');
    expect(modal).toContain('artworkShare(');
    // Announced, not just shown: the live region carries the same words.
    expect(modal).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(modal).toContain('{shareMessage}');
    // And the failed copy leaves the link where it can be selected.
    expect(modal).toContain('artwork-share-link');
    expect(modal).toContain('manualLinkRef');
  });

  it('leaves the address bar alone', () => {
    // Sharing is an explicit action on a URL that deliberately never changes as
    // the visitor moves: no history entries, no rewritten href.
    expect(modal).not.toContain('history.pushState');
    expect(modal).not.toContain('replaceState');
  });
});
