import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import type { Comment, Day, Media } from '../types';
import { dateFromDateKey, formatDateSwedish, startOfDay } from './dateHelpers';

const timestampToDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
};

export const mapDay = (snapshot: QueryDocumentSnapshot<DocumentData>): Day => {
  const data = snapshot.data();
  const dateKey = typeof data.dateKey === 'string' ? data.dateKey : snapshot.id;
  const date = timestampToDate(data.date) ?? dateFromDateKey(dateKey);

  return {
    id: snapshot.id,
    date: startOfDay(date),
    dateKey,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : formatDateSwedish(date),
    description: typeof data.description === 'string' ? data.description : undefined,
    location: typeof data.location === 'string' ? data.location : undefined,
    itinerary: typeof data.itinerary === 'string' ? data.itinerary : undefined,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

export const mapMedia = (snapshot: QueryDocumentSnapshot<DocumentData>): Media => {
  const data = snapshot.data();
  const capturedAt = timestampToDate(data.capturedAt) ?? new Date();

  return {
    id: snapshot.id,
    dayId: typeof data.dayId === 'string' ? data.dayId : '',
    type: data.type === 'video' ? 'video' : 'photo',
    url: typeof data.url === 'string' ? data.url : '',
    thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : typeof data.url === 'string' ? data.url : '',
    storagePath: typeof data.storagePath === 'string' ? data.storagePath : '',
    fileName: typeof data.fileName === 'string' ? data.fileName : snapshot.id,
    capturedAt,
    uploadedAt: timestampToDate(data.uploadedAt),
    width: typeof data.width === 'number' ? data.width : 0,
    height: typeof data.height === 'number' ? data.height : 0,
    caption: typeof data.caption === 'string' ? data.caption : undefined,
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
  };
};

export const mapComment = (snapshot: QueryDocumentSnapshot<DocumentData>): Comment => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    mediaId: typeof data.mediaId === 'string' ? data.mediaId : '',
    dayId: typeof data.dayId === 'string' ? data.dayId : '',
    author: typeof data.author === 'string' && data.author.trim() ? data.author : 'Besökare',
    text: typeof data.text === 'string' ? data.text : '',
    emoji: typeof data.emoji === 'string' ? data.emoji : undefined,
    createdAt: timestampToDate(data.createdAt),
  };
};
