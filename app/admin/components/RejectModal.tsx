'use client';

import React, { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { Submission } from '../../../lib/storage';

export default function RejectModal({
  submission,
  onConfirm,
  onClose,
}: {
  submission: Submission;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" data-testid="reject-modal">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-white font-semibold text-base">Reject &ldquo;{submission.title}&rdquo;</h3>

        <div>
          <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">
            Note to the artist <span className="normal-case text-white/30">(optional)</span>
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} disabled={busy}
            aria-label="Note to the artist"
            placeholder="Added to the rejection email if provided…" rows={3}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2" data-testid="reject-error">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={confirm} disabled={busy} data-testid="confirm-reject"
            className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {busy ? 'Rejecting…' : 'Reject'}
          </button>
          <button onClick={onClose} disabled={busy}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-60 text-white rounded-lg py-2 text-sm transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
