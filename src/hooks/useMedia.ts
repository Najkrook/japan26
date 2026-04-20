import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Media } from '../types';
import { mapMedia } from '../utils/firestoreMappers';

interface MediaState {
  key: string | null;
  media: Media[];
  error: string | null;
  loaded: boolean;
}

export const useMedia = (dayId: string | null) => {
  const [state, setState] = useState<MediaState>({
    key: null,
    media: [],
    error: null,
    loaded: false,
  });

  useEffect(() => {
    if (!dayId) {
      return undefined;
    }

    const mediaQuery = query(
      collection(db, 'media'),
      where('dayId', '==', dayId),
    );

    const unsubscribe = onSnapshot(
      mediaQuery,
      (snapshot) => {
        const parsedMedia = snapshot.docs.map(mapMedia);
        // Sort in memory to safely handle older entries missing capturedAt
        parsedMedia.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());

        setState({
          key: dayId,
          media: parsedMedia,
          error: null,
          loaded: true,
        });
      },
      () => {
        setState({
          key: dayId,
          media: [],
          error: 'Kunde inte ladda bilder.',
          loaded: true,
        });
      },
    );

    return () => unsubscribe();
  }, [dayId]);

  if (!dayId) {
    return {
      media: [] as Media[],
      loading: false,
      error: null as string | null,
    };
  }

  return {
    media: state.key === dayId ? state.media : [],
    loading: state.key !== dayId || !state.loaded,
    error: state.key === dayId ? state.error : null,
  };
};
