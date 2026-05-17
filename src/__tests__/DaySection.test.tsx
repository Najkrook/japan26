import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DaySection from '../components/DaySection';
import type { Day, Media } from '../types';

const activeObserverState: { onChange?: (visible: boolean) => void } = {};

vi.mock('../components/EmaBoard', () => ({
  default: ({ dayId }: { dayId: string }) => <div data-testid={`ema-board-${dayId}`} />,
}));

vi.mock('../components/MediaGrid', () => ({
  default: ({
    media,
    commentCounts,
  }: {
    media: Media[];
    commentCounts: Record<string, number>;
  }) => <div data-testid="media-grid">{`MediaGrid:${media.length}:${commentCounts['media-1'] ?? 0}`}</div>,
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
  useInView: (options?: { onChange?: (visible: boolean) => void }) => {
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
      media={mediaFixture}
      commentCounts={{ 'media-1': 2 }}
      isAdmin={false}
      onVisible={vi.fn()}
      onMediaClick={vi.fn()}
      {...overrides}
    />
  );

const triggerActiveViewport = (visible: boolean) => {
  act(() => {
    activeObserverState.onChange?.(visible);
  });
};

describe('DaySection', () => {
  beforeEach(() => {
    activeObserverState.onChange = undefined;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders media directly from props without placeholder states', () => {
    renderSection();

    expect(screen.getByTestId('media-grid').textContent).toBe('MediaGrid:1:2');
    expect(screen.queryByText('Bilderna laddas när du närmar dig dagen.')).toBeNull();
  });

  it('renders an empty media state when the day has no images', () => {
    renderSection({ media: [], commentCounts: {} });

    expect(screen.getByText('Inga bilder än.')).toBeTruthy();
    expect(screen.queryByTestId('media-grid')).toBeNull();
  });

  it('reports visibility when the day enters the active viewport', () => {
    const onVisible = vi.fn();

    renderSection({ onVisible });

    triggerActiveViewport(true);

    expect(onVisible).toHaveBeenCalledWith('day-1');
  });

  it('opens the editor controls for admins', () => {
    renderSection({ isAdmin: true });

    fireEvent.click(screen.getByTitle('Redigera text'));

    expect(screen.getByPlaceholderText('Skriv något om dagen...')).toBeTruthy();
    expect(screen.getByText('Spara')).toBeTruthy();
  });
});
