import type { Submission } from '../../lib/storage';
import type { ImageMetadata } from '../../types/museum';
import { artworkKey } from '../../utils/artworkKey';

/**
 * All the admin panel's server state in one place, as a pure reducer.
 *
 * Two rules drive the design, both learned from bugs:
 *
 * 1. **One store, owned above the tabs.** Submissions and artworks change
 *    together (approving moves a card from one list to the other), so they
 *    cannot live in separate components that unmount on tab switch. That is
 *    what made an approved card come back when you returned to the tab.
 *
 * 2. **A read never undoes a write.** Blob reads are best-effort and can serve
 *    a snapshot from before our own mutation. So the reducer remembers what the
 *    moderator already did (`settledSubmissionIds`, `removedArtworkIds`,
 *    `approvedArtworkIds`) and reconciles every load against it.
 */

export interface AdminState {
  submissions: Submission[];
  artworks: Record<string, ImageMetadata[]>;
  loading: boolean;
  loadError: string;
  /** Submissions approved or rejected here — never show them as pending again. */
  settledSubmissionIds: string[];
  /** Artworks deleted here — never let a stale read resurrect them. */
  removedArtworkIds: string[];
  /** Artworks approved here — keep them if a stale read hasn't caught up. */
  approvedArtworkIds: string[];
  /**
   * Approved but not yet confirmed by a server read. Storage is eventually
   * consistent, so there is a gap where the piece is in neither list; these are
   * shown as "publishing" rather than silently missing.
   */
  publishingArtworkIds: string[];
  /**
   * Approvals the *server* reports as still propagating. Kept as whole
   * submissions so they can be rendered after a reload, when the browser has no
   * local memory of the approval and the artwork is in no room list yet.
   */
  publishingSubmissions: Submission[];
  /** Submission currently being approved/rejected, for per-card spinners. */
  busySubmissionId: string | null;
  /** Artwork currently being deleted. */
  busyArtworkId: string | null;
  actionError: string;
}

export const initialAdminState: AdminState = {
  submissions: [],
  artworks: {},
  loading: true,
  loadError: '',
  settledSubmissionIds: [],
  removedArtworkIds: [],
  approvedArtworkIds: [],
  publishingArtworkIds: [],
  publishingSubmissions: [],
  busySubmissionId: null,
  busyArtworkId: null,
  actionError: '',
};

export type AdminAction =
  | { type: 'loadStart' }
  | {
      type: 'loadSuccess';
      submissions: Submission[];
      artworks: Record<string, ImageMetadata[]>;
      /** Approvals the server itself reports as not yet readable. */
      publishing?: Submission[];
    }
  | { type: 'loadFailure'; message: string }
  | { type: 'approveStart'; submissionId: string }
  | { type: 'approveSuccess'; submissionId: string; roomId: string; artwork: ImageMetadata }
  | { type: 'approveFailure'; message: string }
  | { type: 'rejectStart'; submissionId: string }
  | { type: 'rejectSuccess'; submissionId: string }
  | { type: 'rejectFailure'; message: string }
  | { type: 'removeStart'; roomId: string; artworkId: string }
  | { type: 'removeSuccess' }
  | { type: 'removeFailure'; roomId: string; artworkId: string; snapshot: ImageMetadata[]; message: string }
  | { type: 'artworkUpdateStart'; artworkId: string }
  | { type: 'artworkUpdateSuccess'; previousRoomId: string; roomId: string; artwork: ImageMetadata }
  | { type: 'artworkUpdateFailure'; message: string }
  | { type: 'dismissError' };

