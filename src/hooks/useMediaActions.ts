import { deleteDoc, doc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Media } from '../types';

export const useMediaActions = () => {
  const deleteMedia = async (item: Media) => {
    try {
      // 1. Delete Firestore document
      await deleteDoc(doc(db, 'media', item.id));

      // 2. Delete original file from Storage
      if (item.storagePath) {
        const mediaRef = ref(storage, item.storagePath);
        await deleteObject(mediaRef);
      }

      // 3. Delete thumbnail from Storage
      // Based on UploadPanel.tsx: thumbPath = thumbnails/{dayId}/{id}.{ext}
      // Since thumbnailUrl is a full URL, we construct the path from storagePath
      if (item.storagePath) {
        const thumbPath = item.storagePath.replace('media/', 'thumbnails/');
        const thumbRef = ref(storage, thumbPath);
        await deleteObject(thumbRef).catch((err) => {
          console.warn('Could not delete thumbnail, it might not exist:', err);
        });
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  };

  return {
    deleteMedia,
  };
};
