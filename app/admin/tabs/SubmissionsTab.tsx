'use client';

import React, { useState } from 'react';
import type { Submission } from '../../../lib/storage';
import type { ImageMetadata } from '../../../types/museum';
import ApproveModal from '../components/ApproveModal';
import RejectModal from '../components/RejectModal';
import SubmissionCard from '../components/SubmissionCard';

export default function SubmissionsTab({
  submissions,
  artworks,
  onApprove,
  onReject,
}: {
  submissions: Submission[];
  artworks: Record<string, ImageMetadata[]>;
  onApprove: (s: Submission, roomId: string, slot: number | null) => Promise<void>;
  onReject: (s: Submission, reason: string) => Promise<void>;
}) {
  const [activeModal, setActiveModal] = useState<{ submission: Submission; type: 'approve' | 'reject' } | null>(null);

  if (submissions.length === 0) {
    return <div className="text-center py-20 text-white/35 text-sm" data-testid="submissions-empty">No pending submissions.</div>;
  }

  return (
    <>
      {activeModal?.type === 'approve' && (
        <ApproveModal
          submission={activeModal.submission}
          artworks={artworks}
          onConfirm={async (roomId, slot) => { await onApprove(activeModal.submission, roomId, slot); setActiveModal(null); }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal?.type === 'reject' && (
        <RejectModal
          submission={activeModal.submission}
          onConfirm={async reason => { await onReject(activeModal.submission, reason); setActiveModal(null); }}
          onClose={() => setActiveModal(null)}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {submissions.map(s => (
          <SubmissionCard key={s.id} submission={s}
            onApprove={s => setActiveModal({ submission: s, type: 'approve' })}
            onReject={s => setActiveModal({ submission: s, type: 'reject' })}
          />
        ))}
      </div>
    </>
  );
}
