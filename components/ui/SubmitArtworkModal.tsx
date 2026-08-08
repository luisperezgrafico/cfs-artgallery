'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import ContentNotesDropdown from './ContentNotesDropdown';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_LABEL = 'JPG, PNG or WEBP · max 5 MB';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface FormValues {
  title: string;
  name: string;
  email: string;
  medium: string;
  year: string;
  shortDescription: string;
  statement: string;
  contentNotes: string[];
  file: File | null;
  aspectRatio: number | null;
}

interface FieldErrors {
  title?: string;
  name?: string;
  email?: string;
  shortDescription?: string;
  file?: string;
}

// ── Shared style tokens ────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  boxShadow: 'var(--panel-shadow)',
  borderRadius: '2px',
};

const serif = "Georgia, 'Times New Roman', serif";

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  background: 'var(--field-bg)',
  border: '1px solid var(--field-border)',
  borderRadius: '2px',
  fontFamily: serif,
  fontSize: '0.875rem',
  color: 'var(--field-text)',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: serif,
  fontSize: '0.7rem',
  color: 'var(--field-label)',
  marginBottom: '0.35rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
};

const errorText: React.CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: '0.7rem',
  color: '#b55a3a',
  marginTop: '0.3rem',
};

// ── Component ──────────────────────────────────────────────────────────────

const SubmitArtworkModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [values, setValues] = useState<FormValues>({ title: '', name: '', email: '', medium: '', year: '', shortDescription: '', statement: '', contentNotes: [], file: null, aspectRatio: null });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [preferredRoom, setPreferredRoom] = useState('');
  // The empty canvas the artist tapped — the piece should be hung right there.
  const [preferredSlot, setPreferredSlot] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setSubmitState('idle');
    setValues({ title: '', name: '', email: '', medium: '', year: '', shortDescription: '', statement: '', contentNotes: [], file: null, aspectRatio: null });
    setFieldErrors({});
    setSubmitError('');
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setPreview(null);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ roomId?: string; slot?: number }>).detail;
      setPreferredRoom(detail?.roomId ?? '');
      setPreferredSlot(typeof detail?.slot === 'number' ? detail.slot : null);
      reset();
      setIsOpen(true);
    };
    window.addEventListener('open-submit-artwork', handler);
    return () => window.removeEventListener('open-submit-artwork', handler);
  }, [reset]);

  // Notify SwipeableContainer whenever modal closes for any reason
  useEffect(() => {
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent('close-submit-artwork'));
    }
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);

  // File selection — also computes aspectRatio from the image's natural dimensions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type)) {
      setFieldErrors(p => ({ ...p, file: 'File must be JPG, PNG or WEBP.' }));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFieldErrors(p => ({ ...p, file: 'File must be under 5 MB.' }));
      return;
    }
    setFieldErrors(p => ({ ...p, file: undefined }));
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreview(url);

    // Compute aspect ratio from the image's natural pixel dimensions
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      setValues(p => ({ ...p, file, aspectRatio: ratio }));
    };
    img.src = url;
    // Set file immediately (ratio updates asynchronously, typically < 50ms)
    setValues(p => ({ ...p, file, aspectRatio: null }));
  };

  // Validation
  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (!values.title.trim()) errs.title = 'Title is required.';
    if (!values.name.trim()) errs.name = 'Name is required.';
    if (!values.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!values.shortDescription.trim()) {
      errs.shortDescription = 'Brief summary is required.';
    }
    if (!values.file) errs.file = 'Please select your artwork file.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !values.file) return;
    setSubmitState('submitting');
    setSubmitError('');
    try {
      const body = new FormData();
      body.append('title', values.title.trim());
      body.append('artist', values.name.trim());
      body.append('email', values.email.trim());
      body.append('medium', values.medium.trim());
      body.append('year', values.year.trim());
      body.append('shortDescription', values.shortDescription.trim());
      body.append('statement', values.statement.trim());
      body.append('contentNotes', JSON.stringify(values.contentNotes));
      body.append('aspectRatio', String(values.aspectRatio ?? 1));
      if (preferredRoom) body.append('preferredRoom', preferredRoom);
      if (preferredSlot !== null) body.append('preferredSlot', String(preferredSlot));
      body.append('file', values.file);

      const res = await fetch('/api/submit', { method: 'POST', body });
      const data = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setSubmitError(data.error ?? 'Something went wrong. Please try again.');
        setSubmitState('error');
      } else {
        setSubmitState('success');
      }
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      setSubmitState('error');
    }
  };

  if (!isOpen) return null;

  const safeAreaPadding = 'max(1.25rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left))';
  const busy = submitState === 'submitting';

  return (
    <div>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.28s ease-out' }}
        onClick={close}
      />

      {/* Panel wrapper */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        style={{ padding: safeAreaPadding, animation: 'scaleInSmooth 0.34s ease-out forwards' }}
      >
        <div className="pointer-events-auto w-full max-w-lg flex flex-col max-h-[92dvh]" style={panelStyle}>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <h2 style={{ fontFamily: serif, color: 'var(--panel-title)', fontSize: '1.1rem', fontWeight: 600 }}>
                Submit your artwork
              </h2>
              <p style={{ fontFamily: serif, color: 'var(--panel-subtitle)', fontSize: '0.8rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                Reviewed before appearing in the gallery.
              </p>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
              style={{ color: 'var(--panel-btn-text)' }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="mx-6" style={{ borderTop: '1px solid var(--panel-separator)' }} />

          {/* ── Success state ── */}
          {submitState === 'success' ? (
            <div className="flex flex-col items-center justify-center px-8 py-10 gap-4 text-center">
              <CheckCircle size={38} style={{ color: '#7a9e6e' }} />
              <p style={{ fontFamily: serif, color: 'var(--panel-title)', fontSize: '1rem', fontWeight: 600 }}>
                Thank you!
              </p>
              <p style={{ fontFamily: serif, color: 'var(--panel-subtitle)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                Your artwork has been submitted and is awaiting review.<br />
                We'll be in touch at <strong>{values.email}</strong>.
              </p>
              <button
                onClick={close}
                className="mt-1 px-6 py-2.5 text-sm transition-colors"
                style={{ fontFamily: serif, background: 'var(--panel-btn-bg)', color: 'var(--panel-btn-text)', border: '1px solid var(--panel-border)', borderRadius: '2px' }}
              >
                Close
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} noValidate className="overflow-y-auto px-6 py-5 flex flex-col gap-4">

              {/* Title */}
              <div>
                <label style={labelStyle}>Title of the artwork *</label>
                <input
                  type="text"
                  value={values.title}
                  onChange={e => setValues(p => ({ ...p, title: e.target.value }))}
                  style={inputStyle}
                  placeholder="What is this piece called?"
                  disabled={busy}
                />
                {fieldErrors.title && <p style={errorText}>{fieldErrors.title}</p>}
              </div>

              {/* Name */}
              <div>
                <label style={labelStyle}>Your name or handle *</label>
                <input
                  type="text"
                  value={values.name}
                  onChange={e => setValues(p => ({ ...p, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="How you'd like to be credited"
                  disabled={busy}
                  autoComplete="name"
                />
                {fieldErrors.name && <p style={errorText}>{fieldErrors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email address *</label>
                <input
                  type="email"
                  value={values.email}
                  onChange={e => setValues(p => ({ ...p, email: e.target.value }))}
                  style={inputStyle}
                  placeholder="you@example.com"
                  disabled={busy}
                  autoComplete="email"
                />
                {fieldErrors.email && <p style={errorText}>{fieldErrors.email}</p>}
              </div>

              {/* Medium + Year row */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>
                    Medium{' '}
                    <span style={{ opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={values.medium}
                    onChange={e => setValues(p => ({ ...p, medium: e.target.value }))}
                    style={inputStyle}
                    placeholder="e.g. Watercolour"
                    disabled={busy}
                  />
                </div>
                <div style={{ width: '6rem' }}>
                  <label style={labelStyle}>
                    Year{' '}
                    <span style={{ opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>(opt.)</span>
                  </label>
                  <input
                    type="text"
                    value={values.year}
                    onChange={e => setValues(p => ({ ...p, year: e.target.value }))}
                    style={inputStyle}
                    placeholder="2024"
                    maxLength={4}
                    disabled={busy}
                  />
                </div>
              </div>

              {/* Short description */}
              <div>
                <label style={labelStyle}>Brief summary *</label>
                <textarea
                  value={values.shortDescription}
                  onChange={e => setValues(p => ({ ...p, shortDescription: e.target.value }))}
                  style={{ ...inputStyle, minHeight: '3.75rem', resize: 'vertical' }}
                  placeholder="A short description helps visitors understand your work and lets us create the audio narration."
                  disabled={busy}
                />
                {fieldErrors.shortDescription && <p style={errorText}>{fieldErrors.shortDescription}</p>}
              </div>

              {/* Statement */}
              <div>
                <label style={labelStyle}>
                  Full statement{' '}
                  <span style={{ opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                  value={values.statement}
                  onChange={e => setValues(p => ({ ...p, statement: e.target.value }))}
                  style={{ ...inputStyle, minHeight: '4.5rem', resize: 'vertical' }}
                  placeholder="Your process, what this piece means to you…"
                  disabled={busy}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Content notes{' '}
                  <span style={{ opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <ContentNotesDropdown
                  value={values.contentNotes}
                  onChange={contentNotes => setValues(p => ({ ...p, contentNotes }))}
                  disabled={busy}
                  variant="panel"
                />
                <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', color: 'var(--field-hint)', marginTop: '0.35rem' }}>
                  Choose any notes visitors may want before opening or reading the piece.
                </p>
              </div>

              {/* File upload */}
              <div>
                <label style={labelStyle}>Your artwork *</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="w-full flex flex-col items-center gap-2 py-4 transition-colors"
                  style={{
                    background: preview ? 'var(--field-bg)' : 'var(--field-bg-soft)',
                    border: '1px dashed var(--field-border)',
                    borderRadius: '2px',
                    cursor: busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Preview" style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain', borderRadius: '2px' }} />
                  ) : (
                    <Upload size={20} style={{ color: 'var(--field-icon)' }} />
                  )}
                  <span style={{ fontFamily: serif, fontSize: '0.8rem', color: 'var(--field-text)' }}>
                    {values.file ? values.file.name : 'Choose image'}
                  </span>
                  {!preview && (
                    <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', color: 'var(--field-hint)' }}>
                      {ACCEPTED_LABEL}
                    </span>
                  )}
                </button>
                {fieldErrors.file && <p style={errorText}>{fieldErrors.file}</p>}
              </div>

              {/* Generic submit error */}
              {submitState === 'error' && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5"
                  style={{ background: 'rgba(180,90,60,0.07)', border: '1px solid rgba(180,90,60,0.25)', borderRadius: '2px' }}
                >
                  <AlertCircle size={14} style={{ color: '#b55a3a', flexShrink: 0 }} />
                  <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', color: '#b55a3a' }}>
                    {submitError}
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 text-sm transition-colors"
                style={{
                  fontFamily: serif,
                  background: busy ? 'var(--panel-btn-bg)' : 'var(--panel-btn-bg-hover)',
                  color: busy ? 'var(--panel-subtitle)' : 'var(--panel-btn-text)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '2px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.03em',
                }}
              >
                {busy ? 'Submitting…' : 'Submit artwork'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmitArtworkModal;
