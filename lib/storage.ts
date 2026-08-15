import { store, usingMemoryStore } from './blobStore';
import { ImageMetadata } from '../types/museum';
import { artworkKey } from '../utils/artworkKey';
import { approvedArtworksSeed } from '../config/approvedArtworksSeed';
import { ROOM_CAPACITY } from '../config/roomConfig';
import { AmbientMusicSettings, DEFAULT_AMBIENT_MUSIC } from '../config/ambientMusic';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Submission {
  id: string;
  title: string;
  artist: string;
  email: string;
  medium: string;
  year: string;
  shortDescription: string;
  statement: string;
  contentNotes?: string[];
  imageUrl: string;
  aspectRatio: number;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  /** Room the artist was viewing when they clicked "Submit your work" */
  preferredRoom?: string;
  /** Empty canvas the artist submitted through, 0-based within that room */
  preferredSlot?: number;
  /** Room the moderator hung it in, recorded at approval time */
  approvedRoom?: string;
  /** When the moderation happened — used to bound the "publishing" window */
  moderatedAt?: string;
}

export interface GallerySettings {
  resendApiKey: string;
  moderatorEmails: string[];
  approvalTemplate: string;
  rejectionTemplate: string;
  audioSettings: AudioSettings;
  /** Index of the API key that should start the next ElevenLabs request. */
  elevenLabsKeyCursor: number;
  ambientMusic: AmbientMusicSettings;
  /**
   * When on, notifyModerators sends only to testModeRecipient instead of the
   * real moderator list — so testing a submission doesn't page every real
   * moderator. Dev-only to change (app/api/admin/developer/test-mode), but
   * readable by any admin so they can see who submission notifications
   * currently go to before they test.
   */
  testModeEnabled: boolean;
  testModeRecipient: string;
}

export type AudioProvider = 'local' | 'openai' | 'elevenlabs' | 'disabled';

export interface OpenAiCompatibleAudioSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  format: string;
  timeoutMs: number;
}

export interface ElevenLabsAudioSettings {
  apiKey: string;
  apiKeys: string[];
  voiceId: string;
  modelId: string;
  outputFormat: string;
  timeoutMs: number;
}

export interface AudioSettings {
  provider: AudioProvider;
  local: OpenAiCompatibleAudioSettings;
  openai: OpenAiCompatibleAudioSettings;
  elevenlabs: ElevenLabsAudioSettings;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

export const DEFAULT_SETTINGS: GallerySettings = {
  resendApiKey: '',
  moderatorEmails: [],
  approvalTemplate:
    `Hi {{artist}},\n\nWe're delighted to let you know that your artwork "{{title}}" has been accepted into the ME/CFS Community Gallery.\n\nYou can view it at {{gallery_url}}.\n\nThank you for sharing your work with us.\n\n— The Gallery Team`,
  rejectionTemplate:
    `Hi {{artist}},\n\nThank you for submitting "{{title}}" to the ME/CFS Community Gallery. We really appreciate you sharing your work with us.\n\nAfter careful review, we're unable to include this piece in the current exhibition. We hope you'll consider submitting again in the future.\n\n— The Gallery Team`,
  audioSettings: {
    provider: 'elevenlabs',
    local: {
      baseUrl: '',
      apiKey: '',
      model: 'tts-models',
      voice: 'xtts_en_bella_ref',
      format: 'mp3',
      timeoutMs: 120_000,
    },
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini-tts',
      voice: 'coral',
      format: 'mp3',
      timeoutMs: 60_000,
    },
    elevenlabs: {
      apiKey: '',
      apiKeys: [],
      voiceId: DEFAULT_ELEVENLABS_VOICE_ID,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
      timeoutMs: 120_000,
    },
  },
  elevenLabsKeyCursor: 0,
  ambientMusic: DEFAULT_AMBIENT_MUSIC,
  testModeEnabled: true,
  testModeRecipient: '',
};

// ── Data paths ────────────────────────────────────────────────────────────────

const SUBMISSIONS_PATH = 'gallery/data/submissions.json';
const artworksPath = (roomId: string) => `gallery/data/artworks-${roomId}.json`;
const SETTINGS_PATH = 'gallery/data/settings.json';

