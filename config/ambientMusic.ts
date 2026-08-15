export interface AmbientMusicSettings {
  title: string;
  sourceUrl: string;
}

/** Default, loaded only after a visitor explicitly switches music on. */
export const DEFAULT_AMBIENT_MUSIC: AmbientMusicSettings = {
  title: 'Calm Loop',
  sourceUrl: 'https://opengameart.org/sites/default/files/Relaxing.mp3',
};
