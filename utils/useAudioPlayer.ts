import { useEffect, useRef, useState } from 'react';

export type AudioPlaybackState = 'idle' | 'playing' | 'paused' | 'ended' | 'error';

/**
 * Drives a single <audio> element through the idle/playing/paused/ended/error
 * states shared by every "listen to this artwork" button in the app.
 */
export function useAudioPlayer() {
  const [audioState, setAudioState] = useState<AudioPlaybackState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const reset = () => {
    audioRef.current?.pause();
    setAudioState('idle');
  };

  const toggle = async () => {
    const player = audioRef.current;
    if (!player) return;

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

  const audioProps = {
    ref: audioRef,
    preload: 'none' as const,
    onEnded: () => setAudioState('ended' as const),
    onPause: () => setAudioState(state => state === 'playing' ? 'paused' : state),
    onError: () => setAudioState('error' as const),
  };

  return { audioState, setAudioState, audioRef, toggle, reset, audioProps };
}
