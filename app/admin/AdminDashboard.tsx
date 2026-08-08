'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { Submission } from '../../lib/storage';
import { useAdminData, type AdminData } from './useAdminData';
import SubmissionsTab from './tabs/SubmissionsTab';
import ApprovedTab from './tabs/ApprovedTab';
import SettingsTab from './tabs/SettingsTab';
import DeveloperTab from './tabs/DeveloperTab';

type Tab = 'submissions' | 'approved' | 'settings' | 'developer';
type AdminRole = 'admin' | 'dev';

function TabBar({
  tab,
  onSelect,
  counts,
  role,
}: {
  tab: Tab;
  onSelect: (t: Tab) => void;
  counts: { submissions: number; approved: number };
  role: AdminRole;
}) {
  const tabs: Tab[] = role === 'dev'
    ? ['submissions', 'approved', 'settings', 'developer']
    : ['submissions', 'approved', 'settings'];

  return (
    <nav className="max-w-full overflow-x-auto border-b border-white/10 px-4 sm:px-6">
      <div className="flex min-w-max">
        {tabs.map(t => (
          <button key={t} onClick={() => onSelect(t)} data-testid={`tab-${t}`}
            className={`shrink-0 px-4 py-3 text-sm capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-white text-white' : 'border-transparent text-white/45 hover:text-white/70'
            }`}>
            {t}
            {t === 'submissions' && counts.submissions > 0 && (
              <span className="ml-2 text-xs text-white/40" data-testid="count-submissions">{counts.submissions}</span>
            )}
            {t === 'approved' && counts.approved > 0 && (
              <span className="ml-2 text-xs text-white/40" data-testid="count-approved">{counts.approved}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('submissions');
  const [role, setRole] = useState<AdminRole>('admin');

  // One store for the whole panel, mounted here so tab switches never remount
  // it: the tabs below are pure views over this state.
  const { state, refresh, approve, reject, remove, updateArtwork, regenerateAudio, uploadAudio, removeAudio }: AdminData = useAdminData();

  useEffect(() => {
    fetch('/api/admin/session')
      .then(r => r.json())
      .then((data: { role?: AdminRole }) => setRole(data.role === 'dev' ? 'dev' : 'admin'))
      .catch(() => setRole('admin'));
  }, []);

  const handleApprove = async (submission: Submission, roomId: string, slot: number | null) => {
    await approve(submission, roomId, slot);
    setTab('approved');
  };

  const resetRoomOneSeed = async () => {
    const res = await fetch('/api/admin/developer/reset-room-1', { method: 'POST' });
    const data = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? 'Failed to reset Room I.');
    }
    await refresh({ quiet: true });
  };

  const approvedCount = Object.values(state.artworks).reduce((n, list) => n + list.length, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-sm tracking-wide">ME/CFS Gallery — Admin</span>
        <button onClick={() => refresh()} disabled={state.loading} data-testid="refresh"
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 disabled:opacity-40 transition-colors"
          title="Reload from the server">
          <RefreshCw size={13} className={state.loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      <TabBar tab={tab} onSelect={setTab} counts={{ submissions: state.submissions.length, approved: approvedCount }} role={role} />

      <main className="px-6 py-6" data-testid="admin-main" data-loading={state.loading ? 'true' : 'false'}>
        {state.loading && (
          <div className="flex items-center justify-center py-20" data-testid="dashboard-loading">
            <Loader2 size={24} className="animate-spin text-white/40" />
          </div>
        )}

        {!state.loading && state.loadError && (
          <div className="flex flex-col items-center gap-3 py-20">
            <p className="text-red-400 text-sm" data-testid="load-error">{state.loadError}</p>
            <button onClick={() => refresh()} className="text-white/50 text-xs underline">Retry</button>
          </div>
        )}

        {!state.loading && !state.loadError && (
          <>
            {tab === 'submissions' && (
              <SubmissionsTab submissions={state.submissions} artworks={state.artworks} onApprove={handleApprove} onReject={reject} />
            )}
            {tab === 'approved' && (
              <ApprovedTab
                artworks={state.artworks}
                publishingIds={state.publishingArtworkIds}
                publishingSubmissions={state.publishingSubmissions}
                busyArtworkId={state.busyArtworkId}
                actionError={state.actionError}
                onRemove={remove}
                onUpdate={updateArtwork}
                onRegenerateAudio={regenerateAudio}
                onUploadAudio={uploadAudio}
                onRemoveAudio={removeAudio}
              />
            )}
            {tab === 'settings' && <SettingsTab />}
            {tab === 'developer' && <DeveloperTab onReset={resetRoomOneSeed} />}
          </>
        )}
      </main>
    </div>
  );
}
