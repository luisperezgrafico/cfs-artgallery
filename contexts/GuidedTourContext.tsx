'use client';

// Two layers, both "guided tour" but with different lifetimes:
//
// - GuidedTourPreferenceProvider holds the visitor's choices (auto-advance,
//   narration, dwell time). It's mounted above the per-room <TourProvider
//   key={activeRoom.id}> in Gallery.tsx, so switching rooms via "Next room"
//   never resets it. autoAdvance is deliberately NOT persisted to storage —
//   every fresh page load starts paused (docs/guided-tour.md §9).
//
// - GuidedTourEngineProvider is mounted per room, inside TourProvider. It owns
//   the actual <audio> element, the dwell/lead-in/advance timers and the
//   mute-with-undo window — all things that should reset cleanly when the
//   room changes, because they describe "what's happening to the current
//   artwork right now", not a preference.
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useTour } from './TourContext';
import {
  readVisitMode, saveVisitMode, TourPreset, VisitMode,
} from '../utils/userPreferences';
import { DwellSeconds, DEFAULT_DWELL_SECONDS } from '../utils/tourEstimate';
import { DEFAULT_REST_VIEW } from '../utils/restView';

const MUTE_UNDO_MS = 4000;
const CONTENT_NOTE_LEAD_IN_MS = 3000;
const NARRATION_LEAD_IN_MS = 400;
const ADVANCE_BEAT_MS = 900;

// ── Preferences (room-independent) ──────────────────────────────────────────

interface GuidedTourPreferences {
  autoAdvance: boolean;
  narrationEnabled: boolean;
  dwellSeconds: DwellSeconds;
  lastPreset: TourPreset | null;
  setAutoAdvance: (value: boolean) => void;
  setNarrationEnabled: (value: boolean) => void;
  setDwellSeconds: (value: DwellSeconds) => void;
  /** Sets autoAdvance/narrationEnabled to a door's defaults and remembers the choice. Does not start the tour. */
  applyPreset: (preset: TourPreset) => void;
}

const GuidedTourPreferenceContext = createContext<GuidedTourPreferences | undefined>(undefined);

export function GuidedTourPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [mode, setMode] = useState<VisitMode>({
    narrationEnabled: true,
    dwellSeconds: DEFAULT_DWELL_SECONDS,
    lastPreset: null,
  });

  useEffect(() => {
    setMode(readVisitMode());
  }, []);

  const persist = useCallback((patch: Partial<VisitMode>) => {
    setMode(prev => {
      const next = { ...prev, ...patch };
      saveVisitMode(next);
      return next;
    });
  }, []);

  const setNarrationEnabled = useCallback((value: boolean) => persist({ narrationEnabled: value }), [persist]);
  const setDwellSeconds = useCallback((value: DwellSeconds) => persist({ dwellSeconds: value }), [persist]);

  const applyPreset = useCallback((preset: TourPreset) => {
    if (preset === 'guided') {
      setAutoAdvance(true);
      persist({ narrationEnabled: true, lastPreset: preset });
    } else if (preset === 'silent') {
      setAutoAdvance(true);
      persist({ narrationEnabled: false, lastPreset: preset });
    } else {
      setAutoAdvance(false);
      persist({ lastPreset: preset });
    }
  }, [persist]);

  const value = useMemo<GuidedTourPreferences>(() => ({
    autoAdvance,
    narrationEnabled: mode.narrationEnabled,
    dwellSeconds: mode.dwellSeconds,
    lastPreset: mode.lastPreset,
    setAutoAdvance,
    setNarrationEnabled,
    setDwellSeconds,
    applyPreset,
  }), [autoAdvance, mode, setNarrationEnabled, setDwellSeconds, applyPreset]);

  return (
    <GuidedTourPreferenceContext.Provider value={value}>
      {children}
    </GuidedTourPreferenceContext.Provider>
  );
}

export function useGuidedTourPreferences(): GuidedTourPreferences {
  const ctx = useContext(GuidedTourPreferenceContext);
  if (!ctx) throw new Error('useGuidedTourPreferences must be inside GuidedTourPreferenceProvider');
  return ctx;
}

// ── Engine (per room) ────────────────────────────────────────────────────────

type MuteState = 'idle' | 'pending';

interface GuidedTourEngine {
  /** Narration currently sounding for the artwork on screen right now. */
  narrationPlaying: boolean;
  muteState: MuteState;
  /** Stops the current narration and starts the undo window; confirms after MUTE_UNDO_MS. */
  muteNarration: () => void;
  /** Resumes the paused narration and cancels the pending mute. */
  undoMute: () => void;
}

const GuidedTourEngineContext = createContext<GuidedTourEngine | undefined>(undefined);

