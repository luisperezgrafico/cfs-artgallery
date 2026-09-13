import type { ImageMetadata } from '../types/museum';
import { absoluteGalleryUrl, artworkShareHref } from './galleryLink';

/**
 * Sharing one artwork's link.
 *
 * The gallery deliberately never rewrites the address bar as the visitor moves
 * between artworks (see `utils/galleryLink`), so sharing is an explicit action
 * the visitor takes — and it has to be explicit about its *result* too: whether
 * the link left through the share sheet, went to the clipboard, or could not be
 * handed over at all.
 *
 * This module decides the route and reports what happened. It knows nothing
 * about how any of it looks or is announced: the wording of the confirmation
 * lives here because it is the same thing the screen reader says, but where it
 * is shown is the component's business.
 *
 * The browser APIs are injected rather than reached for directly, so every
 * route — native sheet, clipboard, a clipboard that refuses, a dismissed sheet
 * — is exercisable without a browser.
 */

export interface ShareLink {
  url: string;
  title: string;
  text: string;
}

export type ShareOutcome =
  /** The native share sheet took it (a phone: WhatsApp or Telegram in one tap). */
  | { kind: 'shared' }
  /** Copied to the clipboard — a desktop, or a browser without `navigator.share`. */
  | { kind: 'copied' }
  /** The visitor dismissed the share sheet. Not a failure: it says nothing. */
  | { kind: 'cancelled' }
  /** Nothing could carry the link: it is handed back to be copied by hand. */
  | { kind: 'manual'; url: string };

/** The browser capabilities this module uses, as seen from the page. */
export interface ShareEnvironment {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<unknown>;
  writeText?: (text: string) => Promise<unknown>;
}

/** The live environment: what this browser actually offers, if anything. */
export function browserShareEnvironment(): ShareEnvironment {
  if (typeof navigator === 'undefined') return {};
  const environment: ShareEnvironment = {};
  // `navigator.share` is absent on most desktops; `navigator.clipboard` is
  // absent in an insecure context. Both absences are normal, not errors.
  if (typeof navigator.share === 'function') {
    environment.share = navigator.share.bind(navigator);
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    environment.writeText = navigator.clipboard.writeText.bind(navigator.clipboard);
  }
  return environment;
}

/**
 * A dismissed share sheet, which is not a failure.
 *
 * Chrome and Safari reject with `AbortError` when the visitor closes the sheet
 * without choosing anything; the legacy `code` (20, `ABORT_ERR`) is the same
 * fact on older engines. Treating these as errors would tell someone who just
 * changed their mind that something broke.
 */
export function isShareCancellation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === 'AbortError' || code === 20;
}

/**
 * Hands the link over by the best route this browser has.
 *
 * Order: the native sheet first where it exists (the phone case — sharing to
 * WhatsApp is one tap instead of copy-and-paste), then the clipboard. A sheet
 * that fails to *open* is not a cancellation, so it falls through to the
 * clipboard; a sheet the visitor dismissed stops there, because copying
 * afterwards would be doing the thing they just declined.
 *
 * If nothing can carry the link, the outcome carries the URL instead, so the
 * caller can put it in front of the visitor. There is no silent failure.
 */
export async function shareArtworkLink(
  link: ShareLink,
  environment: ShareEnvironment = browserShareEnvironment(),
): Promise<ShareOutcome> {
  if (environment.share) {
    try {
      await environment.share({ title: link.title, text: link.text, url: link.url });
      return { kind: 'shared' };
    } catch (error) {
      if (isShareCancellation(error)) return { kind: 'cancelled' };
    }
  }

  if (environment.writeText) {
    try {
      await environment.writeText(link.url);
      return { kind: 'copied' };
    } catch {
      // Permission denied, an insecure context, or a browser past its prime.
      // Never silently: the link is handed back below.
    }
  }

  return { kind: 'manual', url: link.url };
}

/**
 * What to tell the visitor afterwards — the same words whether they are read or
 * heard. `''` means say nothing at all, which is what a cancelled share gets.
 */
export function shareOutcomeMessage(outcome: ShareOutcome): string {
  switch (outcome.kind) {
    case 'shared':
      return 'Link shared.';
    case 'copied':
      return 'Link copied to your clipboard.';
    case 'manual':
      return 'Could not copy the link. Select it below.';
    case 'cancelled':
      return '';
  }
}

/**
 * Whether the message also belongs on screen.
 *
 * A share that went through the sheet already showed its own confirmation, and
 * repeating it over the panel is noise; a dismissal has nothing to confirm. The
 * clipboard and the fallback are the two the visitor cannot otherwise verify.
 */
export function shareOutcomeIsVisible(outcome: ShareOutcome): boolean {
  return outcome.kind === 'copied' || outcome.kind === 'manual';
}

/** The share sheet's contents for one artwork, built on the page's own origin. */
export function artworkShare(
  origin: string,
  roomId: string,
  artwork: ImageMetadata,
  frameIndex: number,
): ShareLink {
  const by = artwork.artist ? ` — ${artwork.artist}` : '';
  return {
    url: absoluteGalleryUrl(artworkShareHref(roomId, artwork, frameIndex), origin),
    title: artwork.title,
    text: `${artwork.title}${by}, in the ME/CFS Community Gallery`,
  };
}
