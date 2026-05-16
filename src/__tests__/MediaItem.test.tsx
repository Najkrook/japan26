import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MediaItem from '../components/MediaItem';
import type { Media } from '../types';

vi.mock('../utils/imagePreload', () => ({
  preloadImageUrl: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
}));

describe('MediaItem', () => {
  it('renders a placeholder instead of the full photo URL when the thumbnail is missing', () => {
    const item: Media = {
      id: 'missing-thumb',
      dayId: 'day-1',
      type: 'photo',
      url: 'https://example.com/full.jpg',
      thumbnailUrl: '',
      storagePath: 'media/day-1/full.jpg',
      fileName: 'full.jpg',
      capturedAt: new Date('2026-04-15T12:00:00Z'),
      width: 1600,
      height: 900,
    };

    const view = render(
      <MediaItem
        item={item}
        commentCount={0}
        onClick={() => undefined}
      />,
    );

    expect(screen.getByTestId('media-placeholder-missing-thumb')).toBeTruthy();
    expect(view.container.querySelector(`img[src="${item.url}"]`)).toBeNull();
  });
});
