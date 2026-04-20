export interface Day {
  id: string;
  date: Date;
  dateKey: string;
  title: string;
  description?: string;
  location?: string;
  itinerary?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Media {
  id: string;
  dayId: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl: string;
  storagePath: string;
  fileName: string;
  capturedAt: Date;
  uploadedAt?: Date | null;
  width: number;
  height: number;
  caption?: string;
  latitude?: number;
  longitude?: number;
}

export interface Comment {
  id: string;
  mediaId: string;
  dayId: string;
  author: string;
  text: string;
  createdAt: Date | null;
}

export interface CreateDayInput {
  date: Date;
  title?: string;
  description?: string;
  itinerary?: string;
}

export interface UpdateDayInput {
  title?: string;
  description?: string;
  location?: string;
  itinerary?: string;
}

export type UserRole = 'admin' | 'poster';

export interface HardcodedAccountProfile {
  uid: string;
  name: string;
  role: UserRole;
}
