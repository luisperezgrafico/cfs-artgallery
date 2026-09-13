import type { ImageMetadata } from '../types/museum';
import {
  describeSavedPosition,
  shouldOfferVisitReturn,
  type SavedVisitPosition,
} from './galleryLink';

/**
 * When the menu button's word cedes the top strip.
 *
 * The button carries the word "Menu" again, which is what makes it findable —
 * but the top strip is shared, and on a phone the word and the rest of the
 * strip collide. So the word steps aside; the icon never does. The button keeps
 * its place, its touch area and its `aria-label="Open menu"`, and is announced
 * exactly the same with or without the word.
 *
 * Two rules, both deliberately about the *mode* rather than about the artwork
 * in front of the visitor: tying the word to "does this piece carry a content
 * note?" would make it appear and disappear artwork by artwork, and that
 * flicker is worse than the overlap it would fix. The top strip's own messages
 * keep their place and their priority — they are what a screen reader and a
 * visitor in bed need first; the word only ever accompanied an icon that
 * already reads on its own.
 */

/**
 * An artwork is on screen (the guided tour is showing a frame). Empty submit
 * canvases count as being on screen too: manual navigation steps onto them, and
 * a one-frame reappearance of the word there would be the same flicker.
 */
export function isViewingArtwork(args: {
  isTourStarted: boolean;
  isResting: boolean;
  currentFrameIndex: number;
}): boolean {
  return args.isTourStarted && !args.isResting && args.currentFrameIndex >= 0;
}

export interface TopStripMessageInputs {
  /** Where the visitor was before this visit began, captured once at entry. */
  beforeEntry: SavedVisitPosition | null;
  rooms: { id: string; name: string; images: ImageMetadata[] }[];
  currentRoomId: string;
  currentFrameIndex: number;
  navigated: boolean;
  dismissed: boolean;
}

/**
 * Whether the top strip is already carrying a message the menu button must not
 * compete with. Today that is the "return to your visit" chip, and the question
 * is asked with the very same pure helpers the chip uses to decide its own
 * visibility (`ResumeVisitChip`, `utils/galleryLink`) — the chip's own mounting
 * and fade stay its business.
 *
 * The content note that shares the strip is not repeated here: it only ever
 * appears while an artwork is on screen, which `isViewingArtwork` already
 * covers.
 */
export function hasTopStripMessage(args: TopStripMessageInputs): boolean {
  return shouldOfferVisitReturn({
    saved: describeSavedPosition(args.beforeEntry, args.rooms),
    currentRoomId: args.currentRoomId,
    currentFrameIndex: args.currentFrameIndex,
    visitorNavigated: args.navigated,
    dismissed: args.dismissed,
  });
}

/**
 * The one rule the button follows: the word is shown only when the top strip is
 * free — nothing on screen, nothing up there.
 */
export function shouldShowMenuLabel(args: {
  viewingArtwork: boolean;
  topStripMessage: boolean;
}): boolean {
  return !args.viewingArtwork && !args.topStripMessage;
}
