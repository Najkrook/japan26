import { useEffect, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Comment } from '../types';
import { mapComment } from '../utils/firestoreMappers';

interface CommentsState {
  key: string | null;
  comments: Comment[];
  loaded: boolean;
}

export const useComments = (mediaId: string | null) => {
  const [state, setState] = useState<CommentsState>({
    key: null,
    comments: [],
    loaded: false,
  });

  useEffect(() => {
    if (!mediaId) {
      return undefined;
    }

    const commentsQuery = query(
      collection(db, 'comments'),
      where('mediaId', '==', mediaId),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      setState({
        key: mediaId,
        comments: snapshot.docs.map(mapComment),
        loaded: true,
      });
    });

    return () => unsubscribe();
  }, [mediaId]);

  const addComment = async (author: string, text: string, dayId: string) => {
    if (!text.trim()) {
      return;
    }

    await addDoc(collection(db, 'comments'), {
      mediaId,
      dayId,
      author: author.trim(),
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
  };

  if (!mediaId) {
    return {
      comments: [] as Comment[],
      loading: false,
      addComment,
    };
  }

  return {
    comments: state.key === mediaId ? state.comments : [],
    loading: state.key !== mediaId || !state.loaded,
    addComment,
  };
};
