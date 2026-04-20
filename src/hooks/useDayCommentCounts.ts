import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

interface CommentCountState {
  key: string | null;
  counts: Record<string, number>;
  loaded: boolean;
}

export const useDayCommentCounts = (dayId: string | null) => {
  const [state, setState] = useState<CommentCountState>({
    key: null,
    counts: {},
    loaded: false,
  });

  useEffect(() => {
    if (!dayId) {
      return undefined;
    }

    const commentsQuery = query(collection(db, 'comments'), where('dayId', '==', dayId));
    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const counts: Record<string, number> = {};

      snapshot.docs.forEach((docSnapshot) => {
        const mediaId = docSnapshot.data().mediaId;
        if (typeof mediaId === 'string' && mediaId) {
          counts[mediaId] = (counts[mediaId] ?? 0) + 1;
        }
      });

      setState({
        key: dayId,
        counts,
        loaded: true,
      });
    });

    return () => unsubscribe();
  }, [dayId]);

  if (!dayId) {
    return {
      counts: {} as Record<string, number>,
      loading: false,
    };
  }

  return {
    counts: state.key === dayId ? state.counts : {},
    loading: state.key !== dayId || !state.loaded,
  };
};
