'use client';

import React from 'react';
import { Menu } from 'lucide-react';

/**
 * The button that opens the menu, and the only place the word "Menu" lives.
 *
 * It is presentational on purpose: no context, no state of its own, so the
 * question "does the icon stay while the word is gone?" is answerable without a
 * DOM (see tests/unit/menuButton.test.tsx). Whether the strip is free is
 * decided by the caller (`utils/menuButton`).
 *
 * `stripFree={false}` offers the button up for collapsing; the width is narrow
 * enough for the collision only on a phone, so `app/globals.css` acts on it
 * below `md` and leaves the word alone on a desktop, where there is room for
 * both. The label is never unmounted — it shrinks to nothing and grows back,
 * because hiding only the span would make the button jump. `aria-label` is
 * unchanged either way.
 */
const MenuButton: React.FC<{
  stripFree: boolean;
  onClick: () => void;
}> = ({ stripFree, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Open menu"
    aria-expanded="false"
    data-strip-free={stripFree ? 'true' : 'false'}
    className="menu-button fixed top-4 right-4 z-50 h-11 min-w-11 flex items-center justify-center rounded-full bg-[var(--floating-surface)] hover:bg-[var(--floating-surface-strong)] backdrop-blur-md text-[var(--floating-text)] shadow-lg"
    style={{ top: 'max(1rem, env(safe-area-inset-top))', right: 'max(1rem, env(safe-area-inset-right))' }}
  >
    <span className="menu-button-label text-sm font-medium">Menu</span>
    <Menu size={18} className="shrink-0" />
  </button>
);

export default MenuButton;
