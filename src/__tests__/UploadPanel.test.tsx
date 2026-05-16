import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UploadPanel from '../components/UploadPanel';
import type { Day } from '../types';

const {
  mockCollection,
  mockDeleteDoc,
  mockDoc,
  mockSetDoc,
  mockUpdateDoc,
  mockServerTimestamp,
  mockGetDownloadURL,
  mockRef,
  mockUploadBytes,
  mockUploadBytesResumable,
  mockDeleteObject,
  mockConvertHeicToJpeg,
  mockCompressImage,
  mockCreateThumbnail,
  mockDetectMediaKind,
  mockExtractCapturedAt,
  mockPreparePhotoArtifacts,
  mockReadMediaDimensions,
} = vi.hoisted(() => ({
  mockCollection: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockServerTimestamp: vi.fn(() => 'server-timestamp'),
  mockGetDownloadURL: vi.fn(),
  mockRef: vi.fn((_storage, path: string) => ({ fullPath: path })),
  mockUploadBytes: vi.fn(),
  mockUploadBytesResumable: vi.fn(),
  mockDeleteObject: vi.fn(),
  mockConvertHeicToJpeg: vi.fn(),
  mockCompressImage: vi.fn(),
  mockCreateThumbnail: vi.fn(),
  mockDetectMediaKind: vi.fn(),
  mockExtractCapturedAt: vi.fn(),
  mockPreparePhotoArtifacts: vi.fn(),
  mockReadMediaDimensions: vi.fn(),
}));

let generatedDocCounter = 0;

vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'dGcKysUwFZNfkur2SS3G2UERX242',
    },
  },
  db: {},
  storage: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  deleteDoc: mockDeleteDoc,
  doc: mockDoc,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('firebase/storage', () => ({
  deleteObject: mockDeleteObject,
  getDownloadURL: mockGetDownloadURL,
  ref: mockRef,
  uploadBytes: mockUploadBytes,
  uploadBytesResumable: mockUploadBytesResumable,
}));

