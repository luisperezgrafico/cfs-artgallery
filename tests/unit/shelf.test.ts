import { describe, expect, it } from 'vitest';
import { reconcileShelf, type ShelfItem, type ShelfRoomSnapshot } from '../../utils/userPreferences';

const saved: ShelfItem[] = [
  {
    id: 'piece-a',
    title: 'Old title',
    artist: 'Old artist',
    url: '/old.jpg',
    roomId: 'room-1',
    frameIndex: 0,
  },
  {
    id: 'piece-removed',
    title: 'Removed work',
    artist: 'Artist',
    url: '/removed.jpg',
    roomId: 'room-1',
    frameIndex: 1,
  },
];

describe('reconcileShelf', () => {
  it('updates saved metadata and location using the stable artwork id', () => {
    const rooms: ShelfRoomSnapshot[] = [
      { roomId: 'room-1', images: [] },
      {
        roomId: 'room-2',
        images: [
          { title: 'Empty frame', artist: '', url: '/empty.jpg' },
          {
            id: 'piece-a',
            title: 'Current title',
            artist: 'Current artist',
            url: '/current.jpg',
            contentNotes: ['grief'],
          },
        ],
      },
    ];

    expect(reconcileShelf(saved, rooms)).toEqual([
      {
        id: 'piece-a',
        title: 'Current title',
        artist: 'Current artist',
        url: '/current.jpg',
        contentNotes: ['grief'],
        roomId: 'room-2',
        frameIndex: 1,
      },
    ]);
  });

  it('removes a favourite when its artwork no longer exists', () => {
    expect(reconcileShelf(saved, [
      { roomId: 'room-1', images: [] },
      { roomId: 'room-2', images: [] },
    ])).toEqual([]);
  });
});
