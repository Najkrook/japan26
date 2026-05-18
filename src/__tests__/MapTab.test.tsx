import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MapTab from '../components/MapTab';
import type { Media } from '../types';

const mockUseAllMedia = vi.fn();
const mockFitBounds = vi.fn();
const mockInvalidateSize = vi.fn();
const mockGetZoom = vi.fn(() => 6);
const mockProject = vi.fn(([lat, lng]: [number, number], zoom: number) => ({
  x: lng * zoom * 100,
  y: lat * zoom * 100,
}));
const mockUnproject = vi.fn((point: { x: number; y: number }, zoom: number) => ({
  lat: point.y / (zoom * 100),
  lng: point.x / (zoom * 100),
}));
const mockResizeObserverObserve = vi.fn();
const mockResizeObserverDisconnect = vi.fn();
const mockRequestAnimationFrame = vi.fn<(callback: FrameRequestCallback) => number>();
const mockCancelAnimationFrame = vi.fn<(handle: number) => void>();

class MockResizeObserver {
  observe = mockResizeObserverObserve;
  disconnect = mockResizeObserverDisconnect;

  constructor(_callback: ResizeObserverCallback) {}
}

vi.mock('../hooks/useAllMedia', () => ({
  useAllMedia: (...args: unknown[]) => mockUseAllMedia(...args),
}));

