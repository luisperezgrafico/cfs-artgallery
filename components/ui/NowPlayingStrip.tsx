'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { useGuidedTourEngine, useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import { contentNoteLabel } from '../../config/contentNotes';

/**
 * Content notes live only in the plaque, which a guided visitor never opens —
 * this is what makes them visible without one. Two independent halves: the
 * notes text (if any) and the auto-mode narration mute control (if this artwork
 * has audio). Neither implies the other. See docs/guided-tour.md §5.
 *
 * The notes half stays visible even with the rest of the interface hidden —
 * it's a content warning, not a control, and hiding it would defeat the
 * point right when someone chose the least distracting way to look at art.
 */
const NowPlayingStrip: React.FC<{ style?: React.CSSProperties; showNarrationControl?: boolean }> = ({
  style,
  showNarrationControl = true,
}) => {
  const { isTourStarted, isResting, currentFrameIndex, images } = useTour();
  const { narrationPlaying, muteNarration, undoMute } = useGuidedTourEngine();
  const { autoAdvance, narrationEnabled } = useGuidedTourPreferences();

  if (!isTourStarted || isResting) return null;

  const artwork = images[currentFrameIndex];
  if (!artwork || artwork.isEmpty) return null;

  const notes = artwork.contentNotes ?? [];
  const hasNotes = notes.length > 0;
  const hasAudio = !!artwork.audioUrl;
  const showSpeaker = showNarrationControl && autoAdvance && hasAudio;

  if (!hasNotes && !showSpeaker) return null;

  return (
    <div style={style}>
      <div
        className="now-playing-strip fixed left-0 right-0 z-20 flex justify-center px-4"
      >
        <div
          className={`flex items-center max-w-md rounded-full transition-[background-color,box-shadow] duration-700 ease-out ${
            hasNotes
              ? 'bg-[var(--floating-surface)] md:bg-[var(--floating-surface-strong)] backdrop-blur-md rounded-full shadow-lg gap-3 px-3 py-1.5 md:gap-4 md:px-4 md:py-2'
              : 'bg-transparent shadow-none p-1 md:p-1.5'
          }`}
        >
          <p
            aria-hidden={!hasNotes}
            className={`text-[var(--floating-text)] text-xs leading-snug transition-opacity duration-700 ease-out ${
              hasNotes ? 'opacity-100' : 'w-0 overflow-hidden opacity-0'
            }`}
          >
            {hasNotes && (
              <>
                <span className="text-[var(--floating-muted)]">Content notes:</span>{' '}
                {notes.map(contentNoteLabel).join(' · ')}
              </>
            )}
          </p>

          {showSpeaker ? (
            <button
              onClick={narrationEnabled ? muteNarration : undoMute}
              aria-label={narrationEnabled ? 'Mute narration' : 'Turn narration on'}
              title={narrationEnabled ? 'Mute narration' : 'Turn narration on'}
              className={`shrink-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full transition-colors ${
                narrationEnabled
                  ? 'text-[var(--floating-text)] hover:bg-[var(--floating-control-hover)] bg-[var(--floating-control)]'
                  : 'text-[var(--floating-muted)] hover:text-[var(--floating-text)] bg-[var(--floating-control-disabled)] hover:bg-[var(--floating-control)]'
              }`}
            >
              {narrationEnabled
                ? <Volume2 size={18} className={narrationPlaying ? 'opacity-100' : 'opacity-80'} />
                : <VolumeX size={18} />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default NowPlayingStrip;
