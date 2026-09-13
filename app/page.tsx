'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { parseGalleryLink } from '@/utils/galleryLink';

const Gallery = dynamic(() => import('@/components/Gallery'), {
  ssr: false,
  loading: () => <main className="door" aria-label="Entering gallery" />,
});

function Door() {
  const searchParams = useSearchParams();
  // A shared link is a destination, not a preference. It decides where this
  // visit opens, and it deliberately does NOT write the visit position saved on
  // this device — opening someone's link must not erase where the visitor was
  // (utils/userPreferences: room + slot, read by RoomProvider and the list view).
  const link = useMemo(() => parseGalleryLink(searchParams), [searchParams]);
  const [entered, setEntered] = useState(link !== null);

  // useSearchParams is empty on the very first client render; enter as soon as
  // the link shows up instead of charging the visitor a click on the door.
  useEffect(() => {
    if (link) setEntered(true);
  }, [link]);

  if (entered) return <Gallery link={link} />;

  return (
    <main className="door">
      <ThemeToggle className="door-toggle" />
      <h1 className="door-title">ME/CFS Community Gallery</h1>
      <p className="door-tagline">
        A quiet place to be with art made by our community.
        <br />
        Take it at your own pace.
      </p>
      <div className="door-actions">
        <button className="door-enter" onClick={() => setEntered(true)}>
          Enter the gallery
        </button>
        <Link href="/list#list-view-top" className="door-list-link">
          Simple list view
        </Link>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="door" aria-label="Loading" />}>
      <Door />
    </Suspense>
  );
}
