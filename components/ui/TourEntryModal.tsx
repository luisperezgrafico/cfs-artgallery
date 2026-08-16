'use client';

import React, { useState } from 'react';
import { useTour } from '../../contexts/TourContext';
import { useRoom } from '../../contexts/RoomContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import { useAmbientMusic } from '../../contexts/AmbientMusicContext';
import { TourPreset, getInitialFrameIndex } from '../../utils/userPreferences';
import { estimateRoomSeconds, formatEstimate } from '../../utils/tourEstimate';

const DOORS: Array<{ preset: TourPreset; title: string; subtitle: string }> = [
  { preset: 'guided', title: 'Guided', subtitle: 'Moves on its own, with narration.' },
  { preset: 'silent', title: 'Silent', subtitle: 'Moves on its own, no voice.' },
  { preset: 'own-pace', title: 'At your own pace', subtitle: 'You move. Narration on any piece, if you want it.' },
];

export default function TourEntryModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (atIndex?: number) => void;
}) {
  const { images, totalFrames } = useTour();
  const { rooms, activeRoomIndex } = useRoom();
  const { applyPreset, dwellSeconds, lastPreset } = useGuidedTourPreferences();
  const { isPlaying: ambientMusicPlaying, toggle: toggleAmbientMusic } = useAmbientMusic();

  const roomId = rooms[activeRoomIndex]?.id ?? '';
  // > 0, not >= 0: being saved on the very first artwork isn't worth a
  // separate "resume" choice — it's the same as starting over.
  const resumeIndex = getInitialFrameIndex(roomId, totalFrames);
  const canResume = resumeIndex > 0;
  const [view, setView] = useState<'resume' | 'doors'>(canResume ? 'resume' : 'doors');
  // Off by default, every visit — a remembered preference must never turn
  // into autoplay. Checking this is the visitor's own gesture, in the same
  // click that starts the tour, so playing music here is not autoplay.
  const [wantsAmbientMusic, setWantsAmbientMusic] = useState(false);

  const applyAmbientMusicChoice = () => {
    if (wantsAmbientMusic && !ambientMusicPlaying) void toggleAmbientMusic();
    if (!wantsAmbientMusic && ambientMusicPlaying) void toggleAmbientMusic();
  };

  const estimateFor = (preset: TourPreset): string | null => {
    if (preset === 'own-pace') return null;
    const seconds = estimateRoomSeconds(images, { narrated: preset === 'guided', dwellSeconds });
    return formatEstimate(seconds);
  };

  const pick = (preset: TourPreset) => {
    applyPreset(preset);
    applyAmbientMusicChoice();
    onStart();
    onClose();
  };

  const resume = () => {
    if (lastPreset) applyPreset(lastPreset);
    applyAmbientMusicChoice();
    onStart(resumeIndex);
    onClose();
  };

  const resumeArtwork = canResume ? images[resumeIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.28s ease-out' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md p-6 space-y-5"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          boxShadow: 'var(--panel-shadow)',
          borderRadius: '2px',
          animation: 'scaleInSmooth 0.3s ease-out forwards',
        }}
      >
        {view === 'resume' && canResume ? (
          <>
            <div>
              <h2
                className="text-lg"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: 'var(--panel-title)', fontWeight: 600 }}
              >
                Welcome back
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--panel-subtitle)' }}>
                {resumeArtwork && !resumeArtwork.isEmpty
                  ? `You were on "${resumeArtwork.title}" — ${resumeIndex + 1} of ${totalFrames}.`
                  : `You were on artwork ${resumeIndex + 1} of ${totalFrames}.`}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={resume}
                data-testid="tour-resume"
                className="w-full py-3 text-sm font-medium text-center transition-colors bg-[var(--panel-btn-bg-hover)]"
                style={{ color: 'var(--panel-btn-text)', border: '1px solid var(--panel-border)', borderRadius: '2px' }}
              >
                Resume — artwork {resumeIndex + 1}
              </button>
              <button
                onClick={() => setView('doors')}
                data-testid="tour-start-over"
                className="w-full py-2.5 text-sm text-center transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                style={{ color: 'var(--panel-subtitle)', border: '1px solid var(--panel-border)', borderRadius: '2px' }}
              >
                Start over
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2
                className="text-lg"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: 'var(--panel-title)', fontWeight: 600 }}
              >
                How would you like to visit?
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--panel-subtitle)' }}>
                You can change this at any time.
              </p>
            </div>
            <div className="space-y-3">
              {DOORS.map(door => (
                <button
                  key={door.preset}
                  onClick={() => pick(door.preset)}
                  data-testid={`tour-door-${door.preset}`}
                  className="w-full text-left px-4 py-3 transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                  style={{ border: '1px solid var(--panel-border)', borderRadius: '2px' }}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium" style={{ color: 'var(--panel-btn-text)' }}>{door.title}</span>
                    {estimateFor(door.preset) && (
                      <span className="text-xs shrink-0" style={{ color: 'var(--panel-subtitle)' }}>{estimateFor(door.preset)}</span>
                    )}
                  </span>
                  <span className="block text-xs mt-1" style={{ color: 'var(--panel-subtitle)' }}>{door.subtitle}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: 'var(--panel-subtitle)' }}>
          <input
            type="checkbox"
            checked={wantsAmbientMusic}
            onChange={e => setWantsAmbientMusic(e.target.checked)}
            className="shrink-0"
            style={{ accentColor: '#b56d45' }}
          />
          Play soft ambient music
        </label>

        <button
          onClick={onClose}
          className="w-full text-center text-xs pt-1 transition-colors"
          style={{ color: 'var(--panel-subtitle)' }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
