import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UploadPanel from '../components/UploadPanel';
import type { Day } from '../types';

const {
  mockAddDoc,
  mockCollection,
  mockServerTimestamp,
  mockGetDownloadURL,
  mockRef,
  mockUploadBytes,
  mockUploadBytesResumable,
  mockConvertHeicToJpeg,
  mockCompressImage,
  mockCreateThumbnail,
  mockDetectMediaKind,
  mockExtractCapturedAt,
  mockReadMediaDimensions,
} = vi.hoisted(() => ({
  mockAddDoc: vi.fn(),
  mockCollection: vi.fn(() => 'media-collection'),
  mockServerTimestamp: vi.fn(() => 'server-timestamp'),
  mockGetDownloadURL: vi.fn(),
  mockRef: vi.fn((_storage, path: string) => ({ fullPath: path })),
  mockUploadBytes: vi.fn(),
  mockUploadBytesResumable: vi.fn(),
  mockConvertHeicToJpeg: vi.fn(),
  mockCompressImage: vi.fn(),
  mockCreateThumbnail: vi.fn(),
  mockDetectMediaKind: vi.fn(),
  mockExtractCapturedAt: vi.fn(),
  mockReadMediaDimensions: vi.fn(),
}));

vi.mock('../config/firebase', () => ({
  db: {},
  storage: {},
}));

vi.mock('firebase/firestore', () => ({
  addDoc: mockAddDoc,
  collection: mockCollection,
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('firebase/storage', () => ({
  getDownloadURL: mockGetDownloadURL,
  ref: mockRef,
  uploadBytes: mockUploadBytes,
  uploadBytesResumable: mockUploadBytesResumable,
}));

vi.mock('../utils/mediaProcessing', () => ({
  convertHeicToJpeg: (...args: unknown[]) => mockConvertHeicToJpeg(...args),
  compressImage: (...args: unknown[]) => mockCompressImage(...args),
  createThumbnail: (...args: unknown[]) => mockCreateThumbnail(...args),
  detectMediaKind: (...args: unknown[]) => mockDetectMediaKind(...args),
  extractCapturedAt: (...args: unknown[]) => mockExtractCapturedAt(...args),
  readMediaDimensions: (...args: unknown[]) => mockReadMediaDimensions(...args),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
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

const renderUploadPanel = () =>
  render(
    <UploadPanel
      days={days}
      selectedDay={days[0]}
      ensureDay={vi.fn().mockResolvedValue('day-1')}
      onUploadComplete={vi.fn()}
    />,
  );

beforeEach(() => {
  mockAddDoc.mockReset();
  mockCollection.mockClear();
  mockServerTimestamp.mockClear();
  mockGetDownloadURL.mockReset();
  mockRef.mockClear();
  mockUploadBytes.mockReset();
  mockUploadBytesResumable.mockReset();
  mockConvertHeicToJpeg.mockReset();
  mockCompressImage.mockReset();
  mockCreateThumbnail.mockReset();
  mockDetectMediaKind.mockReset();
  mockExtractCapturedAt.mockReset();
  mockReadMediaDimensions.mockReset();

  mockDetectMediaKind.mockReturnValue('photo');
  mockConvertHeicToJpeg.mockImplementation(async (file: File) => file);
  mockCompressImage.mockImplementation(async (file: File) => file);
  mockCreateThumbnail.mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' }));
  mockReadMediaDimensions.mockResolvedValue({ width: 1600, height: 900 });
  mockGetDownloadURL
    .mockResolvedValueOnce('https://example.com/photo.jpg')
    .mockResolvedValueOnce('https://example.com/thumb.jpg');
  mockUploadBytes.mockResolvedValue(undefined);
  mockUploadBytesResumable.mockImplementation(() => ({
    on: (
      _event: string,
      onProgress?: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
      _onError?: (error: unknown) => void,
      onComplete?: () => void,
    ) => {
      onProgress?.({ bytesTransferred: 1, totalBytes: 1 });
      onComplete?.();
    },
  }));
});

afterEach(() => {
  cleanup();
});

describe('UploadPanel payload', () => {
  it('includes latitude and longitude when extractCapturedAt returns location', async () => {
    const file = new File(['photo'], 'tokyo.jpg', { type: 'image/jpeg' });
    const capturedAt = new Date('2026-04-15T12:00:00Z');
    mockExtractCapturedAt.mockResolvedValue({
      capturedAt,
      source: 'exif',
      location: {
        latitude: 35.68,
        longitude: 139.76,
      },
    });

    renderUploadPanel();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText('Ladda upp 1 filer');
    fireEvent.click(screen.getByText('Ladda upp 1 filer'));

    await waitFor(() => expect(mockAddDoc).toHaveBeenCalledTimes(1));

    expect(mockExtractCapturedAt).toHaveBeenCalledWith(file, 'photo');
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      dayId: 'day-1',
      type: 'photo',
      fileName: 'tokyo.jpg',
      capturedAt,
      width: 1600,
      height: 900,
      latitude: 35.68,
      longitude: 139.76,
    });
  });

  it('omits latitude and longitude when no location is returned', async () => {
    const file = new File(['photo'], 'osaka.jpg', { type: 'image/jpeg' });
    const capturedAt = new Date('2026-04-16T09:00:00Z');
    mockExtractCapturedAt.mockResolvedValue({
      capturedAt,
      source: 'fallback',
      location: undefined,
    });

    renderUploadPanel();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByText('Ladda upp 1 filer');
    fireEvent.click(screen.getByText('Ladda upp 1 filer'));

    await waitFor(() => expect(mockAddDoc).toHaveBeenCalledTimes(1));

    const payload = mockAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.latitude).toBeUndefined();
    expect(payload.longitude).toBeUndefined();
  });
});
