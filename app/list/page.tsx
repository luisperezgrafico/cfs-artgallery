import Link from 'next/link';
import { rooms } from '../../config/roomsConfig';
import { getAllRoomArtworks } from '../../lib/storage';
import { mergeRoomArtworks } from '../../utils/roomArtworks';
import ArtworkListWithLightbox from '../../components/list/ArtworkListWithLightbox';

export const dynamic = 'force-dynamic';

export default async function ListPage() {
  const liveArtworks = await getAllRoomArtworks(rooms.map(room => room.id));
  const merged = mergeRoomArtworks(rooms, liveArtworks);

  const artworks = rooms.flatMap(room =>
    merged[room.id]
      .map((artwork, frameIndex) => ({ artwork, roomId: room.id, frameIndex }))
      .filter(entry => !entry.artwork.isEmpty),
  );

  return (
    <main id="list-view-top" className="list-view">
      <div className="list-view-header">
        <Link href="/" className="list-view-back">
          ← Back to gallery
        </Link>
        <h1 className="list-view-title">Gallery — list view</h1>
      </div>

      {artworks.length === 0 ? (
        <p className="list-view-empty">No artworks are on show yet — check back soon.</p>
      ) : (
        <ArtworkListWithLightbox items={artworks} />
      )}
    </main>
  );
}
