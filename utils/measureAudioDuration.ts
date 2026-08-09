/**
 * Lets the browser decode a clip just far enough to report its length — the
 * one reliable, format-agnostic way to get audio duration without a server
 * side parser. Used to backfill ImageMetadata.audioDurationSec after a
 * generate/upload in the admin panel. See docs/guided-tour.md §7.
 */
export function measureAudioDurationSec(src: string): Promise<number | undefined> {
  return new Promise(resolve => {
    const audio = new Audio();
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
    };
    const onLoaded = () => {
      const duration = audio.duration;
      cleanup();
      resolve(Number.isFinite(duration) && duration > 0 ? duration : undefined);
    };
    const onError = () => {
      cleanup();
      resolve(undefined);
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    audio.preload = 'metadata';
    audio.src = src;
  });
}

export async function measureFileDurationSec(file: File): Promise<number | undefined> {
  const url = URL.createObjectURL(file);
  try {
    return await measureAudioDurationSec(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
