export interface AmbientMusicSettings {
  title: string;
  artist: string;
  sourceUrl: string;
  sourcePage: string;
  license: string;
}

/** Default, loaded only after a visitor explicitly switches music on. */
export const DEFAULT_AMBIENT_MUSIC: AmbientMusicSettings = {
  title: 'Calm Loop',
  artist: 'wipics',
  sourceUrl: 'https://opengameart.org/sites/default/files/Relaxing.mp3',
  sourcePage: 'https://opengameart.org/content/calm-loop',
  license: 'CC0 / public domain',
};
