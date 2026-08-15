'use client';

import { useEffect, useRef } from 'react';
import { useProgress } from '@react-three/drei';
import { useAnimation } from '../../contexts/AnimationContext';

// Temporary — captures what's happening when the 3D gallery's loading screen
// gets stuck at 100% (reported 2026-08, intermittent, seen entering from the
// list view). Renders nothing; reports are best-effort and never surface to
// the visitor. Remove this component, its mount in UIElements, the two
// /api/diagnostics routes, and the Diagnostics section in lib/storage.ts once
// the bug is found — this is a debugging aid, not a feature.

const STUCK_AFTER_MS = 9000;

function navigationType(): string {
  try {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return entry?.type ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export default function LoadingDiagnostics() {
  const { currentScreen, assetsReady } = useAnimation();
  const { progress, errors: loaderErrors } = useProgress();
  const mountedAt = useRef(window.performance.now());
  const capturedErrors = useRef<string[]>([]);
  const reportedRef = useRef(false);
  const stateRef = useRef({ currentScreen, assetsReady, progress });
  stateRef.current = { currentScreen, assetsReady, progress };

  useEffect(() => {
    const pushError = (message: string) => {
      if (capturedErrors.current.length >= 20) return;
      capturedErrors.current.push(message.slice(0, 500));
    };
    const onError = (e: ErrorEvent) => pushError(`error: ${e.message}`);
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
      pushError(`unhandledrejection: ${reason}`);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const report = (event: string) => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    const payload = {
      event,
      progress: stateRef.current.progress,
      assetsReady: stateRef.current.assetsReady,
      currentScreen: stateRef.current.currentScreen,
      elapsedMs: Math.round(window.performance.now() - mountedAt.current),
      url: window.location.href,
      referrer: document.referrer,
      navigationType: navigationType(),
      errors: [...capturedErrors.current, ...loaderErrors.map(url => `loader failed: ${url}`)],
    };
    fetch('/api/diagnostics/loading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  };

  useEffect(() => {
    if (currentScreen !== 'loading') return;
    const timer = window.setTimeout(() => {
      if (stateRef.current.currentScreen === 'loading') report('stuck-loading');
    }, STUCK_AFTER_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);

  return null;
}
