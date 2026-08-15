'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AmbientMusicSettings, DEFAULT_AMBIENT_MUSIC } from '../config/ambientMusic';

interface AmbientMusicContextValue {
  isPlaying: boolean;
  toggle: () => Promise<void>;
}

const AmbientMusicContext = createContext<AmbientMusicContextValue | undefined>(undefined);

/**
 * Gallery-only ambient sound. It intentionally starts silent and is not saved
 * between visits: a remembered preference must never turn into autoplay.
 */
export function AmbientMusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [track, setTrack] = useState<AmbientMusicSettings>(DEFAULT_AMBIENT_MUSIC);

  useEffect(() => {
    fetch('/api/ambient-music')
      .then(response => response.ok ? response.json() : null)
      .then((music: AmbientMusicSettings | null) => {
        if (music?.sourceUrl) setTrack(music);
      })
      .catch(() => undefined);
  }, []);

  const toggle = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      // Playback may be unavailable (for example, an offline visitor). The
      // switch stays off rather than surfacing a disruptive error in the tour.
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 0.15;
  }, []);

  return (
    <AmbientMusicContext.Provider value={{ isPlaying, toggle }}>
      {children}
      <audio
        ref={audioRef}
        src={track.sourceUrl}
        loop
        preload="none"
        aria-hidden="true"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </AmbientMusicContext.Provider>
  );
}

export function useAmbientMusic(): AmbientMusicContextValue {
  const context = useContext(AmbientMusicContext);
  if (!context) throw new Error('useAmbientMusic must be used within AmbientMusicProvider');
  return context;
}
