'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const serif = "Georgia, 'Times New Roman', serif";

export default function FeedbackModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const close = () => {
    if (submitState === 'sending') return;
    setMessage('');
    setEmail('');
    setWebsite('');
    setError('');
    setSubmitState('idle');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    textareaRef.current?.focus()
      || dialogRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), textarea:not(:disabled), input:not(:disabled)',
      )).filter(element => element.tabIndex >= 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitState]);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      setError('Please enter your feedback.');
      setSubmitState('error');
      return;
    }

    setSubmitState('sending');
    setError('');
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, email, website }),
      });
      const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error ?? 'Feedback could not be sent. Please try again.');
      setSubmitState('success');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Feedback could not be sent. Please try again.');
      setSubmitState('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5" role="presentation">
      <button className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm" aria-label="Close feedback" onClick={close} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="relative z-10 w-full max-w-md"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          boxShadow: 'var(--panel-shadow)',
          borderRadius: '2px',
        }}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <h2 id="feedback-title" style={{ fontFamily: serif, color: 'var(--panel-title)', fontSize: '1.1rem', fontWeight: 600 }}>
            Share feedback
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close feedback"
            className="-mt-1 shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
            style={{ color: 'var(--panel-btn-text)' }}
          >
            <X size={16} />
          </button>
        </div>

        {submitState === 'success' ? (
          <div className="flex flex-col items-center px-8 py-8 text-center">
            <CheckCircle size={34} style={{ color: '#7a9e6e' }} />
            <p className="mt-4" role="status" style={{ fontFamily: serif, color: 'var(--panel-title)' }}>Thank you for sharing this.</p>
            <button
              type="button"
              onClick={close}
              className="mt-6 px-5 py-2 text-sm transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
              style={{ fontFamily: serif, color: 'var(--panel-btn-text)', border: '1px solid var(--panel-border)', borderRadius: '2px' }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4 border-t px-6 py-5" style={{ borderColor: 'var(--panel-separator)' }}>
            <div>
              <label htmlFor="feedback-message" className="mb-1.5 block text-xs uppercase tracking-widest" style={{ fontFamily: serif, color: 'var(--field-label)' }}>
                What would you like to share?
              </label>
              <textarea
                ref={textareaRef}
                id="feedback-message"
                value={message}
                onChange={event => setMessage(event.target.value)}
                maxLength={4000}
                rows={6}
                disabled={submitState === 'sending'}
                className="w-full resize-y px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--field-bg)', border: '1px solid var(--field-border)', borderRadius: '2px', color: 'var(--field-text)' }}
              />
            </div>

            <div>
              <label htmlFor="feedback-email" className="mb-1.5 block text-xs uppercase tracking-widest" style={{ fontFamily: serif, color: 'var(--field-label)' }}>
                Email address <span style={{ opacity: 0.55, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                disabled={submitState === 'sending'}
                autoComplete="email"
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--field-bg)', border: '1px solid var(--field-border)', borderRadius: '2px', color: 'var(--field-text)' }}
              />
            </div>

            <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="feedback-website">Website</label>
              <input id="feedback-website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} />
            </div>

            {submitState === 'error' && (
              <p className="flex items-center gap-2 text-xs" role="alert" style={{ color: '#b55a3a' }}>
                <AlertCircle size={14} /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitState === 'sending'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)] disabled:opacity-60"
              style={{ fontFamily: serif, color: 'var(--panel-btn-text)', border: '1px solid var(--panel-border)', borderRadius: '2px' }}
            >
              {submitState === 'sending' && <Loader2 size={14} className="animate-spin" />}
              {submitState === 'sending' ? 'Sending…' : 'Send feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
