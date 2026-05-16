import { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DataLoadMode, Media } from '../types';
import { mapMedia } from '../utils/firestoreMappers';

interface MediaState {
  key: string | null;
  mode: DataLoadMode;
  media: Media[];
  error: string | null;
  loaded: boolean;
}

const parseMedia = (docs: Array<{ data: () => unknown } & Parameters<typeof mapMedia>[0]>) => {
  const parsedMedia = docs
    .map(mapMedia)
    .filter((item) => (item.uploadStatus ?? 'ready') === 'ready');
  parsedMedia.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
  return parsedMedia;
};

export const useMedia = (dayId: string | null, mode: DataLoadMode = 'live') => {
  const [state, setState] = useState<MediaState>({
    key: null,
    mode: 'off',
    media: [],
    error: null,
    loaded: false,
  });

  useEffect(() => {
    if (!dayId || mode === 'off') {
      return undefined;
    }

    const mediaQuery = query(
      collection(db, 'media'),
      where('dayId', '==', dayId),
    );

    if (mode === 'once') {
      let cancelled = false;

      void getDocs(mediaQuery)
        .then((snapshot) => {
          if (cancelled) {
            return;
          }

          setState({
            key: dayId,
            mode,
            media: parseMedia(snapshot.docs),
            error: null,
            loaded: true,
          });
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setState({
            key: dayId,
            mode,
            media: [],
            error: 'Kunde inte ladda bilder.',
            loaded: true,
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
          key: dayId,
          mode,
          media: parseMedia(snapshot.docs),
          error: null,
          loaded: true,
        });
      },
      () => {
        setState({
          key: dayId,
          mode,
          media: [],
          error: 'Kunde inte ladda bilder.',
          loaded: true,
        });
      },
    );

    return () => unsubscribe();
  }, [dayId, mode]);

  if (!dayId || mode === 'off') {
    return {
      media: [] as Media[],
      loading: false,
      error: null as string | null,
    };
  }

  return {
    media: state.key === dayId && state.mode === mode ? state.media : [],
    loading: state.key !== dayId || state.mode !== mode || !state.loaded,
    error: state.key === dayId && state.mode === mode ? state.error : null,
  };
};
