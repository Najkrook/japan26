import type { Media } from '../types';

export type MapCoordinate = [number, number];
export type MapBounds = [MapCoordinate, MapCoordinate];

export const DEFAULT_MAP_CENTER: MapCoordinate = [35.6762, 139.6503];

const hasFiniteCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const hasMapCoordinates = (item: Media): boolean =>
  hasFiniteCoordinate(item.latitude) && hasFiniteCoordinate(item.longitude);

export const getMapMedia = (media: Media[]): Media[] => media.filter(hasMapCoordinates);

export interface DayStop {
  dayId: string;
  coordinate: MapCoordinate;
  media: Media[];
}

export const getJourneyPath = (media: Media[]): DayStop[] => {
  const mapMedia = getMapMedia(media);
  if (mapMedia.length === 0) return [];

  // Group by dayId
  const dayGroups = mapMedia.reduce((acc, item) => {
    if (!acc[item.dayId]) acc[item.dayId] = [];
    acc[item.dayId].push(item);
    return acc;
  }, {} as Record<string, Media[]>);

  // Convert to DayStop objects
  const stops: DayStop[] = Object.entries(dayGroups).map(([dayId, items]) => {
    // Calculate average coordinate
    const lat = items.reduce((sum, item) => sum + item.latitude!, 0) / items.length;
    const lng = items.reduce((sum, item) => sum + item.longitude!, 0) / items.length;
    
    // Sort items by capturedAt to have a reliable representative image
    const sortedItems = [...items].sort((a, b) => {
      const timeA = a.capturedAt instanceof Date ? a.capturedAt.getTime() : 0;
      const timeB = b.capturedAt instanceof Date ? b.capturedAt.getTime() : 0;
      return timeA - timeB;
    });

    return {
      dayId,
      coordinate: [lat, lng] as MapCoordinate,
      media: sortedItems
    };
  });

  // Sort stops by dayId (YYYY-MM-DD format ensures chronological order)
  return stops.sort((a, b) => a.dayId.localeCompare(b.dayId));
};

export const getMapBounds = (media: Media[]|DayStop[]): MapBounds | null => {
  let points: MapCoordinate[] = [];
  
  if (media.length === 0) return null;

  if ('coordinate' in media[0]) {
    points = (media as DayStop[]).map(s => s.coordinate);
  } else {
    points = getMapMedia(media as Media[]).map(m => [m.latitude!, m.longitude!] as MapCoordinate);
  }

  if (points.length === 0) return null;

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
