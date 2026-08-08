// Storage seam.
//
// Everything that persists lives behind this interface so the rest of the app
// never talks to Vercel Blob directly. Two backends:
//
//   - 'blob'   (default) — Vercel Blob, what production uses.
//   - 'memory' — an in-process Map, selected with GALLERY_STORAGE=memory.
//                Used by the e2e suite so tests never touch the real store.

import { put } from '@vercel/blob';

export interface StoredFile {
  url: string;
}

export interface BlobStore {
  readJson<T>(pathname: string, fallback: T): Promise<T>;
  writeJson(pathname: string, data: unknown): Promise<void>;
  putFile(pathname: string, body: Blob, contentType: string): Promise<StoredFile>;
}

// ── Vercel Blob backend ───────────────────────────────────────────────────────
// With access:'public' + allowOverwrite:true, Blob stores files at a stable URL:
// https://{storeId}.public.blob.vercel-storage.com/{pathname}
// The storeId lives between the 3rd and 4th underscore in BLOB_READ_WRITE_TOKEN.

function blobUrl(pathname: string): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? '';
  const match = token.match(/^vercel_blob_rw_([^_]+)/);
  const storeId = match?.[1] ?? '';
  return `https://${storeId}.public.blob.vercel-storage.com/${pathname}`;
}

// Read-after-write window.
//
// Blob is eventually consistent: for a while after a write, a read can still
// return the previous version (observed at 10-15s, sometimes longer — the
// cache-busting query below helps but does not eliminate it). That window is
// what made a just-approved artwork vanish until you reloaded a few times.
//
// So we remember what we ourselves just wrote and prefer it over a read. This
// is only authoritative for the instance that did the write; on a fresh serverless
// instance the read can still be stale, which is why the admin panel also shows an
// explicit "publishing" state until a read confirms the artwork.
const WRITE_CACHE_MS = 5 * 60_000;
const recentWrites = new Map<string, { json: string; at: number }>();

function rememberWrite(pathname: string, json: string): void {
  recentWrites.set(pathname, { json, at: Date.now() });
}

function recallWrite(pathname: string): string | null {
  const entry = recentWrites.get(pathname);
  if (!entry) return null;
  if (Date.now() - entry.at > WRITE_CACHE_MS) {
    recentWrites.delete(pathname);
    return null;
  }
  return entry.json;
}

const vercelBlobStore: BlobStore = {
  async readJson<T>(pathname: string, fallback: T): Promise<T> {
    const ourOwnWrite = recallWrite(pathname);
    if (ourOwnWrite !== null) return JSON.parse(ourOwnWrite) as T;

    // The timestamp defeats the Blob CDN, which otherwise serves stale content
    // for minutes after a write. Even so, treat reads as best-effort: the admin
    // UI must never let a read undo a mutation it already made (see adminState).
    const url = `${blobUrl(pathname)}?_=${Date.now()}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        console.warn(`[storage] read ${pathname} → HTTP ${res.status}`);
        return fallback;
      }
      return await res.json() as T;
    } catch (err) {
      console.warn(`[storage] read ${pathname} failed:`, err);
      return fallback;
    }
  },

  async writeJson(pathname: string, data: unknown): Promise<void> {
    const json = JSON.stringify(data);
    const result = await put(pathname, json, {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    });
    rememberWrite(pathname, json);
    console.log(`[storage] wrote ${pathname} → ${result.url}`);
  },

  async putFile(pathname: string, body: Blob, contentType: string): Promise<StoredFile> {
    const result = await put(pathname, body, { access: 'public', contentType });
    return { url: result.url };
  },
};

// ── In-memory backend (tests) ─────────────────────────────────────────────────
// Kept on globalThis so it survives Next's module reloading in dev.

interface MemoryBackend {
  json: Map<string, string>;
  files: Map<string, { bytes: Uint8Array; contentType: string }>;
}

const memoryKey = Symbol.for('cfs-gallery.memory-store');

function memoryBackend(): MemoryBackend {
  const g = globalThis as Record<symbol, unknown>;
  if (!g[memoryKey]) {
    g[memoryKey] = { json: new Map(), files: new Map() } satisfies MemoryBackend;
  }
  return g[memoryKey] as MemoryBackend;
}

export const memoryStore: BlobStore & {
  reset(): void;
  getFile(pathname: string): { bytes: Uint8Array; contentType: string } | undefined;
} = {
  async readJson<T>(pathname: string, fallback: T): Promise<T> {
    const raw = memoryBackend().json.get(pathname);
    if (raw === undefined) return fallback;
    return JSON.parse(raw) as T;
  },

  async writeJson(pathname: string, data: unknown): Promise<void> {
    memoryBackend().json.set(pathname, JSON.stringify(data));
  },

  async putFile(pathname: string, body: Blob, contentType: string): Promise<StoredFile> {
    const bytes = new Uint8Array(await body.arrayBuffer());
    memoryBackend().files.set(pathname, { bytes, contentType });
    return { url: `/api/testing/blob/${pathname}` };
  },

  reset(): void {
    const backend = memoryBackend();
    backend.json.clear();
    backend.files.clear();
  },

  getFile(pathname: string) {
    return memoryBackend().files.get(pathname);
  },
};

// ── Selection ─────────────────────────────────────────────────────────────────

export const usingMemoryStore = process.env.GALLERY_STORAGE === 'memory';

export const store: BlobStore = usingMemoryStore ? memoryStore : vercelBlobStore;
