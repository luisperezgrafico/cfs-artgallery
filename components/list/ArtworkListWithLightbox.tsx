'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ZoomIn } from 'lucide-react';
import { TourProvider, useTour } from '../../contexts/TourContext';
import ArtworkLightbox from '../ui/ArtworkLightbox';
import SubmitArtworkModal from '../ui/SubmitArtworkModal';
import { ImageMetadata } from '../../types/museum';
import { readVisitPosition } from '../../utils/userPreferences';
import ListNavControls from './ListNavControls';

export interface ListArtworkEntry {
  artwork: ImageMetadata;
  roomId: string;
  frameIndex: number;
}

const HIGHLIGHT_DURATION_MS = 2600;

function listItemDomId(roomId: string, frameIndex: number): string {
  return `list-item-${roomId}-${frameIndex}`;
}

// "Switch to list view" (HamburgerMenu) saves the artwork the visitor was on
// before navigating here — scroll to it and give it a brief highlight, the
// same visit-position record /?room=&frame= already reads coming back the
// other way, so the two links stay in sync without any new state to carry.
function useHighlightCurrentArtwork(items: ListArtworkEntry[]): string | null {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const saved = readVisitPosition();
    if (!saved || saved.frameIndex < 0) return;

    const match = items.find(
      item => item.roomId === saved.roomId && item.frameIndex === saved.frameIndex,
    );
    if (!match) return;

    const element = document.getElementById(listItemDomId(match.roomId, match.frameIndex));
    if (!element) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    setHighlightId(listItemDomId(match.roomId, match.frameIndex));

    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_DURATION_MS);
    return () => clearTimeout(timer);
    // Only ever meant to run once, against the position saved just before landing here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return highlightId;
}

// Native <audio> elements don't know about each other, so starting one
// leaves any other already-playing track running underneath it.
function pauseOtherAudio(e: React.SyntheticEvent<HTMLAudioElement>) {
  const current = e.currentTarget;
  document.querySelectorAll<HTMLAudioElement>('.list-view-item-audio').forEach(audio => {
    if (audio !== current && !audio.paused) audio.pause();
  });
}

function ArtworkPreviewButton({
  index,
  artwork,
}: {
  index: number;
  artwork: ImageMetadata;
}) {
  const { startTour } = useTour();
  const imageDescription = artwork.altText?.trim() || artwork.title;
  const accessibleLabel = imageDescription === artwork.title
    ? `View full image of ${artwork.title}`
    : `View full image of ${artwork.title}. ${imageDescription}`;

  return (
    <button
      type="button"
      className="list-view-thumb-wrap"
      aria-label={accessibleLabel}
      onClick={() => {
        startTour(index);
        // ArtworkLightbox resets isOpen whenever currentFrameIndex changes (so
        // stepping to the next 3D frame closes it) — deferring past that commit
        // lets the reset settle before we open, instead of racing it shut.
        setTimeout(() => window.dispatchEvent(new CustomEvent('open-artwork-lightbox')), 0);
      }}
    >
      {/* The button already supplies the artwork description to assistive
          technology, so the visual image is not announced twice. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artwork.url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="list-view-thumb"
      />
      <span className="list-view-zoom-indicator" aria-hidden="true">
        <ZoomIn size={18} />
      </span>
    </button>
  );
}

export default function ArtworkListWithLightbox({ items }: { items: ListArtworkEntry[] }) {
  const highlightId = useHighlightCurrentArtwork(items);

  return (
    <TourProvider totalFrames={items.length} images={items.map(item => item.artwork)}>
      <ul className="list-view-items">
        {items.map(({ artwork, roomId, frameIndex }, index) => {
          const domId = listItemDomId(roomId, frameIndex);
          return (
          <li
            key={artwork.id ?? `${roomId}-${frameIndex}`}
            id={domId}
            className={`list-view-item list-view-stop${domId === highlightId ? ' list-view-item-highlight' : ''}`}
          >
            <div className="list-view-item-body">
              <h2 className="list-view-item-title">{artwork.title}</h2>
              <p className="list-view-item-meta">
                {artwork.artist}
                {artwork.date ? `, ${artwork.date}` : ''}
                {artwork.medium ? ` — ${artwork.medium}` : ''}
              </p>
              {artwork.shortDescription && (
                <p className="list-view-item-desc">{artwork.shortDescription}</p>
              )}
              {artwork.longDescription && (
                <p className="list-view-item-desc">{artwork.longDescription}</p>
              )}
              {artwork.audioUrl && (
                <audio
                  controls
                  src={artwork.audioUrl}
                  aria-label={`Listen to narration for ${artwork.title}${artwork.artist ? `, by ${artwork.artist}` : ''}`}
                  className="list-view-item-audio"
                  onPlay={pauseOtherAudio}
                >
                  Your browser does not support audio playback.
                </audio>
              )}
              <Link href={`/?room=${roomId}&frame=${frameIndex}`} className="list-view-item-link">
                View in the 3D gallery
              </Link>
            </div>
            {artwork.url && (
              <ArtworkPreviewButton index={index} artwork={artwork} />
            )}
          </li>
          );
        })}
      </ul>

      <div className="list-view-submit-cta-wrap list-view-stop">
        <p className="list-view-submit-cta-tagline">Made something you'd like to share?</p>
        <button
          type="button"
          className="list-view-submit-cta"
          onClick={() => window.dispatchEvent(new CustomEvent('open-submit-artwork', { detail: {} }))}
        >
          Submit your artwork
        </button>
      </div>

      <a href="#list-view-top" className="list-view-back-to-top">
        Back to top
      </a>

      <ArtworkLightbox />
      <SubmitArtworkModal />
      <ListNavControls itemCount={items.length} />
    </TourProvider>
  );
}
