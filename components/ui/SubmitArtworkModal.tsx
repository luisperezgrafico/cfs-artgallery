'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_LABEL = 'JPG, PNG or WEBP · max 5 MB';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface FormValues {
  name: string;
  email: string;
  year: string;
  description: string;
  file: File | null;
  aspectRatio: number | null;
}

interface FieldErrors {
  name?: string;
  email?: string;
  file?: string;
}

// ── Shared style tokens ────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: 'rgba(238, 230, 214, 0.97)',
  border: '1px solid rgba(160, 138, 108, 0.45)',
  boxShadow: '0 12px 40px rgba(60, 48, 32, 0.35), 0 2px 8px rgba(60, 48, 32, 0.2)',
  borderRadius: '2px',
};

const serif = "Georgia, 'Times New Roman', serif";

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  background: 'rgba(255,255,255,0.55)',
  border: '1px solid rgba(160, 138, 108, 0.4)',
  borderRadius: '2px',
  fontFamily: serif,
  fontSize: '0.875rem',
  color: '#2b3644',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: serif,
  fontSize: '0.7rem',
  color: '#8a7a68',
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
  const [values, setValues] = useState<FormValues>({ name: '', email: '', year: '', description: '', file: null, aspectRatio: null });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setSubmitState('idle');
    setValues({ name: '', email: '', year: '', description: '', file: null, aspectRatio: null });
    setFieldErrors({});
    setSubmitError('');
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setPreview(null);
  }, []);

  useEffect(() => {
    const handler = () => { reset(); setIsOpen(true); };
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
    if (!values.name.trim()) errs.name = 'Name is required.';
    if (!values.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!values.file) errs.file = 'Please select your artwork file.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Mock submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitState('submitting');
    setSubmitError('');
    await new Promise(r => setTimeout(r, 1400));
    // Mock: always succeeds (uncomment the else to test error path)
    setSubmitState('success');
    // else { setSubmitState('error'); setSubmitError('Something went wrong. Please try again.'); }
  };

  if (!isOpen) return null;

  const safeAreaPadding = 'max(1.25rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left))';
  const busy = submitState === 'submitting';

  return (
    <div>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.15s ease-out' }}
        onClick={close}
      />

      {/* Panel wrapper */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        style={{ padding: safeAreaPadding, animation: 'scaleInSmooth 0.18s ease-out forwards' }}
      >
        <div className="pointer-events-auto w-full max-w-lg flex flex-col max-h-[92dvh]" style={panelStyle}>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <h2 style={{ fontFamily: serif, color: '#2b3644', fontSize: '1.1rem', fontWeight: 600 }}>
                Submit your artwork
              </h2>
              <p style={{ fontFamily: serif, color: '#8a7a68', fontSize: '0.8rem', marginTop: '0.25rem', fontStyle: 'italic' }}>
                Reviewed before appearing in the gallery.
              </p>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[rgba(160,138,108,0.18)] hover:bg-[rgba(160,138,108,0.32)]"
              style={{ color: '#5a4f3e' }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="mx-6" style={{ borderTop: '1px solid rgba(160,138,108,0.35)' }} />

          {/* ── Success state ── */}
          {submitState === 'success' ? (
            <div className="flex flex-col items-center justify-center px-8 py-10 gap-4 text-center">
              <CheckCircle size={38} style={{ color: '#7a9e6e' }} />
              <p style={{ fontFamily: serif, color: '#2b3644', fontSize: '1rem', fontWeight: 600 }}>
                Thank you!
              </p>
              <p style={{ fontFamily: serif, color: '#5a6878', fontSize: '0.875rem', lineHeight: 1.7 }}>
                Your artwork has been submitted and is awaiting review.<br />
                We'll be in touch at <strong>{values.email}</strong>.
              </p>
              <button
                onClick={close}
                className="mt-1 px-6 py-2.5 text-sm transition-colors"
                style={{ fontFamily: serif, background: 'rgba(160,138,108,0.22)', color: '#2b3644', border: '1px solid rgba(160,138,108,0.38)', borderRadius: '2px' }}
              >
                Close
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} noValidate className="overflow-y-auto px-6 py-5 flex flex-col gap-4">

              {/* Name */}
              <div>
                <label style={labelStyle}>Full name *</label>
                <input
                  type="text"
                  value={values.name}
                  onChange={e => setValues(p => ({ ...p, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Your name"
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

              {/* Year */}
              <div>
                <label style={labelStyle}>
                  Year of the artwork{' '}
                  <span style={{ opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={values.year}
                  onChange={e => setValues(p => ({ ...p, year: e.target.value }))}
                  style={{ ...inputStyle, maxWidth: '8rem' }}
                  placeholder=""
                  maxLength={4}
                  disabled={busy}
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>
                  About this piece{' '}
                  <span style={{ opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                  value={values.description}
                  onChange={e => setValues(p => ({ ...p, description: e.target.value }))}
                  style={{ ...inputStyle, minHeight: '4.5rem', resize: 'vertical' }}
                  placeholder="Your process, what it means to you, when it was made…"
                  disabled={busy}
                />
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
                    background: preview ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)',
                    border: `1px dashed rgba(160,138,108,${preview ? '0.6' : '0.38'})`,
                    borderRadius: '2px',
                    cursor: busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Preview" style={{ maxHeight: '90px', maxWidth: '100%', objectFit: 'contain', borderRadius: '2px' }} />
                  ) : (
                    <Upload size={20} style={{ color: '#a08a6c' }} />
                  )}
                  <span style={{ fontFamily: serif, fontSize: '0.8rem', color: '#7a6a58' }}>
                    {values.file ? values.file.name : 'Tap to select image'}
                  </span>
                  {!preview && (
                    <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.68rem', color: '#b0a898' }}>
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
                  background: busy ? 'rgba(160,138,108,0.15)' : 'rgba(160,138,108,0.32)',
                  color: busy ? '#9a8a78' : '#2b3644',
                  border: '1px solid rgba(160,138,108,0.42)',
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
