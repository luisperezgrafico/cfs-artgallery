'use client';

function closestItemIndex(items: HTMLElement[]): number {
  let closest = 0;
  let closestDistance = Infinity;
  items.forEach((item, i) => {
    const distance = Math.abs(item.getBoundingClientRect().top);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = i;
    }
  });
  return closest;
}

/**
 * Fixed anterior/siguiente bar for the list view — a lighter-effort way to move
 * between artworks than repeated scrolling, mainly for mobile. Deliberately
 * stateless (no scroll tracking, no "you are here" indicator): each click just
 * finds whichever item is nearest the top of the viewport and scrolls to its
 * neighbour, so it can never drift out of sync with manual scrolling.
 */
export default function ListNavControls({ itemCount }: { itemCount: number }) {
  if (itemCount < 2) return null;

  const go = (direction: 1 | -1) => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.list-view-item'));
    if (items.length === 0) return;

    const current = closestItemIndex(items);
    const next = Math.max(0, Math.min(items.length - 1, current + direction));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    items[next].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="list-nav-controls" role="navigation" aria-label="Jump between artworks">
      <button type="button" onClick={() => go(-1)} className="list-nav-btn" aria-label="Previous artwork">
        ↑ Previous
      </button>
      <button type="button" onClick={() => go(1)} className="list-nav-btn" aria-label="Next artwork">
        Next ↓
      </button>
    </div>
  );
}
