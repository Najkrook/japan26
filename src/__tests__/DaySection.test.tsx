import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DaySection from '../components/DaySection';
import type { DataLoadMode, Day, Media } from '../types';

const mockUseMedia = vi.fn();
const mockUseDayCommentCounts = vi.fn();
const activeObserverState: { onChange?: (visible: boolean) => void } = {};
const nearObserverState: { onChange?: (visible: boolean) => void } = {};

vi.mock('../hooks/useMedia', () => ({
  useMedia: (...args: unknown[]) => mockUseMedia(...args),
}));

vi.mock('../hooks/useDayCommentCounts', () => ({
  useDayCommentCounts: (...args: unknown[]) => mockUseDayCommentCounts(...args),
}));

vi.mock('../components/EmaBoard', () => ({
  default: ({ dayId }: { dayId: string }) => <div data-testid={`ema-board-${dayId}`} />,
}));

vi.mock('../components/MediaGrid', () => ({
  default: ({ media }: { media: Media[] }) => (
    <div data-testid="media-grid">MediaGrid:{media.length}</div>
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
  },
}));

vi.mock('react-intersection-observer', () => ({
  useInView: (options?: { rootMargin?: string; onChange?: (visible: boolean) => void }) => {
    if (options?.rootMargin?.includes('200%')) {
      nearObserverState.onChange = options.onChange;
      return { ref: vi.fn() };
    }

    activeObserverState.onChange = options?.onChange;
    return { ref: vi.fn() };
  },
}));

const dayFixture: Day = {
  id: 'day-1',
  date: new Date('2026-04-15T00:00:00Z'),
  dateKey: '2026-04-15',
  title: 'Tokyo',
  description: 'Första dagen i Tokyo.',
  location: 'Tokyo',
};

const mediaFixture: Media[] = [
  {
    id: 'media-1',
    dayId: 'day-1',
    type: 'photo',
    url: 'https://example.com/photo.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    storagePath: 'media/day-1/photo.jpg',
    fileName: 'tokyo.jpg',
    capturedAt: new Date('2026-04-15T10:00:00Z'),
    width: 1600,
    height: 900,
  },
];

const renderSection = (overrides: Partial<React.ComponentProps<typeof DaySection>> = {}) =>
  render(
    <DaySection
      day={dayFixture}
      isActive={false}
      isAdjacentToActive={false}
      isAdmin={false}
      canPost={false}
      authorizationError={null}
      onVisible={vi.fn()}
      onMediaClick={vi.fn()}
      {...overrides}
    />
  );

const triggerNearViewport = (visible: boolean) => {
  act(() => {
    nearObserverState.onChange?.(visible);
  });
};

const triggerActiveViewport = (visible: boolean) => {
  act(() => {
    activeObserverState.onChange?.(visible);
  });
};

describe('DaySection', () => {
  beforeEach(() => {
    activeObserverState.onChange = undefined;
    nearObserverState.onChange = undefined;
    mockUseMedia.mockReset();
    mockUseDayCommentCounts.mockReset();

    mockUseMedia.mockImplementation((_dayId: string, mode: DataLoadMode) => ({
      media: mode === 'off' ? [] : mediaFixture,
      loading: false,
      error: null,
    }));

    mockUseDayCommentCounts.mockImplementation((_dayId: string, mode: DataLoadMode) => ({
      counts: mode === 'off' ? {} : { 'media-1': 2 },
      loading: false,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the deferred state for unseen days without adjacency', () => {
    renderSection();

    expect(screen.getByText('Bilderna laddas när du närmar dig dagen.')).toBeTruthy();
    expect(screen.queryByTestId('media-grid')).toBeNull();
    expect(mockUseMedia).not.toHaveBeenCalled();
    expect(mockUseDayCommentCounts).not.toHaveBeenCalled();
  });

  it('uses once-mode when the day is adjacent to the active day', () => {
    renderSection({ isAdjacentToActive: true });

    expect(screen.getByTestId('media-grid')).toBeTruthy();
    expect(mockUseMedia).toHaveBeenLastCalledWith('day-1', 'once');
    expect(mockUseDayCommentCounts).toHaveBeenLastCalledWith('day-1', 'once');
  });

  it('activates content with once-mode when the day enters the preload zone', () => {
    renderSection();

    triggerNearViewport(true);

    expect(screen.getByTestId('media-grid')).toBeTruthy();
    expect(mockUseMedia).toHaveBeenLastCalledWith('day-1', 'once');
    expect(mockUseDayCommentCounts).toHaveBeenLastCalledWith('day-1', 'once');
  });

  it('keeps content mounted after a seen day leaves the preload zone', () => {
    const { rerender } = renderSection();

    triggerNearViewport(true);
    expect(screen.getByTestId('media-grid')).toBeTruthy();

    mockUseMedia.mockClear();
    mockUseDayCommentCounts.mockClear();

    triggerNearViewport(false);
    rerender(
      <DaySection
        day={dayFixture}
        isActive={false}
        isAdjacentToActive={false}
        isAdmin={false}
        canPost={false}
        authorizationError={null}
        onVisible={vi.fn()}
        onMediaClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('media-grid')).toBeTruthy();
    expect(mockUseMedia).toHaveBeenLastCalledWith('day-1', 'once');
    expect(mockUseDayCommentCounts).toHaveBeenLastCalledWith('day-1', 'once');
  });

  it('uses live mode for the active day and reports visibility', () => {
    const onVisible = vi.fn();

    renderSection({ isActive: true, onVisible });

    triggerActiveViewport(true);

    expect(screen.getByTestId('media-grid')).toBeTruthy();
    expect(mockUseMedia).toHaveBeenLastCalledWith('day-1', 'live');
    expect(mockUseDayCommentCounts).toHaveBeenLastCalledWith('day-1', 'live');
    expect(onVisible).toHaveBeenCalledWith('day-1');
  });

  it('falls back to once-mode after an active day has already been activated', () => {
    const { rerender } = renderSection({ isActive: true });

    expect(screen.getByTestId('media-grid')).toBeTruthy();
    expect(mockUseMedia).toHaveBeenLastCalledWith('day-1', 'live');

    mockUseMedia.mockClear();
    mockUseDayCommentCounts.mockClear();

    rerender(
      <DaySection
        day={dayFixture}
        isActive={false}
        isAdjacentToActive={false}
        isAdmin={false}
        canPost={false}
        authorizationError={null}
        onVisible={vi.fn()}
        onMediaClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('media-grid')).toBeTruthy();
    expect(mockUseMedia).toHaveBeenLastCalledWith('day-1', 'once');
    expect(mockUseDayCommentCounts).toHaveBeenLastCalledWith('day-1', 'once');
  });
});
