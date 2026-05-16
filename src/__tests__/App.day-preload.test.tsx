import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Day } from '../types';

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
  {
    id: 'day-3',
    date: new Date('2026-04-17T00:00:00Z'),
    dateKey: '2026-04-17',
    title: 'Osaka',
  },
];

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
    deleteMedia: vi.fn(),
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
    isActive,
    isPreviousAdjacent,
    isNextAdjacent,
    onVisible,
  }: {
    day: Day;
    isActive: boolean;
    isPreviousAdjacent: boolean;
    isNextAdjacent: boolean;
    onVisible: (dayId: string) => void;
  }) => (
    <button
      type="button"
      data-testid={`day-section-${day.id}`}
      onClick={() => onVisible(day.id)}
    >
      {`${day.id}:${isActive ? 'active' : 'inactive'}:${
        isPreviousAdjacent ? 'previous-adjacent' : isNextAdjacent ? 'next-adjacent' : 'not-adjacent'
      }`}
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

describe('App adjacent day preloading', () => {
  it('marks the previous and next days separately when a day becomes active', () => {
    render(<App />);

    expect(screen.getByTestId('day-section-day-1').textContent).toContain('not-adjacent');
    expect(screen.getByTestId('day-section-day-2').textContent).toContain('not-adjacent');
    expect(screen.getByTestId('day-section-day-3').textContent).toContain('not-adjacent');

    fireEvent.click(screen.getByTestId('day-section-day-2'));

    expect(screen.getByTestId('day-section-day-2').textContent).toContain('active:not-adjacent');
    expect(screen.getByTestId('day-section-day-1').textContent).toContain('inactive:previous-adjacent');
    expect(screen.getByTestId('day-section-day-3').textContent).toContain('inactive:next-adjacent');
  });
});
