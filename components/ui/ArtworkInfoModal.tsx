'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, ChevronDown, ChevronUp, Heart, Volume2, Pause, RotateCcw } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { useRoom } from '../../contexts/RoomContext';
import { useShelf } from '../../contexts/ShelfContext';
import { contentNoteLabel } from '../../config/contentNotes';

interface Origin {
  x: number;
  y: number;
}

const ArtworkInfoModal: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isTourStarted, currentFrameIndex, images } = useTour();
  const { rooms, activeRoomIndex } = useRoom();
  const { isShelved, toggle } = useShelf();
  const [isOpen, setIsOpen] = useState(false);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'paused' | 'ended' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const artwork = isTourStarted && currentFrameIndex >= 0
    ? images[currentFrameIndex]
    : null;

  const activeRoom = rooms[activeRoomIndex];
  const canShelf = !!(artwork?.id);
  const shelved = canShelf ? isShelved(artwork!.id!) : false;

  const handleToggleShelf = () => {
    if (!artwork?.id) return;
    toggle({
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      url: artwork.url,
      contentNotes: artwork.contentNotes,
      roomId: activeRoom.id,
      frameIndex: currentFrameIndex,
    });
  };

  useEffect(() => {
    audioRef.current?.pause();
    setAudioState('idle');
    setIsOpen(false);
    setExpanded(false);
  }, [currentFrameIndex]);
  useEffect(() => { if (!isTourStarted) setIsOpen(false); }, [isTourStarted]);

  useEffect(() => {
    if (!isOpen) {
      audioRef.current?.pause();
      setAudioState('idle');
      window.dispatchEvent(new CustomEvent('close-artwork-info'));
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Origin | undefined>).detail;
      setOrigin(detail?.x !== undefined ? detail : null);
      setIsOpen(true);
    };
    window.addEventListener('open-artwork-info', handler);
    return () => window.removeEventListener('open-artwork-info', handler);
  }, []);

  if (!artwork || !isOpen) return null;

  const close = () => setIsOpen(false);
  const hasDescription = !!(artwork.shortDescription || artwork.longDescription);
  const contentNotes = artwork.contentNotes ?? [];
  const hasContentNotes = contentNotes.length > 0;
  const canPlayAudio = !!(artwork.audioUrl && hasDescription);
  const audioLabel = artwork.audioSource === 'uploaded' ? 'Artist audio' : 'AI voice';

  const toggleAudio = async () => {
    const player = audioRef.current;
    if (!player) return;

    if (artwork.longDescription) setExpanded(true);

    if (audioState === 'playing') {
      player.pause();
      setAudioState('paused');
      return;
    }

    if (audioState === 'ended') player.currentTime = 0;

    try {
      await player.play();
      setAudioState('playing');
    } catch {
      setAudioState('error');
    }
  };

  const transformOrigin = origin ? `${origin.x}px ${origin.y}px` : '50% 75%';
  const safeAreaPadding = 'max(1.25rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left))';

  return (
    <div style={style}>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.28s ease-out' }}
        onClick={close}
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        style={{
          padding: safeAreaPadding,
          transformOrigin,
          animation: 'scaleInSmooth 0.34s ease-out forwards',
        }}
      >
        <div
          className="pointer-events-auto w-full max-w-lg flex flex-col max-h-[85dvh]"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            boxShadow: 'var(--panel-shadow)',
            borderRadius: '2px',
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
            <div className="flex-1 min-w-0">
              <h2
                className="text-lg leading-snug"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: 'var(--panel-title)',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                }}
              >
                {artwork.title}
              </h2>
              <p
                className="text-sm mt-1 italic"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: 'var(--panel-subtitle)' }}
              >
                {artwork.artist}
                {artwork.date ? ` · ${artwork.date}` : ''}
                {artwork.medium ? ` · ${artwork.medium}` : ''}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
              {canShelf && (
                <button
                  onClick={handleToggleShelf}
                  aria-label={shelved ? 'Remove from shelf' : 'Add to shelf'}
                  title={shelved ? 'Remove from shelf' : 'Add to shelf'}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                  style={{ color: shelved ? '#c0665a' : 'var(--panel-btn-text)' }}
                >
                  <Heart size={15} fill={shelved ? 'currentColor' : 'none'} />
                </button>
              )}
              <button
                onClick={close}
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                style={{ color: 'var(--panel-btn-text)' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Separator */}
          {(hasDescription || hasContentNotes) && (
            <div className="mx-6" style={{ borderTop: '1px solid var(--panel-separator)' }} />
          )}

          {/* Descriptions */}
          {(hasDescription || hasContentNotes) && (
            <div className="overflow-y-auto px-6 py-5 flex-1">
              {hasContentNotes && (
                <div className="mb-4">
                  <p
                    className="mb-2 text-[11px] uppercase tracking-widest"
                    style={{
                      color: 'var(--panel-subtitle)',
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    Content notes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {contentNotes.map(note => (
                      <span
                        key={note}
                        className="px-2 py-1 text-xs"
                        style={{
                          color: 'var(--panel-subtitle)',
                          border: '1px solid var(--panel-border)',
                          background: 'var(--panel-btn-bg)',
                          borderRadius: '2px',
                          fontFamily: "Georgia, 'Times New Roman', serif",
                        }}
                      >
                        {contentNoteLabel(note)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {canPlayAudio && (
                <div className="mb-4">
                  <button
                    onClick={toggleAudio}
                    aria-label={audioState === 'playing' ? 'Pause full audio description' : 'Listen to full audio description'}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                    style={{
                      color: 'var(--panel-btn-text)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '2px',
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    {audioState === 'playing'
                      ? <Pause size={14} />
                      : audioState === 'ended'
                        ? <RotateCcw size={14} />
                        : <Volume2 size={14} />}
                    {audioState === 'playing' ? 'Pause' : audioState === 'ended' ? 'Replay' : 'Listen'}
                  </button>
                  <span
                    className="ml-3 align-middle text-xs"
                    style={{
                      color: audioState === 'error' ? '#b55a3a' : 'var(--panel-subtitle)',
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    {audioState === 'error' ? 'Audio unavailable' : audioLabel}
                  </span>
                  <audio
                    ref={audioRef}
                    src={artwork.audioUrl}
                    preload="none"
                    onEnded={() => setAudioState('ended')}
                    onPause={() => setAudioState(state => state === 'playing' ? 'paused' : state)}
                    onError={() => setAudioState('error')}
                  />
                </div>
              )}

              {artwork.shortDescription && (
                <p
                  className="text-sm whitespace-pre-line"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: 'var(--panel-text)',
                    lineHeight: 1.7,
                  }}
                >
                  {artwork.shortDescription}
                </p>
              )}

              {artwork.longDescription && (
                <>
                  {artwork.shortDescription && (
                    <button
                      onClick={() => setExpanded(e => !e)}
                      className="flex items-center gap-1 mt-3 text-xs transition-colors"
                      style={{ color: 'var(--panel-subtitle)' }}
                    >
                      {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {expanded ? 'Less' : 'Read more'}
                    </button>
                  )}
                  {(!artwork.shortDescription || expanded) && (
                    <p
                      className="text-sm whitespace-pre-line mt-3"
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        color: 'var(--panel-text)',
                        lineHeight: 1.7,
                      }}
                    >
                      {artwork.longDescription}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer link */}
          {artwork.link && artwork.link !== '#' && (
            <div
              className="px-6 pb-6 pt-3"
              style={{ borderTop: '1px solid var(--panel-separator)' }}
            >
              <a
                href={artwork.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full text-sm transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                style={{
                  color: 'var(--panel-btn-text)',
                  border: '1px solid var(--panel-border)',
                }}
              >
                <ExternalLink size={14} />
                View work
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtworkInfoModal;
