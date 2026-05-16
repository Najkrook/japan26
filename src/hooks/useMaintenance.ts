import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useMediaActions } from './useMediaActions';
import type { Day, Media } from '../types';
import { mapMedia } from '../utils/firestoreMappers';

export const useMaintenance = (days: Day[]) => {
  const { deleteMedia } = useMediaActions();
  const [orphanedMedia, setOrphanedMedia] = useState<Media[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastCleanCount, setLastCleanCount] = useState<number | null>(null);
  const [lastFailCount, setLastFailCount] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const scanOrphanedMedia = async () => {
    if (isScanning || isCleaning) {
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const existingDayIds = new Set(days.map((day) => day.id));
      const snapshot = await getDocs(collection(db, 'media'));
      const orphanedItems = snapshot.docs
        .map(mapMedia)
        .filter((item) => (item.uploadStatus ?? 'ready') === 'ready')
        .filter((item) => !existingDayIds.has(item.dayId));
      setOrphanedMedia(orphanedItems);
    } catch (error) {
      console.error('Failed to scan for orphaned media:', error);
      setScanError('Kunde inte skanna efter föräldralösa bilder.');
    } finally {
      setIsScanning(false);
    }
  };

  const cleanupOrphanedMedia = async () => {
    if (orphanedMedia.length === 0 || isCleaning) return;

    setIsCleaning(true);
    setLastCleanCount(null);
    setLastFailCount(null);
    
    let successCount = 0;
    let failCount = 0;
    const failedIds = new Set<string>();

    try {
      const itemsToProcess = [...orphanedMedia];
      
      for (const item of itemsToProcess) {
        try {
          await deleteMedia(item);
          successCount++;
        } catch (err) {
          console.error(`Failed to delete media ${item.id}:`, err);
          failCount++;
          failedIds.add(item.id);
        }
      }
      setLastCleanCount(successCount);
      setLastFailCount(failCount > 0 ? failCount : null);
      setOrphanedMedia((current) => current.filter((item) => failedIds.has(item.id)));
    } catch (error) {
      console.error('Maintenance cleanup loop crashed:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  return {
    orphanedMedia,
    isScanning,
    isCleaning,
    lastCleanCount,
    lastFailCount,
    scanError,
    scanOrphanedMedia,
    cleanupOrphanedMedia,
  };
};
