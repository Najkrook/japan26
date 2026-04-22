import { deleteDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Media } from '../types';

export const useMediaActions = () => {
  const deleteMedia = async (item: Media) => {
    if (!item?.id) {
      console.warn('Cannot delete media: Missing ID');
      return;
    }

    try {
      // 0. Cascade Delete Comments (Non-blocking)
      try {
        const commentsQuery = query(collection(db, 'comments'), where('mediaId', '==', item.id));
        const commentsSnapshot = await getDocs(commentsQuery);
        const commentDeletePromises = commentsSnapshot.docs.map((commentDoc) => 
          deleteDoc(doc(db, 'comments', commentDoc.id))
        );
        await Promise.all(commentDeletePromises);
      } catch (err) {
        console.warn(`Could not delete comments for media ${item.id}:`, err);
      }

      // 1. Delete original file and thumbnail from Storage (Non-blocking)
      if (item.storagePath) {
        try {
          const mediaRef = ref(storage, item.storagePath);
          await deleteObject(mediaRef).catch(() => {});
          
          const thumbPath = item.storagePath.replace('media/', 'thumbnails/');
          const thumbRef = ref(storage, thumbPath);
          await deleteObject(thumbRef).catch(() => {});
        } catch (err) {
          console.warn(`Could not delete storage files for media ${item.id}:`, err);
        }
      }

      // 2. Delete Firestore document (Final step)
      await deleteDoc(doc(db, 'media', item.id));
    } catch (error) {
      console.error('Error in deleteMedia:', error);
      throw error;
    }
  };

  return {
    deleteMedia,
  };
};
