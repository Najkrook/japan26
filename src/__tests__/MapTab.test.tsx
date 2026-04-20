import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MapTab from '../components/MapTab';
import type { Media } from '../types';

const mockUseAllMedia = vi.fn();
const mockFitBounds = vi.fn();

vi.mock('../hooks/useAllMedia', () => ({
  useAllMedia: (...args: unknown[]) => mockUseAllMedia(...args),
}));

vi.mock('leaflet', () => ({
  default: {
    icon: vi.fn(() => ({})),
    Marker: {
      prototype: {
        options: {},
      },
    },
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-map-marker">{children}</div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-map-popup">{children}</div>
  ),
  useMap: () => ({
    fitBounds: mockFitBounds,
  }),
}));

const geoMedia: Media[] = [
  {
    id: 'media-1',
    dayId: 'day-1',
    type: 'photo',
    url: 'https://example.com/photo-1.jpg',
    thumbnailUrl: 'https://example.com/thumb-1.jpg',
    storagePath: 'media/day-1/photo-1.jpg',
    fileName: 'tokyo.jpg',
    capturedAt: new Date('2026-04-15T12:00:00Z'),
    width: 1600,
    height: 900,
    latitude: 35.68,
    longitude: 139.76,
  },
  {
    id: 'media-2',
    dayId: 'day-2',
    type: 'photo',
    url: 'https://example.com/photo-2.jpg',
    thumbnailUrl: 'https://example.com/thumb-2.jpg',
    storagePath: 'media/day-2/photo-2.jpg',
    fileName: 'osaka.jpg',
    capturedAt: new Date('2026-04-16T12:00:00Z'),
    width: 1600,
    height: 900,
    latitude: 34.69,
    longitude: 135.5,
  },
  {
    id: 'media-3',
    dayId: 'day-3',
    type: 'photo',
    url: 'https://example.com/photo-3.jpg',
    thumbnailUrl: 'https://example.com/thumb-3.jpg',
    storagePath: 'media/day-3/photo-3.jpg',
    fileName: 'no-geo.jpg',
    capturedAt: new Date('2026-04-17T12:00:00Z'),
    width: 1600,
    height: 900,
  },
];

beforeEach(() => {
  mockFitBounds.mockReset();
  mockUseAllMedia.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('MapTab', () => {
  it('shows a clear empty state when no media has coordinates', () => {
    mockUseAllMedia.mockReturnValue({
      media: [{ ...geoMedia[2] }],
      loading: false,
      error: null,
    });

    render(<MapTab />);

    expect(screen.getByTestId('map-empty-state').textContent).toContain('Ingen platsdata hittades');
  });

  it('shows an error state when map data loading fails', () => {
    mockUseAllMedia.mockReturnValue({
      media: [],
      loading: false,
      error: 'Kunde inte hÃ¤mta media fÃ¶r kartan.',
    });

    render(<MapTab />);

    expect(screen.getByTestId('map-error-state').textContent).toContain('Kunde inte hÃ¤mta media fÃ¶r kartan.');
  });

  it('fits the map to all geo-tagged markers and filters out media without coordinates', () => {
    mockUseAllMedia.mockReturnValue({
      media: geoMedia,
      loading: false,
      error: null,
    });

    render(<MapTab />);

    expect(screen.getAllByTestId('mock-map-marker')).toHaveLength(2);
    expect(mockFitBounds).toHaveBeenCalledWith(
      [
        [34.69, 135.5],
        [35.68, 139.76],
      ],
      { padding: [32, 32], maxZoom: 13 },
    );
  });

  it('opens the selected media through the popup button callback', () => {
    mockUseAllMedia.mockReturnValue({
      media: geoMedia,
      loading: false,
      error: null,
    });

    const onMediaOpen = vi.fn();

    render(<MapTab onMediaOpen={onMediaOpen} />);

    fireEvent.click(screen.getByTestId('map-open-media-media-2'));

    expect(onMediaOpen).toHaveBeenCalledWith(
      [geoMedia[0], geoMedia[1]],
      1,
    );
  });
});
