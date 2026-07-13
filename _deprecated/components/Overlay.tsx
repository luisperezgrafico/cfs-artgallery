'use client';

import type { GalleryManifest, RoomData } from '@/lib/gallery';

interface Props {
  roomSlug: string;
  frameIndex: number;
  roomData: RoomData;
  gallery: GalleryManifest;
  motionOn: boolean;
  onSwitchRoom: (slug: string) => void;
  onOverview: () => void;
  onNav: (delta: 1 | -1) => void;
  onToggleMotion: () => void;
}

export function Overlay({
  roomSlug,
  frameIndex,
  roomData,
  gallery,
  motionOn,
  onSwitchRoom,
  onOverview,
  onNav,
  onToggleMotion,
}: Props) {
  const isOverview   = frameIndex === -1;
  const totalFrames  = roomData.slots.length;
  const currentSlot  = frameIndex >= 0 ? roomData.slots[frameIndex] : null;
  const currentArt   = currentSlot?.artworkSlug ? roomData.artworks[currentSlot.artworkSlug] : null;

  const statusText = isOverview
    ? `${roomData.name} — vista general`
    : currentArt
    ? `${roomData.name}, obra ${frameIndex + 1} de ${totalFrames}: "${currentArt.title}", por ${currentArt.artist}`
    : `${roomData.name}, espacio vacío ${frameIndex + 1} de ${totalFrames}`;

  return (
    <>
      {/* Top bar */}
      <header className="hud hud-top">
        <span className="room-name">{roomData.name}</span>
        <div className="comfort" role="group" aria-label="Comfort settings">
          <button className="chip" aria-pressed={motionOn} onClick={onToggleMotion}>
            Motion {motionOn ? 'on' : 'off'}
          </button>
        </div>
      </header>

      {/* Screen-reader status */}
      <p className="sr-only" role="status" aria-live="polite">{statusText}</p>

      {/* Tap hint — only on overview */}
      {isOverview && (
        <p className="drag-hint" aria-hidden="true">tap an artwork to zoom in</p>
      )}

      {/* Room selector */}
      <nav className="lobby-nav" aria-label="Choose a room">
        {gallery.rooms.map((room) => (
          <button
            key={room.slug}
            className={`room-btn room-btn--${room.variant}${room.slug === roomSlug ? ' room-btn--active' : ''}`}
            onClick={() => onSwitchRoom(room.slug)}
            aria-current={room.slug === roomSlug ? 'true' : undefined}
          >
            {room.name}
          </button>
        ))}
      </nav>

      {/* Artwork plaque — shown when zoomed */}
      {!isOverview && (
        <aside className="plaque" aria-label="About this work">
          {currentArt ? (
            <>
              <h2>{currentArt.title}</h2>
              <p className="plaque-artist">{currentArt.artist}</p>
              <p className="plaque-medium">{currentArt.medium}</p>
              <p className="plaque-desc">{currentArt.description}</p>
            </>
          ) : (
            <>
              <h2>This space is waiting</h2>
              <p className="plaque-desc">
                This canvas is reserved for a work from our community.
                If you have a piece to share, we&apos;d love to show it here.
              </p>
              <button className="submit-btn" disabled>
                Submit your work — coming soon
              </button>
            </>
          )}
        </aside>
      )}

      {/* Bottom navigation */}
      <nav className="hud hud-bottom" aria-label="Tour navigation">
        {isOverview ? (
          <>
            <div />
            <span className="nav-status">Tap an artwork to explore it</span>
            <div />
          </>
        ) : (
          <>
            <button
              className="nav-btn"
              onClick={() => frameIndex === 0 ? onOverview() : onNav(-1)}
            >
              {frameIndex === 0 ? '← Overview' : '← Back'}
            </button>

            <div className="nav-center">
              <span className="nav-status" aria-hidden="true">
                {frameIndex + 1} / {totalFrames}
              </span>
            </div>

            <button
              className="nav-btn"
              onClick={() => onNav(1)}
              disabled={frameIndex === totalFrames - 1}
            >
              Next →
            </button>
          </>
        )}
      </nav>
    </>
  );
}
