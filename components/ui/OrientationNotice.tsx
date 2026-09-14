'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  dismissOrientationNotice,
  readOrientationNoticeDismissed,
} from '../../utils/userPreferences';

/**
 * A phone held sideways cannot show the gallery well: measured at 844x390 the
 * control bar takes 29% of the height and lands on top of the plaque, and on
 * taller works it covers the bottom of the canvas. Reframing the camera for
 * that viewport would mean a second framing to keep in step, so the visitor is
 * simply told once instead.
 *
 * It never blocks: "Continue anyway" is always there and the choice is
 * remembered on the device, because the visitor may not be able to turn the
 * phone at all.
 *
 * The media query is the trigger, not `max-width`: a tablet on its side is
 * wide but tall enough to show the room properly, and only a handheld in
 * landscape is both wide and short.
 */
const LANDSCAPE_PHONE_QUERY = '(orientation: landscape) and (max-height: 500px)';

/**
 * Material Design Icons `screen-rotation` (Pictogrammers, Apache-2.0), inlined
 * rather than added as a dependency. lucide, which the rest of the gallery
 * uses, has no "turn the device" icon: its closest are a bare rotation arrow or
 * a two-device glyph that reads as a phone next to a tablet, not as turning one
 * into the other. The path is verbatim from the icon's own SVG.
 */
const ScreenRotationIcon: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden="true"
    className="mx-auto"
    style={{ color: 'var(--panel-subtitle)' }}
  >
    <path d="M7.5 21.5c-3.25-1.56-5.59-4.74-5.95-8.5H.05C.56 19.16 5.71 24 12 24l.66-.03l-3.81-3.81m5.98 1.03L2.81 9.17l6.36-6.36l12.02 12.02M10.23 1.75a1.49 1.49 0 0 0-2.12 0L1.75 8.11a1.49 1.49 0 0 0 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12zm6.27.75c3.25 1.57 5.59 4.74 5.95 8.5h1.5C23.44 4.84 18.29 0 12 0l-.66.03l3.81 3.81z" />
  </svg>
);

const OrientationNotice: React.FC = () => {
  const [shown, setShown] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(LANDSCAPE_PHONE_QUERY);
    const sync = () => setShown(query.matches && !readOrientationNoticeDismissed());

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // The notice is the only thing on screen, so the way out of it takes focus.
  useEffect(() => {
    if (shown) buttonRef.current?.focus();
  }, [shown]);

  const dismiss = useCallback(() => {
    dismissOrientationNotice();
    setShown(false);
  }, []);

  if (!shown) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="orientation-notice-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: 'rgba(0, 0, 0, 0.82)' }}
    >
      <div
        className="w-full max-w-xs px-6 py-7 text-center space-y-4"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          boxShadow: 'var(--panel-shadow)',
          borderRadius: '2px',
        }}
      >
        <ScreenRotationIcon />
        <h2
          id="orientation-notice-title"
          className="text-base"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: 'var(--panel-title)',
            fontWeight: 600,
          }}
        >
          Best viewed upright
        </h2>
        <p className="text-sm" style={{ color: 'var(--panel-text)' }}>
          Designed for portrait mode. In landscape, some things may not read as
          intended.
        </p>
        <button
          ref={buttonRef}
          type="button"
          onClick={dismiss}
          className="w-full px-4 py-2.5 text-sm transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
          style={{
            color: 'var(--panel-btn-text)',
            border: '1px solid var(--panel-border)',
            borderRadius: '2px',
          }}
        >
          Continue anyway
        </button>
      </div>
    </div>
  );
};

export default OrientationNotice;
