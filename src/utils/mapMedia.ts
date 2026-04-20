import type { Media } from '../types';

export type MapCoordinate = [number, number];
export type MapBounds = [MapCoordinate, MapCoordinate];

export const DEFAULT_MAP_CENTER: MapCoordinate = [35.6762, 139.6503];

const hasFiniteCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const hasMapCoordinates = (item: Media): boolean =>
  hasFiniteCoordinate(item.latitude) && hasFiniteCoordinate(item.longitude);

export const getMapMedia = (media: Media[]): Media[] => media.filter(hasMapCoordinates);

export const getMapBounds = (media: Media[]): MapBounds | null => {
  const mapMedia = getMapMedia(media);

  if (mapMedia.length === 0) {
    return null;
  }

  let minLat = mapMedia[0].latitude!;
  let maxLat = mapMedia[0].latitude!;
  let minLng = mapMedia[0].longitude!;
  let maxLng = mapMedia[0].longitude!;

  for (const item of mapMedia) {
    const latitude = item.latitude!;
    const longitude = item.longitude!;

    minLat = Math.min(minLat, latitude);
    maxLat = Math.max(maxLat, latitude);
    minLng = Math.min(minLng, longitude);
    maxLng = Math.max(maxLng, longitude);
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
};
