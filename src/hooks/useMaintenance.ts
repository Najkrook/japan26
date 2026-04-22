import { useState, useMemo } from 'react';
import { useMediaActions } from './useMediaActions';
import type { Day, Media } from '../types';

export const useMaintenance = (days: Day[], media: Media[]) => {
  const { deleteMedia } = useMediaActions();
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastCleanCount, setLastCleanCount] = useState<number | null>(null);
  const [lastFailCount, setLastFailCount] = useState<number | null>(null);

  const orphanedMedia = useMemo(() => {
    if (media.length === 0) return [];
    
    const existingDayIds = new Set(days.map((d) => d.id));
    return media.filter((m) => !existingDayIds.has(m.dayId));
  }, [days, media]);

  const cleanupOrphanedMedia = async () => {
    if (orphanedMedia.length === 0 || isCleaning) return;

    setIsCleaning(true);
    setLastCleanCount(null);
    setLastFailCount(null);
    
    let successCount = 0;
    let failCount = 0;

    try {
      const itemsToProcess = [...orphanedMedia];
      
      for (const item of itemsToProcess) {
        try {
          await deleteMedia(item);
          successCount++;
        } catch (err) {
          console.error(`Failed to delete media ${item.id}:`, err);
          failCount++;
        }
      }
      setLastCleanCount(successCount);
      setLastFailCount(failCount > 0 ? failCount : null);
    } catch (error) {
      console.error('Maintenance cleanup loop crashed:', error);
    } finally {
      setIsCleaning(false);
    }
  };

  return {
    orphanedMedia,
    isCleaning,
    lastCleanCount,
    lastFailCount,
    cleanupOrphanedMedia,
  };
};
