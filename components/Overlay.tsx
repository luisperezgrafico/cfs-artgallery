'use client';

import type { GalleryManifest, GalleryState, RoomData } from '@/lib/gallery';

interface Props {
  state: GalleryState;
  gallery: GalleryManifest;
  currentRoom: RoomData | null;
  plaqueOpen: boolean;
  motionOn: boolean;
  ambientOn: boolean;
  onEnterRoom: (slug: string) => void;
  onExitToLobby: () => void;
  onNav: (delta: 1 | -1) => void;
  onTogglePlaque: () => void;
  onToggleMotion: () => void;
  onToggleAmbient: () => void;
}

export function Overlay({
  state,
  gallery,
  currentRoom,
  plaqueOpen,
  motionOn,
  ambientOn,
  onEnterRoom,
  onExitToLobby,
  onNav,
  onTogglePlaque,
  onToggleMotion,
  onToggleAmbient,
}: Props) {
  const isLobby     = state.scene === 'lobby';
  const isRoom      = state.scene === 'room';
  // slotIndex -1 = cinematic entrance, user controls not shown yet
  const slotIndex   = isRoom ? state.slotIndex : 0;
  const isEntering  = isRoom && slotIndex === -1;
  const totalSlots  = currentRoom?.slots.length ?? 0;
  const currentSlot = currentRoom && slotIndex > 0 ? currentRoom.slots[slotIndex - 1] : null;
  const currentArt  = currentSlot?.artworkSlug ? currentRoom!.artworks[currentSlot.artworkSlug] : null;

  const statusText = isLobby
    ? `${gallery.title} — entrada`
    : isEntering
    ? 'Entrando a la sala…'
    : slotIndex === 0
    ? `${currentRoom!.name} — vista general`
    : currentArt
    ? `${currentRoom!.name}, obra ${slotIndex} de ${totalSlots}: "${currentArt.title}", por ${currentArt.artist}`
    : `${currentRoom!.name}, espacio vacío ${slotIndex} de ${totalSlots}`;

  return (
    <>
      <header className="hud hud-top">
        <span className="room-name">
          {isLobby ? gallery.title : currentRoom?.name ?? ''}
        </span>
        <div className="comfort" role="group" aria-label="Comfort settings">
          <button className="chip" aria-pressed={motionOn} onClick={onToggleMotion}>
            Motion {motionOn ? 'on' : 'off'}
          </button>
          <button className="chip" aria-pressed={ambientOn} onClick={onToggleAmbient}>
            Ambience {ambientOn ? 'on' : 'off'}
          </button>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">{statusText}</p>

      {/* Lobby: room selector */}
      {isLobby && (
        <nav className="lobby-nav" aria-label="Choose a room">
          {gallery.rooms.map((room) => (
            <button
              key={room.slug}
              className={`room-btn room-btn--${room.variant}`}
              onClick={() => onEnterRoom(room.slug)}
            >
              {room.name}
            </button>
          ))}
        </nav>
      )}

      {/* Room: plaque */}
      {isRoom && slotIndex > 0 && plaqueOpen && (
        <aside className="plaque" aria-label="About this space">
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
        {isEntering ? (
          // Camera gliding in — no controls yet
          <div />
        ) : isLobby ? (
          <>
            <div />
            <span className="nav-status">Choose a room above to enter</span>
            <div />
          </>
        ) : (
          <>
            <button
              className="nav-btn"
              onClick={() => slotIndex === 0 ? onExitToLobby() : onNav(-1)}
            >
              {slotIndex === 0 ? '← Lobby' : '← Back'}
            </button>

            <div className="nav-center">
              {slotIndex > 0 && (
                <span className="nav-status" aria-hidden="true">
                  {slotIndex} / {totalSlots}
                </span>
              )}
              {slotIndex > 0 && (
                <button className="chip" aria-pressed={plaqueOpen} onClick={onTogglePlaque}>
                  {plaqueOpen ? 'Close' : currentArt ? 'About this work' : 'About this space'}
                </button>
              )}
            </div>

            <button
              className="nav-btn"
              onClick={() => onNav(1)}
              disabled={slotIndex === totalSlots}
            >
              {slotIndex === 0 ? 'Explore →' : 'Next →'}
            </button>
          </>
        )}
      </nav>
    </>
  );
}