function hydrateSeedMetadata(roomId: string, artworks: ImageMetadata[]): ImageMetadata[] {
  const seed = approvedArtworksSeed(roomId);
  if (!seed) return artworks;

  const seedById = new Map(seed
    .filter(artwork => artwork.id)
    .map(artwork => [artwork.id, artwork] as const));

  return artworks.map(artwork => {
    const seedArtwork = artwork.id ? seedById.get(artwork.id) : undefined;
    if (!seedArtwork) return artwork;

    return {
      ...seedArtwork,
      slot: artwork.slot ?? seedArtwork.slot,
      audioUrl: artwork.audioUrl,
      audioGeneratedAt: artwork.audioGeneratedAt,
      audioVoice: artwork.audioVoice,
      audioSource: artwork.audioSource,
      audioTextSignature: artwork.audioTextSignature,
    };
  });
}

// ── Write serialization ───────────────────────────────────────────────────────
// Every mutation below is a read-modify-write of a whole JSON file. Two of them
// interleaving loses one of the writes — e.g. an artist submitting while a
// moderator approves. Serializing per path makes that safe within one server
// instance, which is where the overlap realistically happens (the admin panel
// firing several mutations, or a submit landing mid-approval).

const writeChains = new Map<string, Promise<unknown>>();

function withLock<T>(pathname: string, fn: () => Promise<T>): Promise<T> {
  const previous = writeChains.get(pathname) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  // Keep the chain alive but never let a rejection poison the next caller.
  writeChains.set(pathname, next.catch(() => undefined));
  return next;
}

function withLocks<T>(pathnames: string[], fn: () => Promise<T>): Promise<T> {
  const unique = [...new Set(pathnames)].sort();
  return unique.reduceRight(
    (next, pathname) => () => withLock(pathname, next),
    fn,
  )();
}

// ── Submissions ───────────────────────────────────────────────────────────────
// All submissions live in a single JSON file. Fine at this scale.

async function readAllSubmissions(): Promise<Submission[]> {
  return store.readJson<Submission[]>(SUBMISSIONS_PATH, []);
}

export async function saveSubmission(submission: Submission): Promise<void> {
  await withLock(SUBMISSIONS_PATH, async () => {
    const all = await readAllSubmissions();
    await store.writeJson(SUBMISSIONS_PATH, [...all, submission]);
  });
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const all = await readAllSubmissions();
  return all.find(s => s.id === id) ?? null;
}

export async function getPendingSubmissions(): Promise<Submission[]> {
  const all = await readAllSubmissions();
  return all.filter(s => s.status === 'pending');
}

/**
 * Moves a submission out of `pending`, but only if it is still pending.
 *
 * Returns the submission as it was *before* the write when this call is the one
 * that changed it, and `null` when it was already processed. Callers use that to
 * stay idempotent: a retried approval must not add the artwork a second time.
 */
export async function claimSubmission(
  id: string,
  status: 'approved' | 'rejected',
  patch: Partial<Pick<Submission, 'approvedRoom'>> = {},
): Promise<Submission | null> {
  return withLock(SUBMISSIONS_PATH, async () => {
    const all = await readAllSubmissions();
    const submission = all.find(s => s.id === id);
    if (!submission || submission.status !== 'pending') return null;
    await store.writeJson(
      SUBMISSIONS_PATH,
      all.map(s => s.id === id
        ? { ...s, ...patch, status, moderatedAt: new Date().toISOString() }
        : s),
    );
    return submission;
  });
}

/**
 * Approved submissions whose artwork a read has not surfaced yet.
 *
 * Blob is eventually consistent, so right after an approval the piece is in
 * neither list: gone from the pending queue, not yet in the room. These are the
 * ones in that gap, so the admin panel can show them as still publishing instead
 * of appearing to have lost them.
 *
 * Bounded by `windowMs` so an artwork that was later deleted — also absent from
 * every room — does not reappear here forever.
 */
export async function getPublishingSubmissions(
  artworks: Record<string, ImageMetadata[]>,
  windowMs = 10 * 60_000,
): Promise<Submission[]> {
  const all = await readAllSubmissions();
  const hung = new Set(Object.values(artworks).flat().map(artworkKey));
  const cutoff = Date.now() - windowMs;

  return all.filter(s =>
    s.status === 'approved'
    && !hung.has(s.id)
    && s.moderatedAt !== undefined
    && new Date(s.moderatedAt).getTime() >= cutoff);
}

/**
 * Puts a claimed submission back in the pending queue.
 *
 * Only used to undo a claim whose follow-up work failed, so the moderator sees
 * the card again instead of it vanishing into an approved-but-not-hung limbo.
 */
