'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, ChevronDown, ChevronUp, Heart, Share2, Volume2, Pause, RotateCcw } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { useRoom } from '../../contexts/RoomContext';
import { useShelf } from '../../contexts/ShelfContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import { contentNoteLabel } from '../../config/contentNotes';
import { useAudioPlayer } from '../../utils/useAudioPlayer';
import {
  artworkShare,
  browserShareEnvironment,
  shareArtworkLink,
  shareOutcomeIsVisible,
  shareOutcomeMessage,
  type ShareOutcome,
} from '../../utils/artworkShare';

interface Origin {
  x: number;
  y: number;
}

/** How long a confirmation stays up. Long enough to read, short enough to leave. */
const FEEDBACK_MS = 3000;
const SHARE_FEEDBACK_MS = 4000;

const ArtworkInfoModal: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isTourStarted, currentFrameIndex, images } = useTour();
  const { rooms, activeRoomIndex } = useRoom();
  const { isShelved, toggle } = useShelf();
  const { autoAdvance } = useGuidedTourPreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [shelfFeedback, setShelfFeedback] = useState('');
  const shelfFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shareOutcome, setShareOutcome] = useState<ShareOutcome | null>(null);
  const [sharing, setSharing] = useState(false);
  // The in-flight guard is a ref, not the state above: state updates land after
  // the next render, which a double tap beats — and two share sheets (or a sheet
  // and a copy) is exactly what a double tap would ask for.
  const shareInFlightRef = useRef(false);
  const shareFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualLinkRef = useRef<HTMLInputElement | null>(null);
  // Opacity-only fades are harmless, but the project's rule is to honour the
  // setting everywhere: under reduced motion the notice appears with no
  // animation at all, rather than deciding case by case.
  const [reducedMotion] = useState(() => typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const { audioState, toggle: toggleAudioPlayback, reset: resetAudio, audioProps } = useAudioPlayer();

  const artwork = isTourStarted && currentFrameIndex >= 0
    ? images[currentFrameIndex]
    : null;

  const activeRoom = rooms[activeRoomIndex];
  const canShelf = !!(artwork?.id);
  const shelved = canShelf ? isShelved(artwork!.id!) : false;

  const handleToggleShelf = () => {
    if (!artwork?.id) return;
    const addedToShelf = !shelved;
    toggle({
      id: artwork.id,
      title: artwork.title,
      artist: artwork.artist,
      url: artwork.url,
      contentNotes: artwork.contentNotes,
      roomId: activeRoom.id,
      frameIndex: currentFrameIndex,
    });

    if (shelfFeedbackTimerRef.current) clearTimeout(shelfFeedbackTimerRef.current);
    setShelfFeedback(addedToShelf ? 'Added to My Shelf.' : 'Removed from My Shelf.');
    shelfFeedbackTimerRef.current = setTimeout(() => {
      setShelfFeedback('');
      shelfFeedbackTimerRef.current = null;
    }, FEEDBACK_MS);
  };

  const clearShareFeedback = () => {
    if (shareFeedbackTimerRef.current) {
      clearTimeout(shareFeedbackTimerRef.current);
      shareFeedbackTimerRef.current = null;
    }
    setShareOutcome(null);
  };

  const showShareOutcome = (outcome: ShareOutcome) => {
    if (shareFeedbackTimerRef.current) clearTimeout(shareFeedbackTimerRef.current);
    // A dismissed share sheet is not a result: no message, and no leftover link.
    if (!shareOutcomeMessage(outcome)) {
      setShareOutcome(null);
      return;
    }
    setShareOutcome(outcome);
    shareFeedbackTimerRef.current = setTimeout(() => {
      setShareOutcome(null);
      shareFeedbackTimerRef.current = null;
    }, SHARE_FEEDBACK_MS);
  };

  /**
   * The visitor asked to share this artwork. The link is built from the page's
   * own origin the moment they ask, and the outcome decides what is said — see
   * `utils/artworkShare`. Nothing here changes the URL: sharing is the explicit
   * action, the address bar stays where it is.
   */
  const handleShare = async () => {
    if (!artwork || shareInFlightRef.current) return;
    shareInFlightRef.current = true;
    setSharing(true);
    try {
      const link = artworkShare(window.location.origin, activeRoom.id, artwork, currentFrameIndex);
      showShareOutcome(await shareArtworkLink(link, browserShareEnvironment()));
    } finally {
      shareInFlightRef.current = false;
      setSharing(false);
    }
  };

  useEffect(() => {
    resetAudio();
    setIsOpen(false);
    setExpanded(false);
    clearShareFeedback();
  }, [currentFrameIndex]);
  useEffect(() => { if (!isTourStarted) setIsOpen(false); }, [isTourStarted]);

  useEffect(() => () => {
    if (shelfFeedbackTimerRef.current) clearTimeout(shelfFeedbackTimerRef.current);
    if (shareFeedbackTimerRef.current) clearTimeout(shareFeedbackTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetAudio();
      clearShareFeedback();
      window.dispatchEvent(new CustomEvent('close-artwork-info'));
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Origin | undefined>).detail;
      setOrigin(detail?.x !== undefined ? detail : null);
      // A fresh open starts clean: no confirmation left over from a previous
      // visit to another artwork, and no share link waiting to be copied.
      clearShareFeedback();
      setIsOpen(true);
    };
    window.addEventListener('open-artwork-info', handler);
    return () => window.removeEventListener('open-artwork-info', handler);
  }, []);

  // The fallback link is, in that moment, the visitor's only way to the link at
  // all — so it arrives selected. One Copy from the menu, no fiddling, which is
  // what matters on a phone.
  useEffect(() => {
    if (shareOutcome?.kind !== 'manual') return;
    const input = manualLinkRef.current;
    if (!input) return;
    input.focus();
    input.select();
    // Selecting scrolls the field to the end; the start of the URL is the part
    // worth reading, so it is put back in view.
    input.scrollLeft = 0;
  }, [shareOutcome]);

  if (!artwork || !isOpen) return null;

  const shareMessage = shareOutcome ? shareOutcomeMessage(shareOutcome) : '';
  const showShareNotice = !!shareOutcome && shareOutcomeIsVisible(shareOutcome);
  const manualShareLink = shareOutcome?.kind === 'manual' ? shareOutcome.url : null;
  // An artwork with no stable id is shared as its room, so the control says so:
  // (`artworkShareHref` explains why the link degrades instead of guessing.)
  const shareLabel = artwork.id ? 'Share this artwork' : 'Share this room';

  const close = () => setIsOpen(false);
  const hasDescription = !!(artwork.shortDescription || artwork.longDescription);
  const contentNotes = artwork.contentNotes ?? [];
  const hasContentNotes = contentNotes.length > 0;
  const canPlayAudio = !!(artwork.audioUrl && hasDescription);
  // Auto mode already owns this artwork's narration. Keeping the plaque
  // read-only avoids a competing player without interrupting the guide.
  const showManualAudioControl = canPlayAudio && !autoAdvance;
  const audioLabel = artwork.audioSource === 'uploaded' ? 'Artist audio' : null;

  const toggleAudio = async () => {
    if (artwork.longDescription) setExpanded(true);
    await toggleAudioPlayback();
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
          className="panel-warm pointer-events-auto w-full max-w-lg flex flex-col max-h-[85dvh]"
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

            <div className="relative shrink-0 flex items-center gap-1.5 mt-0.5">
              <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {shelfFeedback}
              </div>
              {/* The share confirmation is announced too, in the same words the
                  visitor sees: a message that is only visible leaves out the
                  people who most need to know the action worked. */}
              <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                {shareMessage}
              </div>
              {shelfFeedback && !showShareNotice && (
                <div
                  className="pointer-events-none absolute right-0 bottom-full mb-2 whitespace-nowrap px-3 py-2 text-xs shadow-lg"
                  style={{
                    color: 'var(--panel-btn-text)',
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '2px',
                    fontFamily: "Georgia, 'Times New Roman', serif",
                  }}
                  aria-hidden="true"
                >
                  {shelfFeedback}
                </div>
              )}
              {showShareNotice && shareMessage && (
                <div
                  className="pointer-events-none absolute right-0 bottom-full mb-2 max-w-[calc(100vw-2.5rem)] px-3 py-2 text-xs shadow-lg"
                  style={{
                    color: 'var(--panel-btn-text)',
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '2px',
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    // Fades in where it sits — no movement, no layout shift, and
                    // nothing at all under reduced motion.
                    animation: reducedMotion ? undefined : 'fadeIn 0.28s ease-out',
                  }}
                  aria-hidden="true"
                >
                  {shareMessage}
                </div>
              )}
              <div className="relative group">
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label={shareLabel}
                  aria-busy={sharing || undefined}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                  style={{ color: 'var(--panel-btn-text)' }}
                >
                  <Share2 size={15} />
                </button>
                {!showShareNotice && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 whitespace-nowrap px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                    style={{
                      color: 'var(--panel-btn-text)',
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '2px',
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    {shareLabel}
                  </span>
                )}
              </div>
              {canShelf && (
                <div className="relative group">
                  <button
                    onClick={handleToggleShelf}
                    aria-label={shelved ? 'Remove from shelf' : 'Add to shelf'}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                    style={{ color: shelved ? '#c0665a' : 'var(--panel-btn-text)' }}
                  >
                    <Heart size={15} fill={shelved ? 'currentColor' : 'none'} />
                  </button>
                  {!shelfFeedback && (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 whitespace-nowrap px-3 py-2 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                      style={{
                        color: 'var(--panel-btn-text)',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '2px',
                        fontFamily: "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      {shelved ? 'Remove from shelf' : 'Add to shelf'}
                    </span>
                  )}
                </div>
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

          {/* The clipboard refused, so the link is put in front of the visitor
              instead: never a dead end, and never a silent failure. */}
          {manualShareLink && (
            <div className="px-6 pb-4">
              <label
                htmlFor="artwork-share-link"
                className="block mb-1.5 text-[0.75rem] uppercase tracking-widest"
                style={{
                  color: 'var(--field-label)',
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                Link to copy
              </label>
              <input
                id="artwork-share-link"
                ref={manualLinkRef}
                readOnly
                value={manualShareLink}
                onFocus={event => event.currentTarget.select()}
                aria-describedby="artwork-share-link-hint"
                className="w-full px-3 py-2 text-sm"
                style={{
                  background: 'var(--field-bg)',
                  border: '1px solid var(--field-border)',
                  color: 'var(--field-text)',
                  borderRadius: '2px',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              />
              <p
                id="artwork-share-link-hint"
                className="mt-1.5 text-xs"
                style={{
                  color: 'var(--field-hint)',
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                Select it and copy, with your browser&rsquo;s menu or Ctrl/Cmd&nbsp;+&nbsp;C.
              </p>
            </div>
          )}

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
                    className="mb-2 text-[0.75rem] uppercase tracking-widest"
                    style={{
                      color: 'var(--panel-text)',
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    Content notes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {contentNotes.map(note => (
                      <span
                        key={note}
                        className="px-2.5 py-1 text-sm"
                        style={{
                          color: 'var(--panel-chip-text)',
                          border: '1px solid var(--panel-chip-border)',
                          background: 'var(--panel-chip-bg)',
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

              {showManualAudioControl && (
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
                  {(audioState === 'error' || audioLabel) && (
                    <span
                      className="ml-3 align-middle text-xs"
                      style={{
                        color: audioState === 'error' ? '#b55a3a' : 'var(--panel-subtitle)',
                        fontFamily: "Georgia, 'Times New Roman', serif",
                      }}
                    >
                      {audioState === 'error' ? 'Audio unavailable' : audioLabel}
                    </span>
                  )}
                  <audio {...audioProps} src={artwork.audioUrl} />
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
