'use client';

import React, { useState } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, Eye, XCircle } from 'lucide-react';
import type { Submission } from '../../../lib/storage';
import { timeAgo } from '../helpers';
import Lightbox from './Lightbox';

export default function SubmissionCard({
  submission,
  onApprove,
  onReject,
}: {
  submission: Submission;
  onApprove: (s: Submission) => void;
  onReject: (s: Submission) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      {lightbox && <Lightbox url={submission.imageUrl} onClose={() => setLightbox(false)} />}
      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden"
        data-testid="submission-card" data-submission-id={submission.id}>
        <div className="flex gap-4 p-4">
          <button onClick={() => setLightbox(true)} title="View full image"
            className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-zinc-800 relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={submission.imageUrl} alt={submission.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye size={18} className="text-white" />
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{submission.title}</p>
            <p className="text-white/60 text-xs mt-0.5">
              {submission.artist}
              {submission.medium ? ` · ${submission.medium}` : ''}
              {submission.year ? ` · ${submission.year}` : ''}
            </p>
            <p className="text-white/35 text-xs mt-1">{timeAgo(submission.submittedAt)}</p>

            {(submission.shortDescription || submission.statement) && (
              <button onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 text-white/45 hover:text-white/70 text-xs mt-2 transition-colors">
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Hide' : 'Read statement'}
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 space-y-2">
            {submission.shortDescription && (
              <p className="text-white/70 text-xs italic border-t border-white/10 pt-3">
                &ldquo;{submission.shortDescription}&rdquo;
              </p>
            )}
            {submission.statement && (
              <p className="text-white/55 text-sm leading-relaxed whitespace-pre-line border-t border-white/10 pt-2">
                {submission.statement}
              </p>
            )}
          </div>
        )}

        <div className="flex border-t border-white/10">
          <button onClick={() => onApprove(submission)} data-testid="approve-button"
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-emerald-400 hover:bg-emerald-900/30 transition-colors">
            <CheckCircle size={15} /> Approve
          </button>
          <div className="w-px bg-white/10" />
          <button onClick={() => onReject(submission)} data-testid="reject-button"
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-red-400 hover:bg-red-900/30 transition-colors">
            <XCircle size={15} /> Reject
          </button>
        </div>
      </div>
    </>
  );
}