export async function releaseSubmission(id: string): Promise<void> {
  await withLock(SUBMISSIONS_PATH, async () => {
    const all = await readAllSubmissions();
    await store.writeJson(
      SUBMISSIONS_PATH,
      all.map(s => s.id === id ? { ...s, status: 'pending' as const } : s),
    );
  });
}

// ── Live artworks (per room) ──────────────────────────────────────────────────

export async function getRoomArtworks(roomId: string): Promise<ImageMetadata[] | null> {
  const stored = await store.readJson<ImageMetadata[] | null>(artworksPath(roomId), null);
  if (stored !== null) return hydrateSeedMetadata(roomId, stored);
  if (usingMemoryStore) return null;
  return approvedArtworksSeed(roomId);
}

/**
 * Adds an artwork to a room, ignoring the call if one with the same key is
 * already there.
 *
 * `artwork.slot` is the wall position the artist submitted through. It is kept
 * only if still free — otherwise the piece falls back to the next free slot at
 * render time rather than displacing whatever is already hanging there.
 */
export async function addArtworkToRoom(roomId: string, artwork: ImageMetadata): Promise<void> {
  await withLock(artworksPath(roomId), async () => {
    const existing = (await getRoomArtworks(roomId)) ?? [];
    if (existing.some(a => artworkKey(a) === artworkKey(artwork))) return;

    const slotTaken = artwork.slot !== undefined
      && existing.some(a => a.slot === artwork.slot);
    const placed = slotTaken ? { ...artwork, slot: undefined } : artwork;

    await store.writeJson(artworksPath(roomId), [...existing, placed]);
  });
}

/**
 * Removes an artwork by identity, not by array position — the admin panel's idea
 * of an index goes stale the moment anything else changes the room.
 *
 * Returns false when no artwork matched (already deleted, or wrong room).
 */
export async function removeArtworkFromRoom(roomId: string, id: string): Promise<boolean> {
  return withLock(artworksPath(roomId), async () => {
    const existing = (await getRoomArtworks(roomId)) ?? [];
    const remaining = existing.filter(a => artworkKey(a) !== id);
    if (remaining.length === existing.length) return false;
    await store.writeJson(artworksPath(roomId), remaining);
    return true;
  });
}

export type EditableArtworkFields = Pick<
  ImageMetadata,
  'title' | 'artist' | 'date' | 'medium' | 'shortDescription' | 'longDescription' | 'altText' | 'contentNotes' | 'link'
>;

export interface ManagedArtworkUpdate {
  targetRoomId: string;
  slot?: number;
  fields: Partial<EditableArtworkFields>;
}

export interface ManagedArtworkResult {
  previousRoomId: string;
  roomId: string;
  artwork: ImageMetadata;
}

export async function updateManagedArtwork(
  sourceRoomId: string,
  id: string,
  update: ManagedArtworkUpdate,
): Promise<ManagedArtworkResult | null> {
  const targetRoomId = update.targetRoomId || sourceRoomId;
  const sourcePath = artworksPath(sourceRoomId);
  const targetPath = artworksPath(targetRoomId);

  return withLocks([sourcePath, targetPath], async () => {
    const source = (await getRoomArtworks(sourceRoomId)) ?? [];
    const existing = source.find(a => artworkKey(a) === id);
    if (!existing) return null;

    const target = sourceRoomId === targetRoomId
      ? source
      : (await getRoomArtworks(targetRoomId)) ?? [];

    const slot = update.slot !== undefined && update.slot >= 0 && update.slot < ROOM_CAPACITY
      ? update.slot
      : undefined;

    if (slot !== undefined && target.some(a => artworkKey(a) !== id && a.slot === slot)) {
      throw new Error(`Slot ${slot + 1} is already occupied in that room.`);
    }

    const artwork: ImageMetadata = {
      ...existing,
      ...update.fields,
      slot,
    };

    if (sourceRoomId === targetRoomId) {
      await store.writeJson(
        sourcePath,
        source.map(a => artworkKey(a) === id ? artwork : a),
      );
    } else {
      await store.writeJson(
        sourcePath,
        source.filter(a => artworkKey(a) !== id),
      );
      await store.writeJson(targetPath, [...target, artwork]);
    }

    return { previousRoomId: sourceRoomId, roomId: targetRoomId, artwork };
  });
}

