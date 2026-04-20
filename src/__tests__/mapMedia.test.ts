import { describe, expect, it } from 'vitest';
import type { Media } from '../types';
import { DEFAULT_MAP_CENTER, getMapBounds, getMapMedia } from '../utils/mapMedia';

const baseMedia: Media = {
  id: 'media-1',
  dayId: 'day-1',
  type: 'photo',
  url: 'https://example.com/photo.jpg',
  thumbnailUrl: 'https://example.com/photo-thumb.jpg',
  storagePath: 'media/day-1/photo.jpg',
  fileName: 'tokyo.jpg',
  capturedAt: new Date('2026-04-15T12:00:00Z'),
  width: 1600,
  height: 900,
};

describe('mapMedia helpers', () => {
  it('filters out media without coordinates', () => {
    const media: Media[] = [
      { ...baseMedia, id: 'with-coordinates', latitude: 35.68, longitude: 139.76 },
      { ...baseMedia, id: 'without-coordinates' },
    ];

    expect(getMapMedia(media).map((item) => item.id)).toEqual(['with-coordinates']);
  });

  it('builds bounds from multiple map points', () => {
    const media: Media[] = [
      { ...baseMedia, id: 'a', latitude: 35.68, longitude: 139.76 },
      { ...baseMedia, id: 'b', latitude: 34.69, longitude: 135.5 },
      { ...baseMedia, id: 'c', latitude: 43.06, longitude: 141.35 },
    ];

    expect(getMapBounds(media)).toEqual([
      [34.69, 135.5],
      [43.06, 141.35],
    ]);
  });

  it('returns null bounds when no coordinates exist', () => {
    expect(getMapBounds([{ ...baseMedia, id: 'no-geo' }])).toBeNull();
    expect(DEFAULT_MAP_CENTER).toEqual([35.6762, 139.6503]);
  });
});
