'use client';

import React, { useState } from 'react';
import { useTour } from '../../contexts/TourContext';
import { useGuidedTourPreferences } from '../../contexts/GuidedTourContext';
import { TourPreset } from '../../utils/userPreferences';
import { estimateRoomSeconds, formatEstimate } from '../../utils/tourEstimate';

const DOORS: Array<{ preset: TourPreset; title: string; subtitle: string }> = [
  { preset: 'guided', title: 'Guided', subtitle: 'Moves on its own, with narration.' },
  { preset: 'silent', title: 'Silent', subtitle: 'Moves on its own, no voice.' },
  { preset: 'own-pace', title: 'At your own pace', subtitle: 'You move. Narration on any piece, if you want it.' },
];

const presetLabel: Record<TourPreset, string> = {
  guided: 'Guided',
  silent: 'Silent',
  'own-pace': 'At your own pace',
};

export default function TourEntryModal({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  const { images } = useTour();
  const { applyPreset, dwellSeconds, lastPreset } = useGuidedTourPreferences();
  const [view, setView] = useState<'quick' | 'doors'>(lastPreset ? 'quick' : 'doors');

  const estimateFor = (preset: TourPreset): string | null => {
    if (preset === 'own-pace') return null;
    const seconds = estimateRoomSeconds(images, { narrated: preset === 'guided', dwellSeconds });
    return formatEstimate(seconds);
  };

  const pick = (preset: TourPreset) => {
    applyPreset(preset);
    onStart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.28s ease-out' }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md p-6 space-y-5"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          boxShadow: 'var(--panel-shadow)',
          borderRadius: '2px',
          animation: 'scaleInSmooth 0.3s ease-out forwards',
        }}
      >
        <div>
          <h2
            className="text-lg"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: 'var(--panel-title)', fontWeight: 600 }}
          >
            How would you like to visit?
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--panel-subtitle)' }}>
            You can change this at any time.
          </p>
        </div>

        {view === 'quick' && lastPreset ? (
          <div className="space-y-3">
            <button
              onClick={() => pick(lastPreset)}
              className="w-full text-left px-4 py-3 transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
              style={{ border: '1px solid var(--panel-border)', borderRadius: '2px' }}
            >
              <span className="block text-sm" style={{ color: 'var(--panel-btn-text)' }}>
                Last time: {presetLabel[lastPreset]}
              </span>
              {estimateFor(lastPreset) && (
                <span className="block text-xs mt-0.5" style={{ color: 'var(--panel-subtitle)' }}>
                  {estimateFor(lastPreset)}
                </span>
              )}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => pick(lastPreset)}
                className="flex-1 py-2.5 text-sm font-medium transition-colors bg-[var(--panel-btn-bg-hover)]"
                style={{ color: 'var(--panel-btn-text)', border: '1px solid var(--panel-border)', borderRadius: '2px' }}
              >
                Continue
              </button>
              <button
                onClick={() => setView('doors')}
                className="flex-1 py-2.5 text-sm transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                style={{ color: 'var(--panel-subtitle)', border: '1px solid var(--panel-border)', borderRadius: '2px' }}
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {DOORS.map(door => (
              <button
                key={door.preset}
                onClick={() => pick(door.preset)}
                data-testid={`tour-door-${door.preset}`}
                className="w-full text-left px-4 py-3 transition-colors bg-[var(--panel-btn-bg)] hover:bg-[var(--panel-btn-bg-hover)]"
                style={{ border: '1px solid var(--panel-border)', borderRadius: '2px' }}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--panel-btn-text)' }}>{door.title}</span>
                  {estimateFor(door.preset) && (
                    <span className="text-xs shrink-0" style={{ color: 'var(--panel-subtitle)' }}>{estimateFor(door.preset)}</span>
                  )}
                </span>
                <span className="block text-xs mt-1" style={{ color: 'var(--panel-subtitle)' }}>{door.subtitle}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full text-center text-xs pt-1 transition-colors"
          style={{ color: 'var(--panel-subtitle)' }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