function addOnce(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

/**
 * Reconciles a freshly loaded room list with what we know locally: drop anything
 * the moderator deleted, and keep anything they approved that the read missed.
 */
function reconcileRoom(
  incoming: ImageMetadata[],
  local: ImageMetadata[],
  removedArtworkIds: string[],
  approvedArtworkIds: string[],
): ImageMetadata[] {
  const reconciled = incoming.filter(a => !removedArtworkIds.includes(artworkKey(a)));
  const present = new Set(reconciled.map(artworkKey));

  const missingLocalApprovals = local.filter(a => {
    const key = artworkKey(a);
    return approvedArtworkIds.includes(key) && !present.has(key);
  });

  return [...reconciled, ...missingLocalApprovals];
}

export function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'loadStart':
      return { ...state, loading: true, loadError: '' };

    case 'loadFailure':
      return { ...state, loading: false, loadError: action.message };

    case 'loadSuccess': {
      const roomIds = new Set([
        ...Object.keys(action.artworks),
        ...Object.keys(state.artworks),
      ]);
      const artworks: Record<string, ImageMetadata[]> = {};
      for (const roomId of roomIds) {
        artworks[roomId] = reconcileRoom(
          action.artworks[roomId] ?? [],
          state.artworks[roomId] ?? [],
          state.removedArtworkIds,
          state.approvedArtworkIds,
        );
      }
      // Confirmed = the *server's* read shows it. Deliberately not the reconciled
      // list above, which re-adds our own approvals and would clear the flag
      // before storage had actually caught up.
      const visible = new Set(Object.values(action.artworks).flat().map(artworkKey));
      const stillWaiting = (id: string) =>
        !visible.has(id) && !state.removedArtworkIds.includes(id);

      const publishingArtworkIds = [
        ...state.publishingArtworkIds,
        ...(action.publishing ?? []).map(s => s.id),
      ].filter((id, i, all) => all.indexOf(id) === i && stillWaiting(id));

      // Only the ones with no row of their own to badge need a placeholder.
      const shown = new Set(Object.values(artworks).flat().map(artworkKey));
      const publishingSubmissions = (action.publishing ?? [])
        .filter(s => stillWaiting(s.id) && !shown.has(s.id));

      return {
        ...state,
        loading: false,
        loadError: '',
        submissions: action.submissions.filter(s => !state.settledSubmissionIds.includes(s.id)),
        artworks,
        publishingArtworkIds,
        publishingSubmissions,
      };
    }

    case 'approveStart':
    case 'rejectStart':
      return { ...state, busySubmissionId: action.submissionId, actionError: '' };

    case 'approveSuccess': {
      const key = artworkKey(action.artwork);
      const room = state.artworks[action.roomId] ?? [];
      return {
        ...state,
        busySubmissionId: null,
        submissions: state.submissions.filter(s => s.id !== action.submissionId),
        settledSubmissionIds: addOnce(state.settledSubmissionIds, action.submissionId),
        approvedArtworkIds: addOnce(state.approvedArtworkIds, key),
        publishingArtworkIds: addOnce(state.publishingArtworkIds, key),
        removedArtworkIds: state.removedArtworkIds.filter(id => id !== key),
        artworks: {
          ...state.artworks,
          [action.roomId]: room.some(a => artworkKey(a) === key) ? room : [...room, action.artwork],
        },
      };
    }

    case 'rejectSuccess':
      return {
        ...state,
        busySubmissionId: null,
        submissions: state.submissions.filter(s => s.id !== action.submissionId),
        settledSubmissionIds: addOnce(state.settledSubmissionIds, action.submissionId),
      };

    case 'approveFailure':
    case 'rejectFailure':
      return { ...state, busySubmissionId: null, actionError: action.message };

    case 'removeStart':
      // Optimistic: the row disappears immediately, rolled back by removeFailure.
      return {
        ...state,
        busyArtworkId: action.artworkId,
        actionError: '',
        removedArtworkIds: addOnce(state.removedArtworkIds, action.artworkId),
        approvedArtworkIds: state.approvedArtworkIds.filter(id => id !== action.artworkId),
        publishingArtworkIds: state.publishingArtworkIds.filter(id => id !== action.artworkId),
        publishingSubmissions: state.publishingSubmissions.filter(s => s.id !== action.artworkId),
        artworks: {
          ...state.artworks,
          [action.roomId]: (state.artworks[action.roomId] ?? [])
            .filter(a => artworkKey(a) !== action.artworkId),
        },
      };

    case 'removeSuccess':
      return { ...state, busyArtworkId: null };

    case 'removeFailure':
      return {
        ...state,
        busyArtworkId: null,
        actionError: action.message,
        removedArtworkIds: state.removedArtworkIds.filter(id => id !== action.artworkId),
        artworks: { ...state.artworks, [action.roomId]: action.snapshot },
      };

    case 'artworkUpdateStart':
      return { ...state, busyArtworkId: action.artworkId, actionError: '' };

    case 'artworkUpdateSuccess': {
      const key = artworkKey(action.artwork);
      if (action.previousRoomId === action.roomId) {
        return {
          ...state,
          busyArtworkId: null,
          approvedArtworkIds: addOnce(state.approvedArtworkIds, key),
          removedArtworkIds: state.removedArtworkIds.filter(id => id !== key),
          artworks: {
            ...state.artworks,
            [action.roomId]: (state.artworks[action.roomId] ?? [])
              .map(a => artworkKey(a) === key ? action.artwork : a),
          },
        };
      }

      const previous = (state.artworks[action.previousRoomId] ?? [])
        .filter(a => artworkKey(a) !== key);
      const target = (state.artworks[action.roomId] ?? []).filter(a => artworkKey(a) !== key);

      return {
        ...state,
        busyArtworkId: null,
        approvedArtworkIds: addOnce(state.approvedArtworkIds, key),
        removedArtworkIds: state.removedArtworkIds.filter(id => id !== key),
        artworks: {
          ...state.artworks,
          [action.previousRoomId]: previous,
          [action.roomId]: [...target, action.artwork],
        },
      };
    }

    case 'artworkUpdateFailure':
      return { ...state, busyArtworkId: null, actionError: action.message };

    case 'dismissError':
      return { ...state, actionError: '' };
  }
}

/** True while some approval is still waiting for storage to catch up. */
export function isPublishing(state: AdminState): boolean {
  return state.publishingArtworkIds.length > 0;
}

/** True when at least one room has an approved artwork. */
export function hasArtworks(artworks: Record<string, ImageMetadata[]>): boolean {
  return Object.values(artworks).some(list => list.length > 0);
}
