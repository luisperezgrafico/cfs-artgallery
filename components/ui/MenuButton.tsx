'use client';

import React from 'react';
import { Menu } from 'lucide-react';

/**
 * The button that opens the menu, and the only place the word "Menu" lives.
 *
 * It is presentational on purpose: no context, no state of its own, so the
 * question "does the icon stay while the word is gone?" is answerable without a
 * DOM (see tests/unit/menuButton.test.tsx). The word's visibility is decided by
 * the caller (`utils/menuButton`).
 *
 * `labelVisible` collapses the button to its icon circle. The label is never
 * unmounted — it shrinks to nothing and grows back, which is what the width
 * transition in `.menu-button-label` animates (app/globals.css); hiding only
 * the span would make the button jump. `aria-label` is unchanged either way.
 */
const MenuButton: React.FC<{
  labelVisible: boolean;
  onClick: () => void;
}> = ({ labelVisible, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Open menu"
    aria-expanded="false"
    data-label-visible={labelVisible ? 'true' : 'false'}
    className="menu-button fixed top-4 right-4 z-50 h-11 min-w-11 flex items-center justify-center rounded-full bg-[var(--floating-surface)] hover:bg-[var(--floating-surface-strong)] backdrop-blur-md text-[var(--floating-text)] shadow-lg"
    style={{ top: 'max(1rem, env(safe-area-inset-top))', right: 'max(1rem, env(safe-area-inset-right))' }}
  >
    <span className="menu-button-label text-sm font-medium">Menu</span>
    <Menu size={18} className="shrink-0" />
  </button>
);

export default MenuButton;
