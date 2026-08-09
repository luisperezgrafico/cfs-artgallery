'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { useGuidedTourEngine, useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import { contentNoteLabel } from '../../config/contentNotes';

/**
 * Content notes live only in the plaque, which a guided visitor never opens —
 * this is what makes them visible without one. Two independent halves: the
 * notes text (if any) and the narration mute control (if this artwork has
 * audio). Neither implies the other. See docs/guided-tour.md §5.
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
  const { narrationEnabled } = useGuidedTourPreferences();

  if (!isTourStarted || isResting) return null;

  const artwork = images[currentFrameIndex];
  if (!artwork || artwork.isEmpty) return null;

  const notes = artwork.contentNotes ?? [];
  const hasNotes = notes.length > 0;
  const hasAudio = !!artwork.audioUrl;
  const showSpeaker = showNarrationControl && hasAudio;

  if (!hasNotes && !showSpeaker) return null;

  return (
    <div style={style}>
      <div
        className="fixed left-0 right-0 z-20 flex justify-center px-4"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3 max-w-md bg-black/50 backdrop-blur-md rounded-full px-3.5 py-2 shadow-lg">
          {hasNotes && (
            <p className="text-white/75 text-xs leading-snug">
              <span className="text-white/45">Content notes:</span>{' '}
              {notes.map(contentNoteLabel).join(' · ')}
            </p>
          )}

          {showSpeaker ? (
            <button
              onClick={narrationEnabled ? muteNarration : undoMute}
              aria-label={narrationEnabled ? 'Mute narration' : 'Turn narration on'}
              title={narrationEnabled ? 'Mute narration' : 'Turn narration on'}
              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                narrationEnabled
                  ? 'text-white/80 hover:text-white bg-white/10 hover:bg-white/20'
                  : 'text-white/45 hover:text-white/75 bg-white/5 hover:bg-white/15'
              }`}
            >
              {narrationEnabled
                ? <Volume2 size={14} className={narrationPlaying ? 'opacity-100' : 'opacity-75'} />
                : <VolumeX size={14} />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default NowPlayingStrip;
