'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, Save, Trash2 } from 'lucide-react';
import type { AudioSettings } from '../../../lib/storage';

type DisplayAudioSettings = AudioSettings & {
  local: AudioSettings['local'] & { apiKeySet?: boolean };
  openai: AudioSettings['openai'] & { apiKeySet?: boolean };
  elevenlabs: AudioSettings['elevenlabs'];
};

type DiagnosticLogEntry = {
  event: string;
  progress: number;
  assetsReady: boolean;
  currentScreen: string;
  elapsedMs: number;
  url: string;
  referrer: string;
  navigationType: string;
  userAgent: string;
  errors: string[];
  receivedAt: string;
};

export default function DeveloperTab({ onReset }: { onReset: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'ok' | 'fail' | null>(null);
  const [message, setMessage] = useState('');
  const [audioSettings, setAudioSettings] = useState<DisplayAudioSettings | null>(null);
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioSaving, setAudioSaving] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const [localApiKeyDraft, setLocalApiKeyDraft] = useState('');
  const [openAiApiKeyDraft, setOpenAiApiKeyDraft] = useState('');
  const [diagnostics, setDiagnostics] = useState<DiagnosticLogEntry[] | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/developer/audio-settings')
      .then(async res => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json() as Promise<DisplayAudioSettings>;
      })
      .then(data => setAudioSettings(data))
      .catch(() => setAudioMessage('Failed to load audio settings.'))
      .finally(() => setAudioLoading(false));
  }, []);

  const loadDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const res = await fetch('/api/admin/developer/diagnostics');
      const data = await res.json().catch(() => null) as { entries?: DiagnosticLogEntry[] } | null;
      setDiagnostics(data?.entries ?? []);
    } catch {
      setDiagnostics([]);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const clearDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      await fetch('/api/admin/developer/diagnostics', { method: 'DELETE' });
      setDiagnostics([]);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const resetRoomOne = async () => {
    setBusy(true);
    setResult(null);
    setMessage('');
    try {
      await onReset();
      setResult('ok');
      setMessage('Room I reset with template artworks.');
    } catch (err) {
      setResult('fail');
      setMessage(err instanceof Error ? err.message : 'Failed to reset Room I.');
    } finally {
      setBusy(false);
    }
  };

  const saveAudioSettings = async () => {
    if (!audioSettings) return;
    setAudioSaving(true);
    setAudioMessage('');
    try {
      const res = await fetch('/api/admin/developer/audio-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...audioSettings,
          local: { ...audioSettings.local, apiKey: localApiKeyDraft },
          openai: { ...audioSettings.openai, apiKey: openAiApiKeyDraft },
          elevenlabs: {
            ...audioSettings.elevenlabs,
            apiKey: '',
            apiKeys: [],
          },
        }),
      });
      const data = await res.json().catch(() => null) as
        | { ok?: boolean; error?: string; audioSettings?: DisplayAudioSettings }
        | null;
      if (!res.ok || !data?.ok || !data.audioSettings) {
        throw new Error(data?.error ?? 'Failed to save audio settings.');
      }
      setAudioSettings(data.audioSettings);
      setLocalApiKeyDraft('');
      setOpenAiApiKeyDraft('');
      setAudioMessage('Audio settings saved.');
    } catch (err) {
      setAudioMessage(err instanceof Error ? err.message : 'Failed to save audio settings.');
    } finally {
      setAudioSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Audio model</h3>
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-4">
          {audioLoading || !audioSettings ? (
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading audio settings…
            </div>
          ) : (
            <>
              <div>
                <p className="text-white/35 text-xs mb-1">Provider</p>
                <select
                  value={audioSettings.provider}
                  onChange={e => setAudioSettings(s => s ? { ...s, provider: e.target.value as AudioSettings['provider'] } : s)}
                  className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm"
                  data-testid="audio-provider"
                >
                  <option value="local">Local OpenAI-compatible</option>
                  <option value="openai">OpenAI</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {audioSettings.provider === 'local' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">Base URL</p>
                    <input value={audioSettings.local.baseUrl}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, baseUrl: e.target.value } } : s)}
                      placeholder="http://127.0.0.1:8010/v1"
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Model</p>
                    <input value={audioSettings.local.model}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, model: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Voice</p>
                    <input value={audioSettings.local.voice}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, voice: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Format</p>
                    <input value={audioSettings.local.format}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, format: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Timeout ms</p>
                    <input type="number" value={audioSettings.local.timeoutMs}
                      onChange={e => setAudioSettings(s => s ? { ...s, local: { ...s.local, timeoutMs: Number(e.target.value) } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">API key</p>
                    <input value={localApiKeyDraft} onChange={e => setLocalApiKeyDraft(e.target.value)}
                      placeholder={audioSettings.local.apiKeySet ? 'Saved API key' : 'Optional'}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {audioSettings.provider === 'openai' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">Base URL</p>
                    <input value={audioSettings.openai.baseUrl}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, baseUrl: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Model</p>
                    <input value={audioSettings.openai.model}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, model: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Voice</p>
                    <input value={audioSettings.openai.voice}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, voice: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Format</p>
                    <input value={audioSettings.openai.format}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, format: e.target.value } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs mb-1">Timeout ms</p>
                    <input type="number" value={audioSettings.openai.timeoutMs}
                      onChange={e => setAudioSettings(s => s ? { ...s, openai: { ...s.openai, timeoutMs: Number(e.target.value) } } : s)}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-white/35 text-xs mb-1">API key</p>
                    <input value={openAiApiKeyDraft} onChange={e => setOpenAiApiKeyDraft(e.target.value)}
                      placeholder={audioSettings.openai.apiKeySet ? 'Saved API key' : 'Paste API key'}
                      className="w-full bg-zinc-950 text-white border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {audioSettings.provider === 'elevenlabs' && (
                <div className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-3">
                  <p className="text-white/60 text-sm">ElevenLabs is the stable narration provider.</p>
                  <p className="text-white/35 text-xs mt-1">Configure API keys, voice, model, and output format in Settings. This Developer control only changes which provider is active for testing.</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={saveAudioSettings} disabled={audioSaving} data-testid="save-audio-settings"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-zinc-950 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50 transition-colors">
                  {audioSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {audioSaving ? 'Saving…' : 'Save audio settings'}
                </button>
                {audioMessage && (
                  <span className={`text-xs ${audioMessage.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}
                    data-testid="audio-settings-result">
                    {audioMessage}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Mock data</h3>
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-white text-sm font-medium">Reset Room I with template artworks</p>
            <p className="text-white/40 text-xs mt-1">
              Replaces Room I&rsquo;s approved artworks with the built-in mock/template set for testing.
            </p>
          </div>
          <button onClick={resetRoomOne} disabled={busy} data-testid="reset-room-1-seed"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-lg text-white/80 text-sm transition-colors">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {busy ? 'Resetting…' : 'Reset Room I mocks'}
          </button>
          {message && (
            <p className={result === 'ok' ? 'text-emerald-400 text-xs' : 'text-red-400 text-xs'} data-testid="developer-result">
              {message}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-widest">Client diagnostics</h3>
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-white/40 text-xs">
            Temporary — reports of the 3D gallery&rsquo;s loading screen getting stuck, captured
            automatically from visitors&rsquo; browsers. Safe to remove once that bug is found.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={loadDiagnostics} disabled={diagnosticsLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-lg text-white/80 text-sm transition-colors">
              {diagnosticsLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Load reports
            </button>
            {diagnostics && diagnostics.length > 0 && (
              <button onClick={clearDiagnostics} disabled={diagnosticsLoading}
                className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 rounded-lg text-white/50 hover:text-red-400 text-xs transition-colors">
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>

          {diagnostics && diagnostics.length === 0 && (
            <p className="text-white/30 text-xs">No reports yet.</p>
          )}

          {diagnostics && diagnostics.length > 0 && (
            <div className="space-y-3 max-h-[32rem] overflow-y-auto">
              {diagnostics.map((entry, index) => (
                <div key={index} className="bg-zinc-950 border border-white/10 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/70">
                    <span className="font-medium text-amber-400">{entry.event}</span>
                    <span>{new Date(entry.receivedAt).toLocaleString()}</span>
                    <span>+{entry.elapsedMs}ms</span>
                  </div>
                  <p className="text-white/40">
                    progress={entry.progress}% assetsReady={String(entry.assetsReady)} screen={entry.currentScreen} nav={entry.navigationType}
                  </p>
                  <p className="text-white/40 break-all">url: {entry.url}</p>
                  {entry.referrer && <p className="text-white/40 break-all">referrer: {entry.referrer}</p>}
                  <p className="text-white/30 break-all">{entry.userAgent}</p>
                  {entry.errors.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-red-300/80">
                      {entry.errors.map((err, i) => <li key={i} className="break-all">{err}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