vi.mock('../utils/mediaProcessing', () => ({
  convertHeicToJpeg: mockConvertHeicToJpeg,
  compressImage: mockCompressImage,
  createThumbnail: mockCreateThumbnail,
  detectMediaKind: mockDetectMediaKind,
  extractCapturedAt: mockExtractCapturedAt,
  preparePhotoArtifacts: mockPreparePhotoArtifacts,
  readMediaDimensions: mockReadMediaDimensions,
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

const createResumableTask = () => ({
  on: (
    _event: string,
    onProgress?: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
    _onError?: (error: unknown) => void,
    onComplete?: () => void,
  ) => {
    onProgress?.({ bytesTransferred: 5, totalBytes: 10 });
    onProgress?.({ bytesTransferred: 10, totalBytes: 10 });
    onComplete?.();
  },
});

const renderUploadPanel = (ensureDay = vi.fn().mockResolvedValue('day-1'), onUploadComplete = vi.fn()) =>
  render(
    <UploadPanel
      days={days}
      selectedDay={days[0]}
      ensureDay={ensureDay}
      onUploadComplete={onUploadComplete}
    />,
  );

beforeEach(() => {
  generatedDocCounter = 0;

  mockCollection.mockReset();
  mockCollection.mockImplementation((_db, path: string) => ({ path }));

  mockDoc.mockReset();
  mockDoc.mockImplementation((first: unknown, second?: string, third?: string) => {
    if (typeof third === 'string' && typeof second === 'string') {
      return { id: third, path: `${second}/${third}` };
    }

    if (
      first &&
      typeof first === 'object' &&
      'path' in (first as Record<string, unknown>) &&
      typeof (first as { path: string }).path === 'string' &&
      second === undefined
    ) {
      generatedDocCounter += 1;
      return {
        id: `media-doc-${generatedDocCounter}`,
        path: `${(first as { path: string }).path}/media-doc-${generatedDocCounter}`,
      };
    }

    if (
      first &&
      typeof first === 'object' &&
      'path' in (first as Record<string, unknown>) &&
      typeof second === 'string'
    ) {
      return {
        id: second,
        path: `${(first as { path: string }).path}/${second}`,
      };
    }

    return { id: 'unknown-doc', path: 'unknown-doc' };
  });

  mockSetDoc.mockReset();
  mockSetDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockReset();
  mockDeleteDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockReset();
  mockUpdateDoc.mockResolvedValue(undefined);
  mockServerTimestamp.mockClear();

  mockRef.mockReset();
  mockRef.mockImplementation((_storage, path: string) => ({ fullPath: path }));
  mockGetDownloadURL.mockReset();
  mockGetDownloadURL.mockImplementation(async (storageRef: { fullPath: string }) =>
    `https://example.com/${storageRef.fullPath.replace(/\//g, '_')}`,
  );
  mockUploadBytes.mockReset();
  mockUploadBytes.mockResolvedValue(undefined);
  mockUploadBytesResumable.mockReset();
  mockUploadBytesResumable.mockImplementation(() => createResumableTask());
  mockDeleteObject.mockReset();
  mockDeleteObject.mockResolvedValue(undefined);

  mockConvertHeicToJpeg.mockReset();
  mockConvertHeicToJpeg.mockImplementation(async (file: File) => file);
  mockCompressImage.mockReset();
  mockCompressImage.mockImplementation(async (file: File) => file);
  mockCreateThumbnail.mockReset();
  mockCreateThumbnail.mockResolvedValue(new Blob(['thumb'], { type: 'image/jpeg' }));
  mockDetectMediaKind.mockReset();
  mockDetectMediaKind.mockReturnValue('photo');
  mockExtractCapturedAt.mockReset();
  mockPreparePhotoArtifacts.mockReset();
  mockPreparePhotoArtifacts.mockResolvedValue({
    dimensions: { width: 1600, height: 900 },
    thumbnailBlob: new Blob(['thumb'], { type: 'image/jpeg' }),
  });
  mockReadMediaDimensions.mockReset();
  mockReadMediaDimensions.mockResolvedValue({ width: 1600, height: 900 });
});

afterEach(() => {
  cleanup();
});

describe('UploadPanel lifecycle', () => {
  it('creates a draft record, uploads files, and finalizes with metadata', async () => {
    const file = new File(['photo'], 'tokyo.jpg', { type: 'image/jpeg' });
    const capturedAt = new Date('2026-04-15T12:00:00Z');
    const onUploadComplete = vi.fn();
    mockExtractCapturedAt.mockResolvedValue({
      capturedAt,
      source: 'exif',
      location: {
        latitude: 35.68,
        longitude: 139.76,
      },
    });

    renderUploadPanel(vi.fn().mockResolvedValue('day-1'), onUploadComplete);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByRole('button', { name: 'Ladda upp 1 filer' });
    fireEvent.click(screen.getByRole('button', { name: 'Ladda upp 1 filer' }));

    await waitFor(() => expect(mockSetDoc).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalledTimes(1));

    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({
      dayId: 'day-1',
      type: 'photo',
      fileName: 'tokyo.jpg',
      capturedAt,
      width: 1600,
      height: 900,
      latitude: 35.68,
      longitude: 139.76,
      uploadStatus: 'uploading',
      capturedAtSource: 'exif',
      uploaderUid: 'dGcKysUwFZNfkur2SS3G2UERX242',
    });
    expect(mockUpdateDoc.mock.calls[0][1]).toMatchObject({
      uploadStatus: 'ready',
    });
    expect(onUploadComplete).toHaveBeenCalledWith('day-1');
    expect(screen.getByText('1 filer laddades upp utan fel.')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('resolves ensureDay once per unique day across a batch', async () => {
    const first = new File(['a'], 'tokyo-1.jpg', { type: 'image/jpeg' });
    const second = new File(['b'], 'tokyo-2.jpg', { type: 'image/jpeg' });
    const third = new File(['c'], 'osaka.jpg', { type: 'image/jpeg' });
    const ensureDay = vi.fn(async (date: Date) =>
      date.toISOString().startsWith('2026-04-15') ? 'day-1' : 'day-2',
    );

    mockExtractCapturedAt
      .mockResolvedValueOnce({
        capturedAt: new Date('2026-04-15T08:00:00Z'),
        source: 'exif',
        location: undefined,
      })
      .mockResolvedValueOnce({
        capturedAt: new Date('2026-04-15T20:00:00Z'),
        source: 'fallback',
        location: undefined,
      })
      .mockResolvedValueOnce({
        capturedAt: new Date('2026-04-16T09:00:00Z'),
        source: 'fallback',
        location: undefined,
      });

    renderUploadPanel(ensureDay);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [first, second, third] } });

    await screen.findByRole('button', { name: 'Ladda upp 3 filer' });
    fireEvent.click(screen.getByRole('button', { name: 'Ladda upp 3 filer' }));

    await waitFor(() => expect(mockSetDoc).toHaveBeenCalledTimes(3));
    expect(ensureDay).toHaveBeenCalledTimes(2);
  });

  it('does not attempt uploads for files that fail preparation or validation', async () => {
    const goodFile = new File(['photo'], 'tokyo.jpg', { type: 'image/jpeg' });
    const badFile = new File(['bad'], 'notes.txt', { type: 'text/plain' });
    mockExtractCapturedAt.mockResolvedValue({
      capturedAt: new Date('2026-04-15T12:00:00Z'),
      source: 'fallback',
      location: undefined,
    });
    mockDetectMediaKind.mockImplementation(() => 'photo');

    renderUploadPanel();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [goodFile, badFile] } });

    await screen.findByText('Filtypen stod inte pa listan over stodda uppladdningar.');
    fireEvent.click(screen.getByRole('button', { name: 'Ladda upp 1 filer' }));

    await waitFor(() => expect(mockSetDoc).toHaveBeenCalledTimes(1));
    expect(mockSetDoc.mock.calls[0][1].fileName).toBe('tokyo.jpg');
  });

  it('deletes failed drafts, cleans up uploaded files, and retries from the local queue', async () => {
    const file = new File(['photo'], 'tokyo.jpg', { type: 'image/jpeg' });
    mockExtractCapturedAt.mockResolvedValue({
      capturedAt: new Date('2026-04-15T12:00:00Z'),
      source: 'fallback',
      location: undefined,
    });

    let readyUpdateAttempts = 0;
    mockUpdateDoc.mockImplementation(async (_ref, payload) => {
      if (payload && typeof payload === 'object' && 'uploadStatus' in (payload as Record<string, unknown>)) {
        const status = (payload as Record<string, unknown>).uploadStatus;
        if (status === 'ready') {
          readyUpdateAttempts += 1;
          if (readyUpdateAttempts === 1) {
            throw new Error('firestore finalize failed');
          }
        }
      }
    });

    renderUploadPanel();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByRole('button', { name: 'Ladda upp 1 filer' });
    fireEvent.click(screen.getByRole('button', { name: 'Ladda upp 1 filer' }));

    await screen.findByRole('button', { name: 'Forsok igen' });
    expect(mockDeleteObject).toHaveBeenCalledTimes(2);
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(screen.getByText('0 klara, 1 behovde ett nytt forsok.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Forsok igen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ladda upp 1 filer' }));

    await waitFor(() => expect(mockSetDoc).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('1 filer laddades upp utan fel.')).toBeTruthy());

    const firstDocRef = mockSetDoc.mock.calls[0][0] as { id: string };
    const secondDocRef = mockSetDoc.mock.calls[1][0] as { id: string };
    expect(firstDocRef.id).toBe(secondDocRef.id);
  });

  it('limits file preparation to one item at a time on coarse-pointer devices', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const files = [
      new File(['a'], 'tokyo-1.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'tokyo-2.jpg', { type: 'image/jpeg' }),
      new File(['c'], 'tokyo-3.jpg', { type: 'image/jpeg' }),
    ];
    let activePreparations = 0;
    let maxPreparations = 0;

    mockExtractCapturedAt.mockResolvedValue({
      capturedAt: new Date('2026-04-15T12:00:00Z'),
      source: 'fallback',
      location: undefined,
    });
    mockPreparePhotoArtifacts.mockImplementation(async () => {
      activePreparations += 1;
      maxPreparations = Math.max(maxPreparations, activePreparations);
      await new Promise((resolve) => setTimeout(resolve, 20));
      activePreparations -= 1;
      return {
        dimensions: { width: 1600, height: 900 },
        thumbnailBlob: new Blob(['thumb'], { type: 'image/jpeg' }),
      };
    });

    renderUploadPanel();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files } });

    await screen.findByRole('button', { name: 'Ladda upp 3 filer' });

    expect(mockPreparePhotoArtifacts).toHaveBeenCalledTimes(3);
    expect(maxPreparations).toBe(1);
  });
});
