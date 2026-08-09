'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useTour } from '../../contexts/TourContext';
import { useGuidedTourEngine } from '../../contexts/GuidedTourContext';
import { contentNoteLabel } from '../../config/contentNotes';

/**
 * Content notes live only in the plaque, which a guided visitor never opens —
 * this is what makes them visible without one. Two independent halves: the
 * notes text (if any) and the narration mute control (if narration is
 * currently sounding). Neither implies the other. See docs/guided-tour.md §5.
 */
const NowPlayingStrip: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { isTourStarted, isResting, currentFrameIndex, images } = useTour();
  const { narrationPlaying, muteState, muteNarration, undoMute } = useGuidedTourEngine();

  if (!isTourStarted || isResting) return null;

  const artwork = images[currentFrameIndex];
  if (!artwork || artwork.isEmpty) return null;

  const notes = artwork.contentNotes ?? [];
  const hasNotes = notes.length > 0;
  const showSpeaker = narrationPlaying || muteState === 'pending';

  if (!hasNotes && !showSpeaker) return null;

  return (
    <div style={style}>
      <div
        className="fixed left-0 right-0 z-20 flex justify-center px-4"
        style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3 max-w-md bg-black/50 backdrop-blur-md rounded-full pl-4 pr-2 py-2 shadow-lg">
          {hasNotes && (
            <p className="text-white/75 text-xs leading-snug">
              <span className="text-white/45">Content notes:</span>{' '}
              {notes.map(contentNoteLabel).join(' · ')}
            </p>
          )}

          {muteState === 'pending' ? (
            <button
              onClick={undoMute}
              className="shrink-0 flex items-center gap-1.5 text-white/85 hover:text-white text-xs bg-white/10 hover:bg-white/20 rounded-full pl-2.5 pr-3 py-1.5 transition-colors"
            >
              <VolumeX size={13} /> Narration off · Turn back on
            </button>
          ) : showSpeaker ? (
            <button
              onClick={muteNarration}
              aria-label="Mute narration"
              title="Mute narration"
              className="shrink-0 w-8 h-8 flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <Volume2 size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default NowPlayingStrip;
