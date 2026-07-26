'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, Eye, X, ChevronDown, ChevronUp,
  Plus, Trash2, Send, Save, Loader2,
} from 'lucide-react';
import type { Submission, GallerySettings } from '../../lib/storage';
import { rooms } from '../../config/roomsConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Image lightbox ────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/60 hover:text-white"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={24} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Full size artwork"
        className="max-w-full max-h-full object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// ── Approve modal ─────────────────────────────────────────────────────────────

function ApproveModal({
  submission,
  onConfirm,
  onClose,
}: {
  submission: Submission;
  onConfirm: (roomId: string, shortDescription: string) => void;
  onClose: () => void;
}) {
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '');
  const [short, setShort] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-white font-semibold text-base">Approve "{submission.title}"</h3>

        <div>
          <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">Assign to room</label>
          <select
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">
            Short description <span className="normal-case text-white/30">(optional — shown on the plaque)</span>
          </label>
          <textarea
            value={short}
            onChange={e => setShort(e.target.value)}
            placeholder="1–2 sentence summary visible immediately in the gallery…"
            rows={2}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => onConfirm(roomId, short)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Approve
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  submission,
  onConfirm,
  onClose,
}: {
  submission: Submission;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-white font-semibold text-base">Reject "{submission.title}"</h3>

        <div>
          <label className="block text-xs text-white/50 mb-1 uppercase tracking-wider">
            Note to the artist <span className="normal-case text-white/30">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Added to the rejection email if provided…"
            rows={3}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Submission card ───────────────────────────────────────────────────────────

function SubmissionCard({
  submission,
  onApprove,
  onReject,
}: {
  submission: Submission;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      {lightbox && <Lightbox url={submission.imageUrl} onClose={() => setLightbox(false)} />}
      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <button
            onClick={() => setLightbox(true)}
            className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-zinc-800 relative group"
            title="View full image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={submission.imageUrl}
              alt={submission.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye size={18} className="text-white" />
            </div>
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{submission.title}</p>
            <p className="text-white/60 text-xs mt-0.5">
              {submission.artist}
              {submission.medium ? ` · ${submission.medium}` : ''}
              {submission.year ? ` · ${submission.year}` : ''}
            </p>
            <p className="text-white/35 text-xs mt-1">{timeAgo(submission.submittedAt)}</p>

            {submission.statement && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 text-white/45 hover:text-white/70 text-xs mt-2 transition-colors"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Hide statement' : 'Read statement'}
              </button>
            )}
          </div>
        </div>

        {expanded && submission.statement && (
          <div className="px-4 pb-4">
            <p className="text-white/60 text-sm leading-relaxed border-t border-white/10 pt-3 whitespace-pre-line">
              {submission.statement}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex border-t border-white/10">
          <button
            onClick={() => onApprove(submission.id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-emerald-400 hover:bg-emerald-900/30 transition-colors"
          >
            <CheckCircle size={15} /> Approve
          </button>
          <div className="w-px bg-white/10" />
          <button
            onClick={() => onReject(submission.id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <XCircle size={15} /> Reject
          </button>
        </div>
      </div>
    </>
  );
}

// ── Submissions tab ───────────────────────────────────────────────────────────

function SubmissionsTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<{ id: string; type: 'approve' | 'reject' } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/submissions');
      setSubmissions(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const target = actionTarget ? submissions.find(s => s.id === actionTarget.id) : null;

  const handleApproveConfirm = async (roomId: string, shortDescription: string) => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/submissions/${actionTarget.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, shortDescription }),
      });
      setActionTarget(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/submissions/${actionTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      setActionTarget(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-white/40" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-20 text-white/35 text-sm">
        No pending submissions.
      </div>
    );
  }

  return (
    <>
      {target && actionTarget?.type === 'approve' && !busy && (
        <ApproveModal
          submission={target}
          onConfirm={handleApproveConfirm}
          onClose={() => setActionTarget(null)}
        />
      )}
      {target && actionTarget?.type === 'reject' && !busy && (
        <RejectModal
          submission={target}
          onConfirm={handleRejectConfirm}
          onClose={() => setActionTarget(null)}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {submissions.map(s => (
          <SubmissionCard
            key={s.id}
            submission={s}
            onApprove={id => setActionTarget({ id, type: 'approve' })}
            onReject={id => setActionTarget({ id, type: 'reject' })}
          />
        ))}
      </div>
    </>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  type DisplaySettings = GallerySettings & { resendApiKeySet?: boolean };
  const [settings, setSettings] = useState<DisplaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  // For the API key field: we keep a local draft separate from the masked display
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((data: DisplaySettings) => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      moderatorEmails: settings.moderatorEmails,
      approvalTemplate: settings.approvalTemplate,
      rejectionTemplate: settings.rejectionTemplate,
    };
    if (apiKeyDraft) body.resendApiKey = apiKeyDraft;
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setApiKeyDraft('');
    setTimeout(() => setSaved(false), 2500);
  };

  const sendTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Use the first moderator email as the test target
      const to = settings?.moderatorEmails[0];
      if (!to) { setTestResult('fail'); return; }
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      setTestResult(res.ok ? 'ok' : 'fail');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const addEmail = () => {
    const email = newEmail.trim();
    if (!email || !email.includes('@')) return;
    if (settings?.moderatorEmails.includes(email)) return;
    setSettings(s => s ? { ...s, moderatorEmails: [...s.moderatorEmails, email] } : s);
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    setSettings(s => s ? { ...s, moderatorEmails: s.moderatorEmails.filter(e => e !== email) } : s);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">

      {/* ── Resend API key ── */}
      <section className="space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Email service — Resend</h3>
        <div>
          <label className="block text-xs text-white/40 mb-1">API key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyDraft || (settings.resendApiKeySet ? '••••••••••••••••••••••••' : '')}
              onChange={e => setApiKeyDraft(e.target.value)}
              onFocus={() => { if (!apiKeyDraft) setApiKeyDraft(''); }}
              placeholder="re_xxxxxxxxxxxxxxxx"
              className="flex-1 bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <button
              onClick={() => setShowKey(s => !s)}
              className="px-3 text-white/40 hover:text-white/70 bg-zinc-800 border border-white/10 rounded-lg text-xs transition-colors"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={sendTestEmail}
              disabled={testing || (!settings.resendApiKeySet && !apiKeyDraft)}
              className="flex items-center gap-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-white/70 hover:text-white border border-white/10 rounded-lg text-xs transition-colors disabled:opacity-40"
            >
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {testResult === 'ok' ? 'Sent!' : testResult === 'fail' ? 'Failed' : 'Test'}
            </button>
          </div>
          <p className="text-white/25 text-xs mt-1">
            Get your key at <span className="text-white/40">resend.com</span> · Leave blank to keep the current key
          </p>
        </div>
      </section>

      {/* ── Moderator emails ── */}
      <section className="space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Moderators</h3>
        <p className="text-white/35 text-xs">Notified by email when a new artwork is submitted.</p>
        <div className="space-y-2">
          {settings.moderatorEmails.map(email => (
            <div key={email} className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-white/80">{email}</span>
              <button onClick={() => removeEmail(email)} className="text-white/30 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
              placeholder="Add email address"
              className="flex-1 bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={addEmail}
              className="flex items-center gap-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white/60 hover:text-white text-xs transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </section>

      {/* ── Email templates ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Email templates</h3>
          <p className="text-white/25 text-xs">Variables: {'{{artist}}'} {'{{title}}'} {'{{gallery_url}}'}</p>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Approval email</label>
          <textarea
            value={settings.approvalTemplate}
            onChange={e => setSettings(s => s ? { ...s, approvalTemplate: e.target.value } : s)}
            rows={6}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-y font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Rejection email</label>
          <textarea
            value={settings.rejectionTemplate}
            onChange={e => setSettings(s => s ? { ...s, rejectionTemplate: e.target.value } : s)}
            rows={6}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-y font-mono"
          />
        </div>
      </section>

      {/* ── Save ── */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-emerald-400 text-sm">Saved</span>}
      </div>
    </div>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────

type Tab = 'submissions' | 'settings';

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('submissions');

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-sm tracking-wide">ME/CFS Gallery — Admin</span>
      </header>

      {/* Tabs */}
      <nav className="border-b border-white/10 px-6">
        <div className="flex gap-0">
          {(['submissions', 'settings'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-white text-white'
                  : 'border-transparent text-white/45 hover:text-white/70'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 py-6">
        {tab === 'submissions' ? <SubmissionsTab /> : <SettingsTab />}
      </main>
    </div>
  );
}
