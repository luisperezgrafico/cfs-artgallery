'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { EditableArtworkFields, Submission } from '../../lib/storage';
import type { ImageMetadata } from '../../types/museum';
import { adminReducer, initialAdminState, type AdminState } from './adminState';

/** How often to re-check storage while an approval is still propagating. */
const PUBLISH_POLL_MS = 4000;
/** Give up polling after this long; the row stays, just without the chip. */
const PUBLISH_POLL_TIMEOUT_MS = 3 * 60_000;

export interface AdminData {
  state: AdminState;
  /**
   * Re-reads both lists from the server, reconciled against local mutations.
   * `quiet` skips the loading state, for background polling.
   */
  refresh: (opts?: { quiet?: boolean }) => Promise<void>;
  approve: (submission: Submission, roomId: string, slot?: number | null) => Promise<void>;
  reject: (submission: Submission, reason: string) => Promise<void>;
  remove: (roomId: string, artworkId: string) => Promise<void>;
  updateArtwork: (
    roomId: string,
    artworkId: string,
    input: { targetRoomId: string; slot?: number; fields: Partial<EditableArtworkFields> },
  ) => Promise<ImageMetadata>;
  regenerateAudio: (roomId: string, artworkId: string) => Promise<ImageMetadata>;
  uploadAudio: (roomId: string, artworkId: string, file: File) => Promise<ImageMetadata>;
  dismissError: () => void;
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null) as { error?: string } | null;
  return data?.error ?? fallback;
}

/**
 * The admin panel's single source of truth. Mounted once in the dashboard shell
 * so tab switches never remount it, never refetch, and never undo a mutation.
 */
