'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { contentNoteOptions } from '../../config/contentNotes';

function toggleContentNote(notes: string[], note: string): string[] {
  return notes.includes(note)
    ? notes.filter(item => item !== note)
    : [...notes, note];
}

export default function ContentNotesDropdown({
  value,
  onChange,
  disabled = false,
  variant = 'admin',
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  variant?: 'admin' | 'panel';
}) {
  const [open, setOpen] = useState(false);
  const selectedLabels = contentNoteOptions
    .filter(note => value.includes(note.value))
    .map(note => note.label);
  const summary = selectedLabels.length === 0
    ? 'No content notes'
    : selectedLabels.length <= 2
      ? selectedLabels.join(', ')
      : `${selectedLabels.length} selected`;
  const triggerClass = variant === 'panel'
    ? 'bg-[var(--field-bg)] text-[var(--field-text)] border-[var(--field-border)] hover:bg-[var(--field-bg-soft)]'
    : 'bg-zinc-900 text-white/75 border-white/10 hover:bg-zinc-800';
  const panelClass = variant === 'panel'
    ? 'bg-[var(--panel-bg)] border-[var(--panel-border)]'
    : 'bg-zinc-950 border-white/10';
  const itemClass = variant === 'panel'
    ? 'text-[var(--panel-text)] hover:bg-[var(--panel-btn-bg)]'
    : 'text-white/65 hover:bg-white/5';
  const mutedClass = variant === 'panel' ? 'text-[var(--panel-subtitle)]' : 'text-white/35';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${triggerClass}`}
        aria-expanded={open}
      >
        <span className="truncate">{summary}</span>
        {open ? <ChevronUp size={15} className={`shrink-0 ${mutedClass}`} /> : <ChevronDown size={15} className={`shrink-0 ${mutedClass}`} />}
      </button>

      {open && (
        <div
          className={`max-h-56 overflow-y-auto rounded-lg border p-2 ${panelClass}`}
          data-testid="content-notes-menu"
        >
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {contentNoteOptions.map(note => (
              <label
                key={note.value}
                className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors ${itemClass}`}
              >
                <input
                  type="checkbox"
                  checked={value.includes(note.value)}
                  onChange={() => onChange(toggleContentNote(value, note.value))}
                  disabled={disabled}
                  className="h-3.5 w-3.5 accent-white"
                />
                {note.label}
              </label>
            ))}
          </div>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={disabled}
              className={`mt-2 border-t px-2 pt-2 text-xs transition-colors ${variant === 'panel' ? 'border-[var(--panel-border)] text-[var(--panel-subtitle)] hover:text-[var(--panel-text)]' : 'border-white/10 text-white/35 hover:text-white/60'}`}
            >
              Clear content notes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
