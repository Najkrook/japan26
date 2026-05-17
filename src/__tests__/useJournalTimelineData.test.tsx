import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useJournalTimelineData } from '../hooks/useJournalTimelineData';
import type { Day, Media } from '../types';

const mockGetDocs = vi.fn();
const mockUseMedia = vi.fn();

vi.mock('../config/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ kind: 'collection', name })),
  query: vi.fn((...parts: unknown[]) => ({ kind: 'query', parts })),
  orderBy: vi.fn((field: string, direction: string) => ({ kind: 'orderBy', field, direction })),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock('../utils/firestoreMappers', () => ({
  mapMedia: (snapshot: { data: () => Media }) => snapshot.data(),
}));

vi.mock('../hooks/useMedia', () => ({
  useMedia: (...args: unknown[]) => mockUseMedia(...args),
}));

const days: Day[] = [
  {
    id: 'day-1',
    date: new Date('2026-04-15T00:00:00Z'),
    dateKey: '2026-04-15',
    title: 'Tokyo',
  },
  {
    id: 'day-2',
    date: new Date('2026-04-16T00:00:00Z'),
    dateKey: '2026-04-16',
    title: 'Kyoto',
  },
];

const batchMedia: Media[] = [
  {
    id: 'media-1',
    dayId: 'day-1',
    type: 'photo',
    url: 'https://example.com/1.jpg',
    thumbnailUrl: 'https://example.com/1-thumb.jpg',
    storagePath: 'media/day-1/1.jpg',
    fileName: '1.jpg',
    capturedAt: new Date('2026-04-15T08:00:00Z'),
    width: 1200,
    height: 900,
  },
  {
    id: 'media-2',
    dayId: 'day-2',
    type: 'photo',
    url: 'https://example.com/2.jpg',
    thumbnailUrl: 'https://example.com/2-thumb.jpg',
    storagePath: 'media/day-2/2.jpg',
    fileName: '2.jpg',
    capturedAt: new Date('2026-04-16T08:00:00Z'),
    width: 1200,
    height: 900,
  },
];

const HookHarness = ({
  activeDayId,
  enabled = true,
}: {
  activeDayId: string | null;
  enabled?: boolean;
}) => {
  const { dayEntries, loading, error } = useJournalTimelineData({
    days,
    activeDayId,
    enabled,
  });

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="error">{error ?? ''}</div>
      {dayEntries.map((entry) => (
        <div key={entry.day.id} data-testid={`day-${entry.day.id}`}>
          {entry.media.map((item) => item.id).join(',') || 'empty'}|{entry.commentCounts['media-1'] ?? 0}|{entry.commentCounts['media-2'] ?? 0}
        </div>
      ))}
    </div>
  );
};

describe('useJournalTimelineData', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockUseMedia.mockReset();

    mockGetDocs
      .mockResolvedValueOnce({
        docs: batchMedia.map((item) => ({
          data: () => item,
        })),
      })
      .mockResolvedValueOnce({
        docs: [
          { data: () => ({ mediaId: 'media-1' }) },
          { data: () => ({ mediaId: 'media-1' }) },
          { data: () => ({ mediaId: 'media-2' }) },
          { data: () => ({ mediaId: 'ema-board-day-1' }) },
        ],
      });

    mockUseMedia.mockImplementation((dayId: string | null, mode: string) => ({
      media: mode === 'live' && dayId ? batchMedia.filter((item) => item.dayId === dayId) : [],
      loading: false,
      error: null,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('batch-loads media and comment counts for the timeline', async () => {
    render(<HookHarness activeDayId={null} />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('day-day-1').textContent).toBe('media-1|2|0');
    expect(screen.getByTestId('day-day-2').textContent).toBe('media-2|0|1');
    expect(mockGetDocs).toHaveBeenCalledTimes(2);
    expect(mockUseMedia).toHaveBeenLastCalledWith(null, 'off');
  });

  it('uses live media for the active day while keeping batch data for the others', async () => {
    mockUseMedia.mockImplementation((dayId: string | null, mode: string) => ({
      media:
        mode === 'live' && dayId === 'day-1'
          ? [
              batchMedia[0],
              {
                ...batchMedia[0],
                id: 'media-1b',
                fileName: '1b.jpg',
              },
            ]
          : [],
      loading: false,
      error: null,
    }));

    render(<HookHarness activeDayId="day-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('day-day-1').textContent).toContain('media-1,media-1b');
    expect(screen.getByTestId('day-day-2').textContent).toBe('media-2|0|1');
    expect(mockUseMedia).toHaveBeenLastCalledWith('day-1', 'live');
  });
});
