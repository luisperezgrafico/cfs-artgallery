import Link from 'next/link';
import { rooms } from '../../config/roomsConfig';
import { getAllRoomArtworks } from '../../lib/storage';
import { mergeRoomArtworks } from '../../utils/roomArtworks';
import ListNavControls from '../../components/list/ListNavControls';

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
    <main className="list-view">
      <div className="list-view-header">
        <Link href="/" className="list-view-back">
          ← Back to gallery
        </Link>
        <h1 className="list-view-title">Gallery — list view</h1>
        <p className="list-view-tagline">
          Every artwork on show, in one place. No 3D scene, no camera to steer — read at your own pace.
        </p>
      </div>

      {artworks.length === 0 ? (
        <p className="list-view-empty">No artworks are on show yet — check back soon.</p>
      ) : (
        <ul className="list-view-items">
          {artworks.map(({ artwork, roomId, frameIndex }) => (
            <li key={artwork.id ?? `${roomId}-${frameIndex}`} className="list-view-item">
              {artwork.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artwork.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="list-view-thumb"
                />
              )}
              <div className="list-view-item-body">
                <h2 className="list-view-item-title">{artwork.title}</h2>
                <p className="list-view-item-meta">
                  {artwork.artist}
                  {artwork.date ? `, ${artwork.date}` : ''}
                  {artwork.medium ? ` — ${artwork.medium}` : ''}
                </p>
                {artwork.shortDescription && (
                  <p className="list-view-item-desc">{artwork.shortDescription}</p>
                )}
                {artwork.longDescription && (
                  <p className="list-view-item-desc">{artwork.longDescription}</p>
                )}
                {artwork.audioUrl && (
                  <audio controls src={artwork.audioUrl} className="list-view-item-audio">
                    Your browser does not support audio playback.
                  </audio>
                )}
                <Link href={`/?room=${roomId}&frame=${frameIndex}`} className="list-view-item-link">
                  View in the 3D gallery
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ListNavControls itemCount={artworks.length} />
    </main>
  );
}