export function useAdminData(): AdminData {
  const [state, dispatch] = useReducer(adminReducer, initialAdminState);

  // The reducer needs the pre-mutation list to roll a failed delete back, and
  // reading it from a ref keeps `remove` out of the render-identity business.
  const stateRef = useRef(state);
  stateRef.current = state;

  const refresh = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!quiet) dispatch({ type: 'loadStart' });
    try {
      const [subsRes, artRes] = await Promise.all([
        fetch('/api/admin/submissions'),
        fetch('/api/admin/artworks'),
      ]);
      if (!subsRes.ok || !artRes.ok) {
        if (!quiet) {
          dispatch({ type: 'loadFailure', message: `Error ${subsRes.ok ? artRes.status : subsRes.status}` });
        }
        return;
      }
      const [submissions, payload] = await Promise.all([
        subsRes.json() as Promise<Submission[]>,
        artRes.json() as Promise<{
          artworks: Record<string, ImageMetadata[]>;
          publishing?: Submission[];
        }>,
      ]);
      dispatch({
        type: 'loadSuccess',
        submissions,
        artworks: payload.artworks ?? {},
        publishing: payload.publishing ?? [],
      });
    } catch {
      if (!quiet) dispatch({ type: 'loadFailure', message: 'Failed to load the dashboard.' });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // While storage catches up, re-check quietly so the "publishing" chip clears
  // on its own instead of leaving the moderator to guess and hit refresh.
  const publishingCount = state.publishingArtworkIds.length;
  useEffect(() => {
    if (publishingCount === 0) return;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt > PUBLISH_POLL_TIMEOUT_MS) {
        clearInterval(timer);
        return;
      }
      refresh({ quiet: true });
    }, PUBLISH_POLL_MS);

    return () => clearInterval(timer);
  }, [publishingCount, refresh]);

  const approve = useCallback(async (submission: Submission, roomId: string, slot?: number | null) => {
    dispatch({ type: 'approveStart', submissionId: submission.id });
    let res: Response;
    try {
      res = await fetch(`/api/admin/submissions/${submission.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, slot }),
      });
    } catch {
      dispatch({ type: 'approveFailure', message: 'Network error. Please try again.' });
      throw new Error('Network error. Please try again.');
    }

    const data = await res.json().catch(() => null) as
      | { ok?: boolean; error?: string; artwork?: ImageMetadata; roomId?: string }
      | null;

    if (!res.ok || !data?.ok || !data.artwork || !data.roomId) {
      const message = data?.error ?? 'Approval failed.';
      dispatch({ type: 'approveFailure', message });
      throw new Error(message);
    }

    dispatch({
      type: 'approveSuccess',
      submissionId: submission.id,
      roomId: data.roomId,
      artwork: data.artwork,
    });
  }, []);

  const reject = useCallback(async (submission: Submission, reason: string) => {
    dispatch({ type: 'rejectStart', submissionId: submission.id });
    let res: Response;
    try {
      res = await fetch(`/api/admin/submissions/${submission.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
    } catch {
      dispatch({ type: 'rejectFailure', message: 'Network error. Please try again.' });
      throw new Error('Network error. Please try again.');
    }

    const data = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      const message = data?.error ?? 'Rejection failed.';
      dispatch({ type: 'rejectFailure', message });
      throw new Error(message);
    }

    dispatch({ type: 'rejectSuccess', submissionId: submission.id });
  }, []);

  const remove = useCallback(async (roomId: string, artworkId: string) => {
    const snapshot = stateRef.current.artworks[roomId] ?? [];
    dispatch({ type: 'removeStart', roomId, artworkId });
    try {
      const res = await fetch(`/api/admin/artworks/${roomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: artworkId }),
      });
      if (!res.ok) {
        dispatch({
          type: 'removeFailure',
          roomId,
          artworkId,
          snapshot,
          message: await errorMessage(res, `Error ${res.status}`),
        });
        return;
      }
      dispatch({ type: 'removeSuccess' });
    } catch {
      dispatch({
        type: 'removeFailure',
        roomId,
        artworkId,
        snapshot,
        message: 'Failed to remove artwork.',
      });
    }
  }, []);

  const updateArtwork = useCallback(async (
    roomId: string,
    artworkId: string,
    input: { targetRoomId: string; slot?: number; fields: Partial<EditableArtworkFields> },
  ): Promise<ImageMetadata> => {
    dispatch({ type: 'artworkUpdateStart', artworkId });
    let res: Response;
    try {
      res = await fetch(`/api/admin/artworks/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: artworkId, ...input }),
      });
    } catch {
      const message = 'Network error. Please try again.';
      dispatch({ type: 'artworkUpdateFailure', message });
      throw new Error(message);
    }

    const data = await res.json().catch(() => null) as
      | { ok?: boolean; error?: string; artwork?: ImageMetadata; roomId?: string; previousRoomId?: string }
      | null;

    if (!res.ok || !data?.ok || !data.artwork || !data.roomId || !data.previousRoomId) {
      const message = data?.error ?? 'Failed to update artwork.';
      dispatch({ type: 'artworkUpdateFailure', message });
      throw new Error(message);
    }

    dispatch({
      type: 'artworkUpdateSuccess',
      previousRoomId: data.previousRoomId,
      roomId: data.roomId,
      artwork: data.artwork,
    });
    return data.artwork;
  }, []);

  const regenerateAudio = useCallback(async (roomId: string, artworkId: string): Promise<ImageMetadata> => {
    dispatch({ type: 'artworkUpdateStart', artworkId });
    let res: Response;
    try {
      res = await fetch(`/api/admin/artworks/${roomId}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: artworkId }),
      });
    } catch {
      const message = 'Network error. Please try again.';
      dispatch({ type: 'artworkUpdateFailure', message });
      throw new Error(message);
    }

    const data = await res.json().catch(() => null) as
      | { ok?: boolean; error?: string; artwork?: ImageMetadata; roomId?: string }
      | null;

    if (!res.ok || !data?.ok || !data.artwork || !data.roomId) {
      const message = data?.error ?? 'Failed to regenerate audio.';
      dispatch({ type: 'artworkUpdateFailure', message });
      throw new Error(message);
    }

    dispatch({
      type: 'artworkUpdateSuccess',
      previousRoomId: roomId,
      roomId: data.roomId,
      artwork: data.artwork,
    });
    return data.artwork;
  }, []);

  const uploadAudio = useCallback(async (roomId: string, artworkId: string, file: File): Promise<ImageMetadata> => {
    dispatch({ type: 'artworkUpdateStart', artworkId });
    const body = new FormData();
    body.append('id', artworkId);
    body.append('file', file);

    let res: Response;
    try {
      res = await fetch(`/api/admin/artworks/${roomId}/audio/upload`, {
        method: 'POST',
        body,
      });
    } catch {
      const message = 'Network error. Please try again.';
      dispatch({ type: 'artworkUpdateFailure', message });
      throw new Error(message);
    }

    const data = await res.json().catch(() => null) as
      | { ok?: boolean; error?: string; artwork?: ImageMetadata; roomId?: string }
      | null;

    if (!res.ok || !data?.ok || !data.artwork || !data.roomId) {
      const message = data?.error ?? 'Failed to upload audio.';
      dispatch({ type: 'artworkUpdateFailure', message });
      throw new Error(message);
    }

    dispatch({
      type: 'artworkUpdateSuccess',
      previousRoomId: roomId,
      roomId: data.roomId,
      artwork: data.artwork,
    });
    return data.artwork;
  }, []);

  const dismissError = useCallback(() => dispatch({ type: 'dismissError' }), []);

  return { state, refresh, approve, reject, remove, updateArtwork, regenerateAudio, uploadAudio, dismissError };
}