vi.mock('leaflet', () => ({
  default: {
    icon: vi.fn((options?: unknown) => options ?? {}),
    divIcon: vi.fn((options?: unknown) => options ?? {}),
    point: vi.fn((x: number, y: number) => ({ x, y })),
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
  Polyline: () => <div data-testid="mock-map-polyline" />,
  Marker: ({
    children,
    icon,
    eventHandlers,
  }: {
    children?: React.ReactNode;
    icon?: { className?: string; html?: string };
    eventHandlers?: { click?: () => void };
  }) => (
    <div
      data-testid={
        icon?.className?.includes('hanko-cluster-container')
          ? 'mock-map-cluster-marker'
          : 'mock-map-stop-marker'
      }
      onClick={() => eventHandlers?.click?.()}
    >
      <div dangerouslySetInnerHTML={{ __html: icon?.html ?? '' }} />
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-map-popup">{children}</div>
  ),
  useMap: () => ({
    fitBounds: mockFitBounds,
    invalidateSize: mockInvalidateSize,
    getZoom: mockGetZoom,
    project: mockProject,
    unproject: mockUnproject,
  }),
  useMapEvents: () => ({
    fitBounds: mockFitBounds,
    invalidateSize: mockInvalidateSize,
    getZoom: mockGetZoom,
    project: mockProject,
    unproject: mockUnproject,
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

const clusteredMedia: Media[] = [
  {
    ...geoMedia[0],
    id: 'cluster-1',
    dayId: 'cluster-day-1',
    latitude: 35.6801,
    longitude: 139.7601,
  },
  {
    ...geoMedia[1],
    id: 'cluster-2',
    dayId: 'cluster-day-2',
    latitude: 35.6802,
    longitude: 139.7602,
  },
  {
    ...geoMedia[1],
    id: 'cluster-3',
    dayId: 'cluster-day-3',
    latitude: 34.69,
    longitude: 135.5,
  },
];

const photoCountClusterMedia: Media[] = [
  {
    ...geoMedia[0],
    id: 'count-1',
    dayId: 'day-a',
    longitude: 139.7000,
  },
  {
    ...geoMedia[0],
    id: 'count-2',
    dayId: 'day-a',
    capturedAt: new Date('2026-04-15T12:05:00Z'),
    longitude: 139.7010,
  },
  {
    ...geoMedia[1],
    id: 'count-3',
    dayId: 'day-b',
    capturedAt: new Date('2026-04-15T12:10:00Z'),
    latitude: 35.6805,
    longitude: 139.7020,
  },
];

const aggressiveClusterMedia: Media[] = [
  {
    ...geoMedia[0],
    id: 'aggressive-1',
    dayId: 'aggressive-day-1',
    longitude: 139.7,
  },
  {
    ...geoMedia[0],
    id: 'aggressive-2',
    dayId: 'aggressive-day-2',
    capturedAt: new Date('2026-04-15T12:05:00Z'),
    longitude: 139.718,
  },
  {
    ...geoMedia[1],
    id: 'aggressive-3',
    dayId: 'aggressive-day-3',
    capturedAt: new Date('2026-04-15T12:10:00Z'),
    latitude: 35.68,
    longitude: 139.738,
  },
];

const separatedClusterMedia: Media[] = [
  {
    ...geoMedia[0],
    id: 'separated-1',
    dayId: 'separated-day-1',
    longitude: 139.7,
  },
  {
    ...geoMedia[0],
    id: 'separated-2',
    dayId: 'separated-day-2',
    capturedAt: new Date('2026-04-15T12:05:00Z'),
    longitude: 139.72,
  },
  {
    ...geoMedia[1],
    id: 'separated-3',
    dayId: 'separated-day-3',
    capturedAt: new Date('2026-04-15T12:10:00Z'),
    latitude: 35.68,
    longitude: 139.76,
  },
  {
    ...geoMedia[1],
    id: 'separated-4',
    dayId: 'separated-day-4',
    capturedAt: new Date('2026-04-15T12:15:00Z'),
    latitude: 35.68,
    longitude: 139.78,
  },
];

const identicalCoordinateMedia: Media[] = [
  {
    ...geoMedia[0],
    id: 'same-1',
    dayId: 'same-day',
    longitude: 139.70,
  },
  {
    ...geoMedia[0],
    id: 'same-2',
    dayId: 'same-day',
    capturedAt: new Date('2026-04-15T12:05:00Z'),
    fileName: 'same-2.jpg',
    longitude: 139.70,
  },
  {
    ...geoMedia[0],
    id: 'same-3',
    dayId: 'same-day',
    capturedAt: new Date('2026-04-15T12:10:00Z'),
    fileName: 'same-3.jpg',
    longitude: 139.70,
  },
];

const largeClusterMedia: Media[] = Array.from({ length: 13 }, (_, index) => ({
  ...geoMedia[0],
  id: `large-cluster-${index + 1}`,
  dayId: `large-cluster-day-${Math.floor(index / 3) + 1}`,
  fileName: `large-cluster-${index + 1}.jpg`,
  capturedAt: new Date(`2026-04-15T12:${String(index).padStart(2, '0')}:00Z`),
  latitude: 35.68 + index * 0.0001,
  longitude: 139.7 + index * 0.0001,
}));

beforeEach(() => {
  vi.useFakeTimers();
  mockFitBounds.mockReset();
  mockInvalidateSize.mockReset();
  mockGetZoom.mockReset();
  mockProject.mockReset();
  mockUnproject.mockClear();
  mockResizeObserverObserve.mockReset();
  mockResizeObserverDisconnect.mockReset();
  mockRequestAnimationFrame.mockReset();
  mockCancelAnimationFrame.mockReset();
  mockGetZoom.mockReturnValue(6);
  mockProject.mockImplementation(([lat, lng]: [number, number], zoom: number) => ({
    x: lng * zoom * 100,
    y: lat * zoom * 100,
  }));
  mockUnproject.mockImplementation((point: { x: number; y: number }, zoom: number) => ({
    lat: point.y / (zoom * 100),
    lng: point.x / (zoom * 100),
  }));
  mockUseAllMedia.mockReset();
  mockRequestAnimationFrame.mockImplementation((callback: FrameRequestCallback) => {
    return window.setTimeout(() => callback(performance.now()), 0);
  });
  mockCancelAnimationFrame.mockImplementation((handle: number) => {
    window.clearTimeout(handle);
  });
  window.requestAnimationFrame = mockRequestAnimationFrame;
  window.cancelAnimationFrame = mockCancelAnimationFrame;
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
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
      error: 'Kunde inte hamta media for kartan.',
    });

    render(<MapTab />);

    expect(screen.getByTestId('map-error-state').textContent).toContain(
      'Kunde inte hamta media for kartan.'
    );
  });

  it('loads map media as a one-time fetch instead of a live subscription', () => {
    mockUseAllMedia.mockReturnValue({
      media: geoMedia,
      loading: false,
      error: null,
    });

    render(<MapTab />);

    expect(mockUseAllMedia).toHaveBeenCalledWith({ enabled: true, live: false, limit: 1000 });
  });

  it('re-syncs Leaflet layout on initial render so the map can size correctly', () => {
    mockUseAllMedia.mockReturnValue({
      media: geoMedia,
      loading: false,
      error: null,
    });

    render(<MapTab />);

    act(() => {
      vi.runAllTimers();
    });

    expect(mockResizeObserverObserve).toHaveBeenCalledTimes(1);
    expect(mockInvalidateSize).toHaveBeenCalledTimes(3);
  });

  it('fits the map to all geo-tagged day stops and filters out media without coordinates', () => {
    mockUseAllMedia.mockReturnValue({
      media: geoMedia,
      loading: false,
      error: null,
    });

    render(<MapTab />);

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getAllByTestId('mock-map-stop-marker')).toHaveLength(2);
    expect(mockFitBounds).toHaveBeenCalledWith(
      [
        [34.69, 135.5],
        [35.68, 139.76],
      ],
      { padding: [32, 32], maxZoom: 13 }
    );
  });

  it('renders a cluster marker using photo counts instead of day counts', () => {
    mockGetZoom.mockReturnValue(10);
    mockUseAllMedia.mockReturnValue({
      media: photoCountClusterMedia,
      loading: false,
      error: null,
    });

    render(<MapTab />);

    expect(screen.getAllByTestId('mock-map-cluster-marker')).toHaveLength(1);
    expect(screen.getByTestId('mock-map-cluster-marker').textContent).toContain('3');
  });

  it('keeps nearby local groups separate instead of chaining them into one large cluster', () => {
    mockGetZoom.mockReturnValue(10);
    mockUseAllMedia.mockReturnValue({
      media: separatedClusterMedia,
      loading: false,
      error: null,
    });

    render(<MapTab />);

    expect(screen.getAllByTestId('mock-map-cluster-marker')).toHaveLength(2);
    expect(screen.queryAllByTestId('mock-map-stop-marker')).toHaveLength(0);
  });

  it('renders a cluster marker when nearby photo points collapse at low zoom', () => {
    mockUseAllMedia.mockReturnValue({
      media: clusteredMedia,
      loading: false,
      error: null,
    });

    render(<MapTab />);

    expect(screen.getAllByTestId('mock-map-cluster-marker')).toHaveLength(1);
    expect(screen.getAllByTestId('mock-map-stop-marker')).toHaveLength(1);
  });

  it('opens a small cluster directly in the lightbox with only that cluster media', () => {
    mockGetZoom.mockReturnValue(10);
    mockUseAllMedia.mockReturnValue({
      media: photoCountClusterMedia,
      loading: false,
      error: null,
    });

    const onMediaOpen = vi.fn();

    render(<MapTab onMediaOpen={onMediaOpen} />);

    fireEvent.click(screen.getByTestId('mock-map-cluster-marker'));

    expect(onMediaOpen).toHaveBeenCalledWith(
      [photoCountClusterMedia[0], photoCountClusterMedia[1], photoCountClusterMedia[2]],
      0
    );
    expect(mockFitBounds).toHaveBeenCalledTimes(1);
  });

  it('zooms into the selected cluster bounds when a large cluster marker is clicked', () => {
    mockGetZoom.mockReturnValue(10);
    mockUseAllMedia.mockReturnValue({
      media: largeClusterMedia,
      loading: false,
      error: null,
    });

    const onMediaOpen = vi.fn();

    render(<MapTab onMediaOpen={onMediaOpen} />);

    const initialFitBoundsCalls = mockFitBounds.mock.calls.length;
    fireEvent.click(screen.getByTestId('mock-map-cluster-marker'));

    expect(mockFitBounds).toHaveBeenCalledTimes(initialFitBoundsCalls + 1);
    expect(mockFitBounds).toHaveBeenLastCalledWith(
      [
        [35.68, 139.7],
        [35.6812, 139.7012],
      ],
      { padding: [36, 36], maxZoom: 16 }
    );
    expect(onMediaOpen).not.toHaveBeenCalled();
  });

  it('opens the selected day media through the popup button callback with the clicked image index', () => {
    mockGetZoom.mockReturnValue(16);
    mockUseAllMedia.mockReturnValue({
      media: photoCountClusterMedia,
      loading: false,
      error: null,
    });

    const onMediaOpen = vi.fn();

    render(<MapTab onMediaOpen={onMediaOpen} />);

    fireEvent.click(screen.getByTestId('map-open-media-count-2'));

    expect(onMediaOpen).toHaveBeenCalledWith(
      [photoCountClusterMedia[0], photoCountClusterMedia[1]],
      1
    );
  });

  it('clusters moderately spaced nearby photos more aggressively on the standard zoom', () => {
    mockGetZoom.mockReturnValue(10);
    mockUseAllMedia.mockReturnValue({
      media: aggressiveClusterMedia,
      loading: false,
      error: null,
    });

    render(<MapTab />);

    expect(screen.getAllByTestId('mock-map-cluster-marker')).toHaveLength(1);
    expect(screen.queryAllByTestId('mock-map-stop-marker')).toHaveLength(0);
    expect(screen.getByTestId('mock-map-cluster-marker').textContent).toContain('3');
  });

  it('keeps overlapping photo markers separate at high zoom', () => {
    mockGetZoom.mockReturnValue(16);
    mockUseAllMedia.mockReturnValue({
      media: identicalCoordinateMedia,
      loading: false,
      error: null,
    });

    render(<MapTab />);

    expect(screen.queryAllByTestId('mock-map-cluster-marker')).toHaveLength(0);
    expect(screen.getAllByTestId('mock-map-stop-marker')).toHaveLength(3);
    expect(screen.getByTestId('map-open-media-same-1')).toBeTruthy();
    expect(screen.getByTestId('map-open-media-same-2')).toBeTruthy();
    expect(screen.getByTestId('map-open-media-same-3')).toBeTruthy();
  });
});
