import { useEffect, useState } from 'react';
import { collection, getDocs, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Media } from '../types';
import { mapMedia } from '../utils/firestoreMappers';

interface AllMediaState {
  loaded: boolean;
  media: Media[];
  error: string | null;
}

export interface UseAllMediaOptions {
  enabled?: boolean;
  live?: boolean;
  limit?: number;
}

const parseMedia = (docs: Array<{ data: () => unknown } & Parameters<typeof mapMedia>[0]>) =>
  docs
    .map(mapMedia)
    .filter((item) => (item.uploadStatus ?? 'ready') === 'ready');

export const useAllMedia = (options: UseAllMediaOptions = {}) => {
  const { enabled = true, live = true, limit: maxItems = 1000 } = options;
  const [state, setState] = useState<AllMediaState>({
    loaded: false,
    media: [],
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({
        loaded: true,
        media: [],
        error: null,
      });
      return undefined;
    }

    // Fetch all media generally ordered by capturedAt. Filtering for lat/lng is done in-memory
    // since we do not have a composite index for it right now and the total volume is small.
    const mediaQuery = query(
      collection(db, 'media'),
      orderBy('capturedAt', 'desc'),
      limit(maxItems)
    );

    if (!live) {
      let cancelled = false;

      void getDocs(mediaQuery)
        .then((snapshot) => {
          if (cancelled) {
            return;
          }

          setState({
            loaded: true,
            media: parseMedia(snapshot.docs),
            error: null,
          });
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setState({
            loaded: true,
            media: [],
            error: 'Kunde inte hämta media för kartan.',
          });
        });

      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = onSnapshot(
      mediaQuery,
      (snapshot) => {
        setState({
          loaded: true,
          media: parseMedia(snapshot.docs),
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
  }, [enabled, live, maxItems]);

  return {
    media: state.media,
    loading: !state.loaded,
    error: state.error,
  };
};
