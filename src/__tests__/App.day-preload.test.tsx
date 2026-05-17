import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Day, JournalDayData, Media } from '../types';

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

const mediaFixture = (dayId: string, id: string): Media => ({
  id,
  dayId,
  type: 'photo',
  url: `https://example.com/${id}.jpg`,
  thumbnailUrl: `https://example.com/${id}-thumb.jpg`,
  storagePath: `media/${dayId}/${id}.jpg`,
  fileName: `${id}.jpg`,
  capturedAt: new Date('2026-04-15T10:00:00Z'),
  width: 1600,
  height: 900,
});

const mockUseJournalTimelineData = vi.fn();
const mockDeleteMedia = vi.fn();

vi.mock('../hooks/useJournalTimelineData', () => ({
  useJournalTimelineData: (...args: unknown[]) => mockUseJournalTimelineData(...args),
}));

vi.mock('../hooks/useUserName', () => ({
  useUserName: () => ({
    userName: 'Tester',
    saveUserName: vi.fn(),
    hasName: true,
  }),
}));

vi.mock('../hooks/useAdmin', () => ({
  useAdmin: () => ({
    isAdmin: false,
    canPost: false,
    authorizationError: null,
    loading: false,
    loginWithGoogle: vi.fn(),
  }),
}));

vi.mock('../hooks/useDays', () => ({
  useDays: () => ({
    days,
    loading: false,
    createDay: vi.fn(),
    updateDay: vi.fn(),
    deleteDay: vi.fn(),
    ensureDay: vi.fn(),
  }),
}));

vi.mock('../hooks/useMaintenance', () => ({
  useMaintenance: () => ({
    orphanedMedia: [],
    isScanning: false,
    isCleaning: false,
    lastCleanCount: null,
    lastFailCount: null,
    scanError: null,
    scanOrphanedMedia: vi.fn(),
    cleanupOrphanedMedia: vi.fn(),
  }),
}));

vi.mock('../hooks/useMediaActions', () => ({
  useMediaActions: () => ({
    deleteMedia: mockDeleteMedia,
  }),
}));

vi.mock('../components/Header', () => ({
  default: () => <div data-testid="mock-header" />,
}));

vi.mock('../components/SakuraBackground', () => ({
  default: () => null,
}));

vi.mock('../components/BottomNav', () => ({
  default: () => null,
}));

vi.mock('../components/MapTab', () => ({
  default: () => null,
}));

vi.mock('../components/AdminLogin', () => ({
  default: () => null,
}));

vi.mock('../components/NamePrompt', () => ({
  default: () => null,
}));

vi.mock('../components/UploadPanel', () => ({
  default: () => null,
}));

vi.mock('../components/DayEditor', () => ({
  default: () => null,
}));

vi.mock('../components/Lightbox', () => ({
  default: () => null,
}));

vi.mock('../components/StampBook', () => ({
  default: () => null,
}));

vi.mock('../components/DaySection', () => ({
  default: ({
    day,
    media,
    onVisible,
  }: {
    day: Day;
    media: Media[];
    onVisible: (dayId: string) => void;
  }) => (
    <button
      type="button"
      data-testid={`day-section-${day.id}`}
      onClick={() => onVisible(day.id)}
    >
      {`${day.id}:${media.map((item) => item.id).join(',') || 'empty'}`}
    </button>
  ),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useScroll: () => ({ scrollYProgress: 0, scrollY: 0 }),
  useSpring: () => 0,
  useTransform: () => 0,
}));

import App from '../App';

beforeEach(() => {
  mockDeleteMedia.mockReset();
  mockUseJournalTimelineData.mockReset();

  const journalDayEntries: JournalDayData[] = [
    {
      day: days[0],
      media: [mediaFixture('day-1', 'media-1')],
      commentCounts: { 'media-1': 2 },
    },
    {
      day: days[1],
      media: [mediaFixture('day-2', 'media-2')],
      commentCounts: { 'media-2': 1 },
    },
  ];

  mockUseJournalTimelineData.mockReturnValue({
    dayEntries: journalDayEntries,
    loading: false,
    error: null,
  });

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

describe('App journal timeline', () => {
  it('renders the batch-loaded journal day data', () => {
    render(<App />);

    expect(screen.getByTestId('day-section-day-1').textContent).toContain('media-1');
    expect(screen.getByTestId('day-section-day-2').textContent).toContain('media-2');
    expect(mockUseJournalTimelineData).toHaveBeenCalled();
  });

  it('recomputes timeline data when a day becomes active', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('day-section-day-2'));

    const lastCall = mockUseJournalTimelineData.mock.calls.at(-1)?.[0] as {
      activeDayId: string | null;
    };

    expect(lastCall.activeDayId).toBe('day-2');
  });
});
