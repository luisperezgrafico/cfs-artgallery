import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import MenuButton from '../../components/ui/MenuButton';
import { hasTopStripMessage, isViewingArtwork, shouldShowMenuLabel } from '../../utils/menuButton';
import type { ImageMetadata } from '../../types/museum';

const artwork = (id: string, title: string, contentNotes?: string[]): ImageMetadata => ({
  id,
  url: `/art/${id}.svg`,
  title,
  artist: 'Mira Solenne',
  date: '2024',
  link: '#',
  aspectRatio: 1,
  contentNotes,
});

const emptySlot: ImageMetadata = {
  url: '',
  title: '',
  artist: '',
  date: '',
  link: '',
  aspectRatio: 1,
  isEmpty: true,
};

const rooms = [
  { id: 'room-1', name: 'Room I', images: [artwork('a', 'Lux Perpetua'), artwork('b', 'Hora Incerta', ['sensory-intensity']), emptySlot] },
  { id: 'room-2', name: 'Room II', images: [artwork('c', 'Noctis Figura', ['dark-imagery'])] },
];

/** The overview: no tour running, nothing in the top strip. */
const overview = { isTourStarted: false, isResting: false, currentFrameIndex: -1 };

describe('isViewingArtwork', () => {
  it('is true while the tour is showing a frame', () => {
    expect(isViewingArtwork({ ...overview, isTourStarted: true, currentFrameIndex: 1 })).toBe(true);
  });

  it('is false in the overview and at the bench, where the strip is free', () => {
    expect(isViewingArtwork(overview)).toBe(false);
    // Sitting at the rest view: the tour has ended and no frame is current.
    expect(isViewingArtwork({ ...overview, isResting: true })).toBe(false);
  });
});

describe('shouldShowMenuLabel', () => {
  it('shows the word in the overview with nothing in the top strip', () => {
    expect(shouldShowMenuLabel({
      viewingArtwork: isViewingArtwork(overview),
      topStripMessage: false,
    })).toBe(true);
  });

  it('hides the word while an artwork is on screen — whether or not that artwork carries a content note', () => {
    // Frame 0 has no content notes at all: the word still cedes the strip.
    const noNote = isViewingArtwork({ ...overview, isTourStarted: true, currentFrameIndex: 0 });
    // Frame 1 carries one.
    const withNote = isViewingArtwork({ ...overview, isTourStarted: true, currentFrameIndex: 1 });

    expect(noNote).toBe(true);
    expect(withNote).toBe(true);
    expect(shouldShowMenuLabel({ viewingArtwork: noNote, topStripMessage: false })).toBe(false);
    expect(shouldShowMenuLabel({ viewingArtwork: withNote, topStripMessage: false })).toBe(false);
  });

  it('stays hidden on an empty submit canvas, so the word does not flicker in mid-tour', () => {
    const onEmptyCanvas = isViewingArtwork({ ...overview, isTourStarted: true, currentFrameIndex: 2 });
    expect(onEmptyCanvas).toBe(true);
    expect(shouldShowMenuLabel({ viewingArtwork: onEmptyCanvas, topStripMessage: false })).toBe(false);
  });

  it('hides the word while a message occupies the top strip, even in the overview', () => {
    expect(shouldShowMenuLabel({
      viewingArtwork: isViewingArtwork(overview),
      topStripMessage: true,
    })).toBe(false);
  });

  it('brings the word back once the strip is free again', () => {
    // Rest view after a tour: no frame current, no message.
    expect(shouldShowMenuLabel({
      viewingArtwork: isViewingArtwork({ ...overview, isResting: true }),
      topStripMessage: false,
    })).toBe(true);
  });
});

describe('hasTopStripMessage', () => {
  const withSavedPosition = {
    beforeEntry: { roomId: 'room-2', frameIndex: 0 },
    rooms,
    currentRoomId: 'room-1',
    currentFrameIndex: -1,
    navigated: false,
    dismissed: false,
  };

  it('is true while a position is offered — on a plain visit too, not only after a link', () => {
    expect(hasTopStripMessage(withSavedPosition)).toBe(true);
  });

  it('is false with nothing saved, and once the offer is over', () => {
    expect(hasTopStripMessage({ ...withSavedPosition, beforeEntry: null })).toBe(false);
    expect(hasTopStripMessage({ ...withSavedPosition, navigated: true })).toBe(false);
    expect(hasTopStripMessage({ ...withSavedPosition, dismissed: true })).toBe(false);
  });

  it('is false when the visitor is already standing on the offered position', () => {
    expect(hasTopStripMessage({ ...withSavedPosition, currentRoomId: 'room-2', currentFrameIndex: 0 })).toBe(false);
  });
});

describe('MenuButton', () => {
  const render = (labelVisible: boolean) => renderToStaticMarkup(
    <MenuButton stripFree={labelVisible} onClick={() => {}} />,
  );

  it('keeps the icon and the accessible name whether or not the word is shown', () => {
    for (const labelVisible of [true, false]) {
      const markup = render(labelVisible);
      expect(markup).toContain('aria-label="Open menu"');
      expect(markup).toContain('<svg');
      // The label element stays in the DOM in both states: the word is ceded by
      // animating its width, not by unmounting it, so the button never jumps.
      expect(markup).toContain('menu-button-label');
      expect(markup).toContain('>Menu</span>');
    }
  });

  it('carries the state the CSS collapses from', () => {
    expect(render(true)).toContain('data-strip-free="true"');
    expect(render(false)).toContain('data-strip-free="false"');
  });
});
