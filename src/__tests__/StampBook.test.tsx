import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StampBook from '../components/StampBook';
import type { Day } from '../types';

const mockUseAllMedia = vi.fn();

vi.mock('../hooks/useAllMedia', () => ({
  useAllMedia: (...args: unknown[]) => mockUseAllMedia(...args),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

const days: Day[] = [
  {
    id: 'day-1',
    date: new Date('2026-04-15T00:00:00Z'),
    dateKey: '2026-04-15',
    title: 'Tokyo',
  },
];

describe('StampBook', () => {
  beforeEach(() => {
    mockUseAllMedia.mockReset();
    mockUseAllMedia.mockReturnValue({
      media: [],
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders restored kanji labels for the predefined stamps', () => {
    render(<StampBook isOpen onClose={vi.fn()} days={days} />);

    expect(screen.getByText('\u6771')).toBeTruthy();
    expect(screen.getByText('\u4eac')).toBeTruthy();
    expect(screen.getByText('\u962a')).toBeTruthy();
    expect(screen.getByText('\u6c96')).toBeTruthy();
    expect(screen.getByText('\u5948')).toBeTruthy();
    expect(screen.getByText('\u938c')).toBeTruthy();
    expect(screen.getByText('\u65e5')).toBeTruthy();
    expect(screen.getByText('\u5b87')).toBeTruthy();
  });
});
