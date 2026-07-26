import { put } from '@vercel/blob';
import { ImageMetadata } from '../types/museum';

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
  imageUrl: string;
  aspectRatio: number;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  /** Room the artist was viewing when they clicked "Submit your work" */
  preferredRoom?: string;
}

export interface GallerySettings {
  resendApiKey: string;
  moderatorEmails: string[];
  approvalTemplate: string;
  rejectionTemplate: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: GallerySettings = {
  resendApiKey: '',
  moderatorEmails: [],
  approvalTemplate:
    `Hi {{artist}},\n\nWe're delighted to let you know that your artwork "{{title}}" has been accepted into the ME/CFS Community Gallery.\n\nYou can view it at {{gallery_url}}.\n\nThank you for sharing your work with us.\n\n— The Gallery Team`,
  rejectionTemplate:
    `Hi {{artist}},\n\nThank you for submitting "{{title}}" to the ME/CFS Community Gallery. We really appreciate you sharing your work with us.\n\nAfter careful review, we're unable to include this piece in the current exhibition. We hope you'll consider submitting again in the future.\n\n— The Gallery Team`,
};

// ── Deterministic Blob URL ────────────────────────────────────────────────────
// With access:'public' + allowOverwrite:true, Vercel Blob stores files at a
// stable URL: https://{storeId}.public.blob.vercel-storage.com/{pathname}
// The storeId lives between the 3rd and 4th underscore in BLOB_READ_WRITE_TOKEN.

function blobUrl(pathname: string): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? '';
  const match = token.match(/^vercel_blob_rw_([^_]+)/);
  const storeId = match?.[1] ?? '';
  return `https://${storeId}.public.blob.vercel-storage.com/${pathname}`;
}

async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  // Append timestamp to bypass CDN cache — Blob CDN may serve stale content
  // for up to several minutes after a write without this.
  const url = `${blobUrl(pathname)}?_=${Date.now()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[storage] read ${pathname} → HTTP ${res.status}`);
      return fallback;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.warn(`[storage] read ${pathname} failed:`, err);
    return fallback;
  }
}

async function writeJson(pathname: string, data: unknown): Promise<void> {
  const result = await put(pathname, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
  });
  console.log(`[storage] wrote ${pathname} → ${result.url}`);
}

// ── Data paths ────────────────────────────────────────────────────────────────

const SUBMISSIONS_PATH = 'gallery/data/submissions.json';
const artworksPath = (roomId: string) => `gallery/data/artworks-${roomId}.json`;
const SETTINGS_PATH = 'gallery/data/settings.json';

// ── Submissions ───────────────────────────────────────────────────────────────
// All submissions live in a single JSON file. Fine at this scale.

async function readAllSubmissions(): Promise<Submission[]> {
  return readJson<Submission[]>(SUBMISSIONS_PATH, []);
}

async function writeAllSubmissions(submissions: Submission[]): Promise<void> {
  await writeJson(SUBMISSIONS_PATH, submissions);
}

export async function saveSubmission(submission: Submission): Promise<void> {
  const all = await readAllSubmissions();
  await writeAllSubmissions([...all, submission]);
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const all = await readAllSubmissions();
  return all.find(s => s.id === id) ?? null;
}

export async function getPendingSubmissions(): Promise<Submission[]> {
  const all = await readAllSubmissions();
  return all.filter(s => s.status === 'pending');
}

export async function updateSubmissionStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const all = await readAllSubmissions();
  const updated = all.map(s => s.id === id ? { ...s, status } : s);
  await writeAllSubmissions(updated);
}

// ── Live artworks (per room) ──────────────────────────────────────────────────

export async function getRoomArtworks(roomId: string): Promise<ImageMetadata[] | null> {
  const data = await readJson<ImageMetadata[] | null>(artworksPath(roomId), null);
  return data;
}

export async function addArtworkToRoom(roomId: string, artwork: ImageMetadata): Promise<void> {
  const existing: ImageMetadata[] = (await getRoomArtworks(roomId)) ?? [];
  await writeJson(artworksPath(roomId), [...existing, artwork]);
}

export async function removeArtworkFromRoom(roomId: string, index: number): Promise<void> {
  const existing: ImageMetadata[] = (await getRoomArtworks(roomId)) ?? [];
  await writeJson(artworksPath(roomId), existing.filter((_, i) => i !== index));
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
  const stored = await readJson<Partial<GallerySettings>>(SETTINGS_PATH, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: GallerySettings): Promise<void> {
  await writeJson(SETTINGS_PATH, settings);
}
