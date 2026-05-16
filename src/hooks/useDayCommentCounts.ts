import { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DataLoadMode } from '../types';

interface CommentCountState {
  key: string | null;
  mode: DataLoadMode;
  counts: Record<string, number>;
  loaded: boolean;
}

const countComments = (
  docs: Array<{ data: () => Record<string, unknown> }>,
): Record<string, number> => {
  const counts: Record<string, number> = {};

  docs.forEach((docSnapshot) => {
    const mediaId = docSnapshot.data().mediaId;
    if (typeof mediaId === 'string' && mediaId) {
      counts[mediaId] = (counts[mediaId] ?? 0) + 1;
    }
  });

  return counts;
};

export const useDayCommentCounts = (dayId: string | null, mode: DataLoadMode = 'live') => {
  const [state, setState] = useState<CommentCountState>({
    key: null,
    mode: 'off',
    counts: {},
    loaded: false,
  });

  useEffect(() => {
    if (!dayId || mode === 'off') {
      return undefined;
    }

    const commentsQuery = query(collection(db, 'comments'), where('dayId', '==', dayId));

    if (mode === 'once') {
      let cancelled = false;

      void getDocs(commentsQuery).then((snapshot) => {
        if (cancelled) {
          return;
        }

        setState({
          key: dayId,
          mode,
          counts: countComments(snapshot.docs),
          loaded: true,
        });
      });

      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      setState({
        key: dayId,
        mode,
        counts: countComments(snapshot.docs),
        loaded: true,
      });
    });

    return () => unsubscribe();
  }, [dayId, mode]);

  if (!dayId || mode === 'off') {
    return {
      counts: {} as Record<string, number>,
      loading: false,
    };
  }

  return {
    counts: state.key === dayId && state.mode === mode ? state.counts : {},
    loading: state.key !== dayId || state.mode !== mode || !state.loaded,
  };
};
