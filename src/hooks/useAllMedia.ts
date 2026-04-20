import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Media } from '../types';
import { mapMedia } from '../utils/firestoreMappers';

interface AllMediaState {
  loaded: boolean;
  media: Media[];
  error: string | null;
}

export const useAllMedia = (maxItems = 1000) => {
  const [state, setState] = useState<AllMediaState>({
    loaded: false,
    media: [],
    error: null,
  });

  useEffect(() => {
    // Fetch all media generally ordered by capturedAt. Filtering for lat/lng is done in-memory
    // since we do not have a composite index for it right now and the total volume is small.
    const mediaQuery = query(
      collection(db, 'media'), 
      orderBy('capturedAt', 'desc'),
      limit(maxItems)
    );
    
    const unsubscribe = onSnapshot(
      mediaQuery,
      (snapshot) => {
        const parsedMedia = snapshot.docs.map(mapMedia);
        setState({
          loaded: true,
          media: parsedMedia,
          error: null,
        });
      },
      () => {
        setState({
          loaded: true,
          media: [],
          error: 'Kunde inte hämta media för kartan.',
        });
      }
    );

    return () => unsubscribe();
  }, [maxItems]);

  return {
    media: state.media,
    loading: !state.loaded,
    error: state.error,
  };
};
