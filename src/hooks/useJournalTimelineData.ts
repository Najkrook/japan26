import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Day, JournalDayData, Media } from '../types';
import { mapMedia } from '../utils/firestoreMappers';
import { useMedia } from './useMedia';

interface TimelineBatchState {
  loaded: boolean;
  mediaByDayId: Record<string, Media[]>;
  commentCounts: Record<string, number>;
  error: string | null;
}

interface UseJournalTimelineDataOptions {
  days: Day[];
  activeDayId: string | null;
  enabled?: boolean;
  refreshKey?: number;
}

const buildMediaByDayId = (media: Media[], knownDayIds: Set<string>) => {
  const mediaByDayId: Record<string, Media[]> = {};

  media.forEach((item) => {
    if (!knownDayIds.has(item.dayId)) {
      return;
    }

    if (!mediaByDayId[item.dayId]) {
      mediaByDayId[item.dayId] = [];
    }

    mediaByDayId[item.dayId].push(item);
  });

  return mediaByDayId;
};

const countMediaComments = (
  docs: Array<{ data: () => Record<string, unknown> }>,
): Record<string, number> => {
  const counts: Record<string, number> = {};

  docs.forEach((docSnapshot) => {
    const mediaId = docSnapshot.data().mediaId;
    if (typeof mediaId === 'string' && mediaId && !mediaId.startsWith('ema-board-')) {
      counts[mediaId] = (counts[mediaId] ?? 0) + 1;
    }
  });

  return counts;
};

const selectCommentCounts = (media: Media[], allCounts: Record<string, number>) => {
  const counts: Record<string, number> = {};

  media.forEach((item) => {
    if (allCounts[item.id] !== undefined) {
      counts[item.id] = allCounts[item.id];
    }
  });

  return counts;
};

export const useJournalTimelineData = ({
  days,
  activeDayId,
  enabled = true,
  refreshKey = 0,
}: UseJournalTimelineDataOptions) => {
  const [batchState, setBatchState] = useState<TimelineBatchState>({
    loaded: false,
    mediaByDayId: {},
    commentCounts: {},
    error: null,
  });

  const liveMode = enabled && activeDayId ? 'live' : 'off';
  const {
    media: activeDayMedia,
    loading: activeDayMediaLoading,
    error: activeDayMediaError,
  } = useMedia(activeDayId, liveMode);

  useEffect(() => {
    if (!enabled) {
      setBatchState({
        loaded: false,
        mediaByDayId: {},
        commentCounts: {},
        error: null,
      });
      return undefined;
    }

    if (days.length === 0) {
      setBatchState({
        loaded: true,
        mediaByDayId: {},
        commentCounts: {},
        error: null,
      });
      return undefined;
    }

    let cancelled = false;
    const knownDayIds = new Set(days.map((day) => day.id));

    const mediaQuery = query(collection(db, 'media'), orderBy('capturedAt', 'asc'));
    const commentsCollection = collection(db, 'comments');

    void Promise.all([getDocs(mediaQuery), getDocs(commentsCollection)])
      .then(([mediaSnapshot, commentsSnapshot]) => {
        if (cancelled) {
          return;
        }

        const parsedMedia = mediaSnapshot.docs
          .map(mapMedia)
          .filter((item) => (item.uploadStatus ?? 'ready') === 'ready')
          .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());

        setBatchState({
          loaded: true,
          mediaByDayId: buildMediaByDayId(parsedMedia, knownDayIds),
          commentCounts: countMediaComments(commentsSnapshot.docs),
          error: null,
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setBatchState({
          loaded: true,
          mediaByDayId: {},
          commentCounts: {},
          error: 'Kunde inte ladda tidslinjen.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [days, enabled, refreshKey]);

  const dayEntries = useMemo<JournalDayData[]>(
    () =>
      days.map((day) => {
        const batchMedia = batchState.mediaByDayId[day.id] ?? [];
        const shouldUseLiveMedia =
          activeDayId === day.id && !activeDayMediaLoading && !activeDayMediaError;
        const mergedMedia = shouldUseLiveMedia ? activeDayMedia : batchMedia;

        return {
          day,
          media: mergedMedia,
          commentCounts: selectCommentCounts(mergedMedia, batchState.commentCounts),
        };
      }),
    [
      activeDayId,
      activeDayMedia,
      activeDayMediaError,
      activeDayMediaLoading,
      batchState.commentCounts,
      batchState.mediaByDayId,
      days,
    ]
  );

  return {
    dayEntries,
    loading: enabled && !batchState.loaded,
    error: batchState.error,
  };
};