export function GuidedTourEngineProvider({ children }: { children: React.ReactNode }) {
  const { autoAdvance, narrationEnabled, dwellSeconds, setNarrationEnabled, setAutoAdvance } = useGuidedTourPreferences();
  const {
    isTourStarted, isResting, currentFrameIndex, totalFrames, images, nextFrame, sitAtRestView,
  } = useTour();

  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const [muteState, setMuteState] = useState<MuteState>('idle');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const advanceRef = useRef<() => void>(() => {});
  const muteUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistOffRef = useRef<() => void>(() => {});
  persistOffRef.current = () => setNarrationEnabled(false);

  const clearMuteTimer = useCallback(() => {
    if (muteUndoTimerRef.current) {
      clearTimeout(muteUndoTimerRef.current);
      muteUndoTimerRef.current = null;
    }
  }, []);

  const muteNarration = useCallback(() => {
    audioRef.current?.pause();
    setNarrationPlaying(false);
    setMuteState('pending');
    clearMuteTimer();
    muteUndoTimerRef.current = setTimeout(() => {
      muteUndoTimerRef.current = null;
      setMuteState('idle');
      persistOffRef.current();
    }, MUTE_UNDO_MS);
  }, [clearMuteTimer]);

  const undoMute = useCallback(() => {
    clearMuteTimer();
    setMuteState('idle');
    audioRef.current?.play().then(() => setNarrationPlaying(true)).catch(() => {});
  }, [clearMuteTimer]);

  // Reset the mute-undo window whenever the artwork changes — it only ever
  // applies to "the narration that was just playing".
  useEffect(() => {
    clearMuteTimer();
    setMuteState('idle');
  }, [currentFrameIndex, clearMuteTimer]);

  useEffect(() => {
    const withinRoom = isTourStarted && !isResting && currentFrameIndex >= 0 && currentFrameIndex < totalFrames;

    if (!autoAdvance || !withinRoom) {
      setNarrationPlaying(false);
      return;
    }

    const artwork = images[currentFrameIndex];
    const isLastArtwork = currentFrameIndex >= totalFrames - 1;

    const advance = () => {
      if (isLastArtwork) sitAtRestView(DEFAULT_REST_VIEW);
      else nextFrame();
    };
    advanceRef.current = advance;

    let cancelled = false;
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    let leadInTimer: ReturnType<typeof setTimeout> | null = null;

    const startDwell = () => {
      dwellTimer = setTimeout(advance, dwellSeconds * 1000);
    };

    const canNarrate = narrationEnabled && !artwork?.isEmpty && !!artwork?.audioUrl;

    if (canNarrate) {
      const hasNotes = !!artwork!.contentNotes?.length;
      leadInTimer = setTimeout(() => {
        const player = audioRef.current;
        if (!player || cancelled) return;
        player.src = artwork!.audioUrl!;
        player.currentTime = 0;
        player.play()
          .then(() => setNarrationPlaying(true))
          .catch(() => {
            // Autoplay blocked or the file failed to load — don't strand the tour.
            setNarrationPlaying(false);
            startDwell();
          });
      }, hasNotes ? CONTENT_NOTE_LEAD_IN_MS : NARRATION_LEAD_IN_MS);
    } else {
      startDwell();
    }

    return () => {
      cancelled = true;
      setNarrationPlaying(false);
      if (dwellTimer) clearTimeout(dwellTimer);
      if (leadInTimer) clearTimeout(leadInTimer);
      audioRef.current?.pause();
    };
  }, [autoAdvance, narrationEnabled, dwellSeconds, isTourStarted, isResting, currentFrameIndex, totalFrames, images, nextFrame, sitAtRestView]);

  // Pause everything while the tab is hidden, instead of racing through artworks unseen.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden') {
        audioRef.current?.pause();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // Opening the plaque is "taking control" — pause auto-advance rather than
  // let the tour move on underneath a modal the visitor is reading.
  useEffect(() => {
    const handler = () => setAutoAdvance(false);
    window.addEventListener('open-artwork-info', handler);
    return () => window.removeEventListener('open-artwork-info', handler);
  }, [setAutoAdvance]);

  const handleEnded = useCallback(() => {
    setNarrationPlaying(false);
    setTimeout(() => advanceRef.current(), ADVANCE_BEAT_MS);
  }, []);

  const handleError = useCallback(() => {
    setNarrationPlaying(false);
  }, []);

  const value = useMemo<GuidedTourEngine>(() => ({
    narrationPlaying, muteState, muteNarration, undoMute,
  }), [narrationPlaying, muteState, muteNarration, undoMute]);

  return (
    <GuidedTourEngineContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="none" onEnded={handleEnded} onError={handleError} className="sr-only" />
    </GuidedTourEngineContext.Provider>
  );
}

export function useGuidedTourEngine(): GuidedTourEngine {
  const ctx = useContext(GuidedTourEngineContext);
  if (!ctx) throw new Error('useGuidedTourEngine must be inside GuidedTourEngineProvider');
  return ctx;
}
