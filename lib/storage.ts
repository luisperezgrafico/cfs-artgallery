import { put, list } from '@vercel/blob';
import { ImageMetadata } from '../types/museum';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Submission {
  id: string;
  title: string;
  artist: string;
  email: string;
  medium: string;
  year: string;
  statement: string;
  imageUrl: string;
  aspectRatio: number;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
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

// ── Blob JSON helpers ─────────────────────────────────────────────────────────
// Small JSON documents stored at predictable pathnames.
// We use `list({ prefix })` to resolve the URL (Vercel Blob assigns a content-
// addressed URL; we find it by listing with the pathname prefix).

async function resolveUrl(pathname: string): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const match = blobs.find(b => b.pathname === pathname);
    return match?.url ?? null;
  } catch {
    return null;
  }
}

async function readJson<T>(pathname: string, fallback: T): Promise<T> {
  try {
    const url = await resolveUrl(pathname);
    if (!url) return fallback;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return res.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

async function writeJson(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
  });
}

// ── Submissions ───────────────────────────────────────────────────────────────

const DATA = 'gallery/data';

export async function saveSubmission(submission: Submission): Promise<void> {
  await writeJson(`${DATA}/submission-${submission.id}.json`, submission);
  const index = await readJson<string[]>(`${DATA}/submissions-index.json`, []);
  if (!index.includes(submission.id)) {
    await writeJson(`${DATA}/submissions-index.json`, [...index, submission.id]);
  }
}

export async function getSubmission(id: string): Promise<Submission | null> {
  return readJson<Submission | null>(`${DATA}/submission-${id}.json`, null);
}

export async function getPendingSubmissions(): Promise<Submission[]> {
  const index = await readJson<string[]>(`${DATA}/submissions-index.json`, []);
  const all = await Promise.all(index.map(id => getSubmission(id)));
  return all.filter((s): s is Submission => s !== null && s.status === 'pending');
}

export async function updateSubmissionStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const sub = await getSubmission(id);
  if (!sub) return;
  await writeJson(`${DATA}/submission-${id}.json`, { ...sub, status });
}

// ── Live artworks (per room) ──────────────────────────────────────────────────

export async function getRoomArtworks(roomId: string): Promise<ImageMetadata[] | null> {
  const pathname = `${DATA}/artworks-${roomId}.json`;
  const url = await resolveUrl(pathname);
  if (!url) return null;
  return readJson<ImageMetadata[]>(pathname, []);
}

export async function addArtworkToRoom(roomId: string, artwork: ImageMetadata): Promise<void> {
  const existing = (await getRoomArtworks(roomId)) ?? [];
  await writeJson(`${DATA}/artworks-${roomId}.json`, [...existing, artwork]);
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
  const stored = await readJson<Partial<GallerySettings>>(`${DATA}/settings.json`, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: GallerySettings): Promise<void> {
  await writeJson(`${DATA}/settings.json`, settings);
}
