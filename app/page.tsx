'use client';

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { saveVisitPosition } from '@/utils/userPreferences';

const Gallery = dynamic(() => import('@/components/Gallery'), {
  ssr: false,
  loading: () => <main className="door" aria-label="Entering gallery" />,
});

function Door() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');
  const frameParam = searchParams.get('frame');
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const frameIndex = frameParam !== null ? Number(frameParam) : -1;
    saveVisitPosition(roomId, Number.isInteger(frameIndex) ? frameIndex : -1);
    setEntered(true);
  }, [roomId, frameParam]);

  if (entered) return <Gallery />;

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
        <Link href="/list" className="door-list-link">
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