export async function updateArtworkAudio(
  roomId: string,
  id: string,
  audio: Partial<Pick<
    ImageMetadata,
    'audioUrl' | 'audioGeneratedAt' | 'audioVoice' | 'audioSource' | 'audioTextSignature' | 'audioDurationSec'
  >>,
): Promise<ImageMetadata | null> {
  return withLock(artworksPath(roomId), async () => {
    const existing = (await getRoomArtworks(roomId)) ?? [];
    const current = existing.find(a => artworkKey(a) === id);
    if (!current) return null;

    const artwork = { ...current, ...audio };
    await store.writeJson(
      artworksPath(roomId),
      existing.map(a => artworkKey(a) === id ? artwork : a),
    );
    return artwork;
  });
}

export async function clearArtworkAudio(roomId: string, id: string): Promise<ImageMetadata | null> {
  return withLock(artworksPath(roomId), async () => {
    const existing = (await getRoomArtworks(roomId)) ?? [];
    const current = existing.find(a => artworkKey(a) === id);
    if (!current) return null;

    const {
      audioUrl: _audioUrl,
      audioGeneratedAt: _audioGeneratedAt,
      audioVoice: _audioVoice,
      audioSource: _audioSource,
      audioTextSignature: _audioTextSignature,
      audioDurationSec: _audioDurationSec,
      ...artwork
    } = current;

    await store.writeJson(
      artworksPath(roomId),
      existing.map(a => artworkKey(a) === id ? artwork : a),
    );
    return artwork;
  });
}

export async function resetRoomArtworksToSeed(roomId: string): Promise<ImageMetadata[]> {
  const seed = approvedArtworksSeed(roomId);
  if (!seed) {
    throw new Error('No approved artwork seed exists for that room.');
  }

  await withLock(artworksPath(roomId), async () => {
    await store.writeJson(artworksPath(roomId), seed);
  });

  return seed;
}

export async function getAllRoomArtworks(
  roomIds: string[],
): Promise<Record<string, ImageMetadata[]>> {
  const entries = await Promise.all(
    roomIds.map(async id => [id, (await getRoomArtworks(id)) ?? []] as const),
  );
  return Object.fromEntries(entries);
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<GallerySettings> {
  const stored = await store.readJson<Partial<GallerySettings>>(SETTINGS_PATH, {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    elevenLabsKeyCursor: Number.isInteger(stored.elevenLabsKeyCursor) && stored.elevenLabsKeyCursor! >= 0
      ? stored.elevenLabsKeyCursor!
      : 0,
    ambientMusic: {
      ...DEFAULT_SETTINGS.ambientMusic,
      ...(stored.ambientMusic ?? {}),
    },
    audioSettings: {
      ...DEFAULT_SETTINGS.audioSettings,
      ...(stored.audioSettings ?? {}),
      local: {
        ...DEFAULT_SETTINGS.audioSettings.local,
        ...(stored.audioSettings?.local ?? {}),
      },
      openai: {
        ...DEFAULT_SETTINGS.audioSettings.openai,
        ...(stored.audioSettings?.openai ?? {}),
      },
      elevenlabs: {
        ...DEFAULT_SETTINGS.audioSettings.elevenlabs,
        ...(stored.audioSettings?.elevenlabs ?? {}),
        apiKeys: stored.audioSettings?.elevenlabs?.apiKeys ?? [],
        voiceId: stored.audioSettings?.elevenlabs?.voiceId?.trim()
          || DEFAULT_SETTINGS.audioSettings.elevenlabs.voiceId,
      },
    },
  };
}

/**
 * Reserves the first API-key position for one ElevenLabs generation, then
 * advances it. The same-process settings lock prevents two concurrent
 * approvals from choosing the same key first.
 */
export async function reserveElevenLabsKeyStart(keyCount: number): Promise<number> {
  if (keyCount < 2) return 0;

  return withLock(SETTINGS_PATH, async () => {
    const current = await getSettings();
    const start = current.elevenLabsKeyCursor % keyCount;
    await store.writeJson(SETTINGS_PATH, {
      ...current,
      elevenLabsKeyCursor: (start + 1) % keyCount,
    });
    return start;
  });
}

export async function saveSettings(settings: GallerySettings): Promise<void> {
  await withLock(SETTINGS_PATH, () => store.writeJson(SETTINGS_PATH, settings));
}
