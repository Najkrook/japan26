import type { Media } from '../types';

export type MapCoordinate = [number, number];
export type MapBounds = [MapCoordinate, MapCoordinate];

export const DEFAULT_MAP_CENTER: MapCoordinate = [35.6762, 139.6503];

const hasFiniteCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const compareMediaChronologically = (left: Media, right: Media) => {
  const timeDelta = left.capturedAt.getTime() - right.capturedAt.getTime();
  if (timeDelta !== 0) {
    return timeDelta;
  }

  const dayDelta = left.dayId.localeCompare(right.dayId);
  if (dayDelta !== 0) {
    return dayDelta;
  }

  return left.id.localeCompare(right.id);
};

const getSortedMapMedia = (media: Media[]) => getMapMedia(media).slice().sort(compareMediaChronologically);

const getSortedDayMedia = (media: Media[]) => {
  const sortedMedia = getSortedMapMedia(media);
  const dayMediaMap = new Map<string, Media[]>();

  sortedMedia.forEach((item) => {
    const dayMedia = dayMediaMap.get(item.dayId);
    if (dayMedia) {
      dayMedia.push(item);
      return;
    }

    dayMediaMap.set(item.dayId, [item]);
  });

  return {
    sortedMedia,
    dayMediaMap,
  };
};

export const hasMapCoordinates = (item: Media): boolean =>
  hasFiniteCoordinate(item.latitude) && hasFiniteCoordinate(item.longitude);

export const getMapMedia = (media: Media[]): Media[] => media.filter(hasMapCoordinates);

export interface DayStop {
  dayId: string;
  coordinate: MapCoordinate;
  media: Media[];
}

export interface MapPhotoPoint {
  media: Media;
  coordinate: MapCoordinate;
  dayMedia: Media[];
  mediaIndex: number;
}

interface CoordinateItem {
  coordinate: MapCoordinate;
}

export const getJourneyPath = (media: Media[]): DayStop[] => {
  const { dayMediaMap } = getSortedDayMedia(media);

  return Array.from(dayMediaMap.entries())
    .map(([dayId, dayMedia]) => {
      const lat =
        dayMedia.reduce((sum, item) => sum + item.latitude!, 0) / dayMedia.length;
      const lng =
        dayMedia.reduce((sum, item) => sum + item.longitude!, 0) / dayMedia.length;

      return {
        dayId,
        coordinate: [lat, lng] as MapCoordinate,
        media: dayMedia,
      };
    })
    .sort((left, right) => left.dayId.localeCompare(right.dayId));
};

export const getMapPhotoPoints = (media: Media[]): MapPhotoPoint[] => {
  const { sortedMedia, dayMediaMap } = getSortedDayMedia(media);
  const mediaIndexById = new Map<string, number>();

  dayMediaMap.forEach((dayMedia) => {
    dayMedia.forEach((item, index) => {
      mediaIndexById.set(item.id, index);
    });
  });

  return sortedMedia.map((item) => ({
    media: item,
    coordinate: [item.latitude!, item.longitude!] as MapCoordinate,
    dayMedia: dayMediaMap.get(item.dayId) ?? [item],
    mediaIndex: mediaIndexById.get(item.id) ?? 0,
  }));
};

export const getMapBounds = (items: Media[] | CoordinateItem[]): MapBounds | null => {
  if (items.length === 0) {
    return null;
  }

  const points =
    'coordinate' in items[0]
      ? (items as CoordinateItem[]).map((item) => item.coordinate)
      : getMapMedia(items as Media[]).map((item) => [item.latitude!, item.longitude!] as MapCoordinate);

  if (points.length === 0) {
    return null;
  }

  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLng = points[0][1];
  let maxLng = points[0][1];

  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
};
