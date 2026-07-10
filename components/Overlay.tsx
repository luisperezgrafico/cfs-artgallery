'use client';

import type { Room } from '@/lib/gallery';

export function Overlay({
  room,
  index,
  total,
  onGo,
  plaqueOpen,
  onTogglePlaque,
  motionOn,
  onToggleMotion,
  ambientOn,
  onToggleAmbient,
}: {
  room: Room;
  index: number;
  total: number;
  onGo: (next: number) => void;
  plaqueOpen: boolean;
  onTogglePlaque: () => void;
  motionOn: boolean;
  onToggleMotion: () => void;
  ambientOn: boolean;
  onToggleAmbient: () => void;
}) {
  const art = index > 0 ? room.artworks[index - 1] : null;
  const status = art
    ? `Artwork ${index} of ${total}: “${art.title}”, by ${art.artist}`
    : `${room.name} — room overview`;

  return (
    <>
      <header className="hud hud-top">
        <span className="room-name">{room.name}</span>
        <div className="comfort" role="group" aria-label="Comfort settings">
          <button
            className="chip"
            aria-pressed={motionOn}
            onClick={onToggleMotion}
            title="When off, moving between works uses a gentle fade instead of a camera glide"
          >
            Motion {motionOn ? 'on' : 'off'}
          </button>
          <button
            className="chip"
            aria-pressed={ambientOn}
            onClick={onToggleAmbient}
            title="When off, the room is completely still (and uses no battery)"
          >
            Ambience {ambientOn ? 'on' : 'off'}
          </button>
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      {art && plaqueOpen && (
        <aside className="plaque" aria-label="About this artwork">
          <h2>{art.title}</h2>
          <p className="plaque-artist">{art.artist}</p>
          <p className="plaque-medium">{art.medium}</p>
          <p className="plaque-desc">{art.description}</p>
        </aside>
      )}

      <nav className="hud hud-bottom" aria-label="Tour">
        <button className="nav-btn" onClick={() => onGo(index - 1)} disabled={index === 0}>
          ← Back
        </button>

        <div className="nav-center">
          <span className="nav-status" aria-hidden="true">
            {art ? `${index} / ${total}` : 'Welcome'}
          </span>
          {art && (
            <button className="chip" aria-pressed={plaqueOpen} onClick={onTogglePlaque}>
              {plaqueOpen ? 'Close plaque' : 'About this work'}
            </button>
          )}
        </div>

        <button className="nav-btn" onClick={() => onGo(index + 1)} disabled={index === total}>
          Next →
        </button>
      </nav>
    </>
  );
}
