import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Day, Media } from '../types';

const renderOrder: string[] = [];
const mockWarmLightboxPhotos = vi.fn();

const mapMediaList: Media[] = [
  {
    id: 'media-1',
    dayId: 'day-1',
    type: 'photo',
    url: 'https://example.com/photo.jpg',
    thumbnailUrl: 'https://example.com/photo-thumb.jpg',
    storagePath: 'media/day-1/photo.jpg',
    fileName: 'tokyo.jpg',
    capturedAt: new Date('2026-04-15T12:00:00Z'),
    width: 1600,
    height: 900,
    latitude: 35.68,
    longitude: 139.76,
  },
];

const days: Day[] = [
  {
    id: 'day-1',
    date: new Date('2026-04-15T00:00:00Z'),
    dateKey: '2026-04-15',
    title: 'Tokyo',
  },
];

vi.mock('../utils/imagePreload', () => ({
  warmLightboxPhotos: (...args: unknown[]) => mockWarmLightboxPhotos(...args),
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
    ensureDay: vi.fn(),
  }),
}));

vi.mock('../components/Header', () => ({
  default: () => <div data-testid="mock-header" />,
}));

vi.mock('../components/SakuraBackground', () => ({
  default: () => null,
}));

vi.mock('../components/BottomNav', () => ({
  default: ({ onTabChange }: { onTabChange: (tab: 'journal' | 'map') => void }) => (
    <button type="button" data-testid="open-map-tab" onClick={() => onTabChange('map')}>
      Map
    </button>
  ),
}));

vi.mock('../components/MapTab', () => ({
  default: ({ onMediaOpen }: { onMediaOpen?: (media: Media[], index: number) => void }) => (
    <button
      type="button"
      data-testid="map-open-lightbox"
      onClick={() => onMediaOpen?.(mapMediaList, 0)}
    >
      Open from map
    </button>
  ),
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

vi.mock('../components/DaySection', () => ({
  default: () => null,
}));

vi.mock('../components/Lightbox', () => ({
  default: ({ item }: { item: Media }) => {
    renderOrder.push('lightbox');
    return <div data-testid="mock-lightbox">{item.fileName}</div>;
  },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  useScroll: () => ({ scrollYProgress: 0 }),
  useSpring: () => 0,
}));

import App from '../App';

beforeEach(() => {
  renderOrder.length = 0;
  mockWarmLightboxPhotos.mockReset();
  mockWarmLightboxPhotos.mockImplementation(() => {
    renderOrder.push('preload');
  });
});

afterEach(() => {
  cleanup();
});

describe('App map lightbox opening', () => {
  it('opens map media through the same lightbox flow as the journal', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('open-map-tab'));
    fireEvent.click(screen.getByTestId('map-open-lightbox'));

    expect(mockWarmLightboxPhotos).toHaveBeenCalledWith(mapMediaList, 0);
    expect(renderOrder[0]).toBe('preload');
    expect(renderOrder).toContain('lightbox');
    expect(screen.getByTestId('mock-lightbox').textContent).toContain('tokyo.jpg');
  });
});
