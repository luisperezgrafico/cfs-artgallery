'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Pause, Play, Plus, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import type { AudioSettings, GallerySettings } from '../../../lib/storage';

type SettingsSectionId = 'email' | 'moderators' | 'templates' | 'audio';

function SettingsAccordionSection({
  id,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: SettingsSectionId;
  title: string;
  summary?: string;
  open: boolean;
  onToggle: (id: SettingsSectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/50">{title}</span>
          {summary && <span className="mt-1 block text-xs text-white/30">{summary}</span>}
        </span>
        {open ? <ChevronUp size={16} className="shrink-0 text-white/40" /> : <ChevronDown size={16} className="shrink-0 text-white/40" />}
      </button>
      {open && <div className="space-y-4 border-t border-white/10 px-4 py-4">{children}</div>}
    </section>
  );
}

export default function SettingsTab() {
  type DisplaySettings = GallerySettings & { resendApiKeySet?: boolean };
  type DisplayElevenLabsSettings = AudioSettings['elevenlabs'] & { apiKeySet?: boolean; apiKeySlotsSet?: boolean[] };
  type ElevenLabsVoice = { id: string; name: string; previewUrl?: string };
  const [settings, setSettings] = useState<DisplaySettings | null>(null);
  const [elevenLabsSettings, setElevenLabsSettings] = useState<DisplayElevenLabsSettings | null>(null);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [openSections, setOpenSections] = useState<SettingsSectionId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audioSaving, setAudioSaving] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const [voicesMessage, setVoicesMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [elevenLabsApiKeyDrafts, setElevenLabsApiKeyDrafts] = useState<string[]>(['', '', '', '']);
  const [showKey, setShowKey] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then(r => r.json()) as Promise<DisplaySettings>,
      fetch('/api/admin/settings/audio').then(r => r.json()) as Promise<DisplayElevenLabsSettings>,
    ])
      .then(([settingsData, audioData]) => {
        setSettings(settingsData);
        setElevenLabsSettings(audioData);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
  }, []);

  const toggleSection = (id: SettingsSectionId) => {
    setOpenSections(sections =>
      sections.includes(id)
        ? sections.filter(section => section !== id)
        : [...sections, id],
    );
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      moderatorEmails: settings.moderatorEmails,
      approvalTemplate: settings.approvalTemplate,
      rejectionTemplate: settings.rejectionTemplate,
    };
    if (apiKeyDraft) body.resendApiKey = apiKeyDraft;
    await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    setSaved(true);
    setApiKeyDraft('');
    setTimeout(() => setSaved(false), 2500);
  };

  const loadVoices = async () => {
    setVoicesLoading(true);
    setVoicesMessage('');
    try {
      const res = await fetch('/api/admin/settings/audio/voices');
      const data = await res.json().catch(() => null) as { voices?: ElevenLabsVoice[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load voices.');
      setVoices(data?.voices ?? []);
      setVoicesMessage((data?.voices ?? []).length > 0 ? 'Voices loaded.' : 'Save an API key before loading voices.');
    } catch (err) {
      setVoicesMessage(err instanceof Error ? err.message : 'Failed to load voices.');
    } finally {
      setVoicesLoading(false);
    }
  };

  const stopVoicePreview = () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setPreviewingVoiceId(null);
  };

  const playVoicePreview = async (voice: ElevenLabsVoice | undefined) => {
    if (!voice?.previewUrl) {
      setVoicesMessage('This voice does not include a preview sample.');
      return;
    }

    if (previewingVoiceId === voice.id) {
      stopVoicePreview();
      return;
    }

    stopVoicePreview();
    setVoicesMessage('');
    const audio = new Audio(voice.previewUrl);
    previewAudioRef.current = audio;
    setPreviewingVoiceId(voice.id);
    audio.onended = () => setPreviewingVoiceId(null);
    audio.onerror = () => {
      previewAudioRef.current = null;
      setPreviewingVoiceId(null);
      setVoicesMessage('Voice preview could not be played.');
    };

    try {
      await audio.play();
    } catch {
      previewAudioRef.current = null;
      setPreviewingVoiceId(null);
      setVoicesMessage('Voice preview could not be played.');
    }
  };

  const saveElevenLabsSettings = async () => {
    if (!elevenLabsSettings) return;
    setAudioSaving(true);
    setAudioMessage('');
    try {
      const res = await fetch('/api/admin/settings/audio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...elevenLabsSettings,
          apiKey: elevenLabsApiKeyDrafts[0] ?? '',
          apiKeys: elevenLabsApiKeyDrafts.slice(1),
        }),
      });
      const data = await res.json().catch(() => null) as
        | { ok?: boolean; error?: string; elevenlabs?: DisplayElevenLabsSettings }
        | null;
      if (!res.ok || !data?.ok || !data.elevenlabs) {
        throw new Error(data?.error ?? 'Failed to save ElevenLabs settings.');
      }
      setElevenLabsSettings(data.elevenlabs);
      setElevenLabsApiKeyDrafts(['', '', '', '']);
      setAudioMessage('ElevenLabs settings saved.');
    } catch (err) {
      setAudioMessage(err instanceof Error ? err.message : 'Failed to save ElevenLabs settings.');
    } finally {
      setAudioSaving(false);
    }
  };

  const sendTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const to = settings?.moderatorEmails[0];
      if (!to) { setTestResult('fail'); return; }
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }),
      });
      setTestResult(res.ok ? 'ok' : 'fail');
    } catch { setTestResult('fail'); }
    finally { setTesting(false); setTimeout(() => setTestResult(null), 4000); }
  };

  const addEmail = () => {
    const email = newEmail.trim();
    if (!email || !email.includes('@') || settings?.moderatorEmails.includes(email)) return;
    setSettings(s => s ? { ...s, moderatorEmails: [...s.moderatorEmails, email] } : s);
    setNewEmail('');
  };

  if (loading || !settings || !elevenLabsSettings) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-white/40" /></div>;

  const selectedVoice = voices.find(voice => voice.id === elevenLabsSettings.voiceId);
  const canPreviewSelectedVoice = Boolean(selectedVoice?.previewUrl);
  const selectedVoiceIsPreviewing = previewingVoiceId === selectedVoice?.id;

  return (
    <div className="max-w-2xl space-y-3">
      <SettingsAccordionSection
        id="email"
        title="Email - Resend"
        summary="Delivery key and test email"
        open={openSections.includes('email')}
        onToggle={toggleSection}
      >
        <div>
          <label className="block text-xs text-white/40 mb-1">API key</label>
          <div className="flex flex-wrap gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKeyDraft || (settings.resendApiKeySet ? '••••••••••••••••••••••••' : '')}
              onChange={e => setApiKeyDraft(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxx"
              className="flex-1 bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <button onClick={() => setShowKey(s => !s)}
              className="px-3 py-2 text-white/40 hover:text-white/70 bg-zinc-800 border border-white/10 rounded-lg text-xs transition-colors">
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button onClick={sendTestEmail} disabled={testing || (!settings.resendApiKeySet && !apiKeyDraft)}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white/70 hover:text-white border border-white/10 rounded-lg text-xs transition-colors disabled:opacity-40">
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {testResult === 'ok' ? 'Sent!' : testResult === 'fail' ? 'Failed' : 'Test'}
            </button>
          </div>
          <p className="text-white/25 text-xs mt-1">
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60 underline">resend.com</a>
          </p>
        </div>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        id="moderators"
        title="Moderators"
        summary="Submission notification recipients"
        open={openSections.includes('moderators')}
        onToggle={toggleSection}
      >
        <p className="text-white/35 text-xs">Notified when a new artwork is submitted.</p>
        <div className="space-y-2">
          {settings.moderatorEmails.map(email => (
            <div key={email} className="flex items-center gap-2 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2">
              <span className="flex-1 text-sm text-white/80">{email}</span>
              <button onClick={() => setSettings(s => s ? { ...s, moderatorEmails: s.moderatorEmails.filter(e => e !== email) } : s)}
                className="text-white/30 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
              placeholder="Add email address"
              className="flex-1 bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <button onClick={addEmail}
              className="flex items-center gap-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-white/60 hover:text-white text-xs transition-colors">
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        id="templates"
        title="Email templates"
        summary="{{artist}} {{title}} {{gallery_url}}"
        open={openSections.includes('templates')}
        onToggle={toggleSection}
      >
        <div className="flex items-center justify-between">
          <p className="text-white/25 text-xs">{'{{artist}}'} {'{{title}}'} {'{{gallery_url}}'}</p>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Approval</label>
          <textarea value={settings.approvalTemplate} rows={6}
            onChange={e => setSettings(s => s ? { ...s, approvalTemplate: e.target.value } : s)}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-y font-mono" />
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Rejection</label>
          <textarea value={settings.rejectionTemplate} rows={6}
            onChange={e => setSettings(s => s ? { ...s, rejectionTemplate: e.target.value } : s)}
            className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm resize-y font-mono" />
        </div>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        id="audio"
        title="ElevenLabs audio"
        summary="Stable narration provider settings"
        open={openSections.includes('audio')}
        onToggle={toggleSection}
      >
        <div>
          <p className="text-white/35 text-xs mb-1">API keys</p>
          <div className="grid gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <input
                key={index}
                value={elevenLabsApiKeyDrafts[index] ?? ''}
                onChange={e => setElevenLabsApiKeyDrafts(drafts => {
                  const next = [...drafts];
                  next[index] = e.target.value;
                  return next;
                })}
                placeholder={
                  elevenLabsSettings.apiKeySlotsSet?.[index]
                    ? `Saved ElevenLabs API key ${index + 1}`
                    : index === 0
                      ? 'Paste ElevenLabs API key'
                      : `Optional ElevenLabs API key ${index + 1}`
                }
                className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm font-mono"
              />
            ))}
          </div>
          <p className="text-white/35 text-xs mt-2">Generation tries these keys in order before showing an error.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-white/35 text-xs">Voice</p>
              <button
                type="button"
                onClick={loadVoices}
                disabled={voicesLoading}
                className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 disabled:opacity-40"
              >
                {voicesLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Load voices
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={elevenLabsSettings.voiceId}
                onChange={e => {
                  stopVoicePreview();
                  setElevenLabsSettings(s => s ? { ...s, voiceId: e.target.value } : s);
                }}
                className="min-w-0 flex-1 bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option value={elevenLabsSettings.voiceId}>{selectedVoice?.name ?? 'Current saved voice'}</option>
                {voices
                  .filter(voice => voice.id !== elevenLabsSettings.voiceId)
                  .map(voice => <option key={voice.id} value={voice.id}>{voice.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => playVoicePreview(selectedVoice)}
                disabled={!canPreviewSelectedVoice}
                title={canPreviewSelectedVoice ? 'Preview selected voice' : 'Load voices to preview samples'}
                aria-label={selectedVoiceIsPreviewing ? 'Stop voice preview' : 'Preview selected voice'}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-white/60 transition-colors hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                {selectedVoiceIsPreviewing ? <Pause size={15} /> : <Play size={15} />}
              </button>
            </div>
            {voicesMessage && <p className="text-white/35 text-xs mt-1">{voicesMessage}</p>}
          </div>
          <div>
            <p className="text-white/35 text-xs mb-1">Model ID</p>
            <input value={elevenLabsSettings.modelId}
              onChange={e => setElevenLabsSettings(s => s ? { ...s, modelId: e.target.value } : s)}
              className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-white/35 text-xs mb-1">Output format</p>
            <input value={elevenLabsSettings.outputFormat}
              onChange={e => setElevenLabsSettings(s => s ? { ...s, outputFormat: e.target.value } : s)}
              className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <p className="text-white/35 text-xs mb-1">Timeout ms</p>
            <input type="number" value={elevenLabsSettings.timeoutMs}
              onChange={e => setElevenLabsSettings(s => s ? { ...s, timeoutMs: Number(e.target.value) } : s)}
              className="w-full bg-zinc-800 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={saveElevenLabsSettings} disabled={audioSaving} data-testid="save-elevenlabs-settings"
            className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50">
            {audioSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {audioSaving ? 'Saving...' : 'Save ElevenLabs'}
          </button>
          {audioMessage && <span className={`text-xs ${audioMessage.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>{audioMessage}</span>}
        </div>
      </SettingsAccordionSection>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-emerald-400 text-sm">Saved</span>}
      </div>
    </div>
  );
}
