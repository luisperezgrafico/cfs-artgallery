'use client';

import Link from 'next/link';
import { ZoomIn } from 'lucide-react';
import { TourProvider, useTour } from '../../contexts/TourContext';
import ArtworkLightbox from '../ui/ArtworkLightbox';
import SubmitArtworkModal from '../ui/SubmitArtworkModal';
import { ImageMetadata } from '../../types/museum';
import ListNavControls from './ListNavControls';

export interface ListArtworkEntry {
  artwork: ImageMetadata;
  roomId: string;
  frameIndex: number;
}

function ZoomButton({ index, title }: { index: number; title: string }) {
  const { startTour } = useTour();

  return (
    <button
      type="button"
      className="list-view-zoom-btn"
      aria-label={`View full image of ${title}`}
      onClick={() => {
        startTour(index);
        // ArtworkLightbox resets isOpen whenever currentFrameIndex changes (so
        // stepping to the next 3D frame closes it) — deferring past that commit
        // lets the reset settle before we open, instead of racing it shut.
        setTimeout(() => window.dispatchEvent(new CustomEvent('open-artwork-lightbox')), 0);
      }}
    >
      <ZoomIn size={16} />
    </button>
  );
}

export default function ArtworkListWithLightbox({ items }: { items: ListArtworkEntry[] }) {
  return (
    <TourProvider totalFrames={items.length} images={items.map(item => item.artwork)}>
      <ul className="list-view-items">
        {items.map(({ artwork, roomId, frameIndex }, index) => (
          <li key={artwork.id ?? `${roomId}-${frameIndex}`} className="list-view-item">
            {artwork.url && (
              <div className="list-view-thumb-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={artwork.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="list-view-thumb"
                />
                <ZoomButton index={index} title={artwork.title} />
              </div>
            )}
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
                <audio controls src={artwork.audioUrl} className="list-view-item-audio">
                  Your browser does not support audio playback.
                </audio>
              )}
              <Link href={`/?room=${roomId}&frame=${frameIndex}`} className="list-view-item-link">
                View in the 3D gallery
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <div className="list-view-submit-cta-wrap">
        <p className="list-view-submit-cta-tagline">Made something you'd like to share?</p>
        <button
          type="button"
          className="list-view-submit-cta"
          onClick={() => window.dispatchEvent(new CustomEvent('open-submit-artwork', { detail: {} }))}
        >
          Submit your artwork
        </button>
      </div>

      <ArtworkLightbox />
      <SubmitArtworkModal />
      <ListNavControls itemCount={items.length} />
    </TourProvider>
  );
}
