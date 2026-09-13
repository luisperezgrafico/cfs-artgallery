'use client';

import React, { lazy, Suspense } from 'react';
import { frameDesignForRoom } from '../../utils/frameDesign';
import ProceduralFrame from './ProceduralFrame';

const ImportedFrame = lazy(() => import('./ImportedFrame'));

/** A missing decorative asset must never take the gallery or artworks down. */
class FrameAssetBoundary extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.warn('Ornate frame unavailable; using local moulding.', error.message); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function FrameMoulding({ width, height, roomId }: {
  width: number;
  height: number;
  roomId?: string;
}) {
  const design = frameDesignForRoom(roomId);
  const procedural = <ProceduralFrame width={width} height={height} design={design} />;
  if (design.id !== 'gilt') return procedural;
  return (
    <FrameAssetBoundary fallback={procedural}>
      <Suspense fallback={procedural}>
        <ImportedFrame width={width} height={height} />
      </Suspense>
    </FrameAssetBoundary>
  );
}
