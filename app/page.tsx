'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Gallery = dynamic(() => import('@/components/Gallery'), {
  ssr: false,
  loading: () => (
    <div className="door" role="status">
      <p className="door-tagline">Preparing the room…</p>
    </div>
  ),
});

export default function Home() {
  const [entered, setEntered] = useState(false);

  if (entered) return <Gallery />;

  return (
    <main className="door">
      <h1 className="door-title">ME/CFS Community Gallery</h1>
      <p className="door-tagline">
        A quiet place to be with art made by our community.
        <br />
        Take it at your own pace.
      </p>
      <button className="door-enter" onClick={() => setEntered(true)}>
        Enter the gallery
      </button>
    </main>
  );
}
