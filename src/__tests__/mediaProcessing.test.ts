import { beforeEach, describe, expect, it, vi } from 'vitest';
import { detectMediaKind, extractCapturedAt } from '../utils/mediaProcessing';

const mockExifrParse = vi.fn();

vi.mock('exifr', () => ({
  default: {
    parse: (...args: unknown[]) => mockExifrParse(...args),
  },
}));

vi.mock('heic2any', () => ({
  default: vi.fn(),
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}));

describe('extractCapturedAt', () => {
  const file = new File(['photo'], 'tokyo.jpg', {
    type: 'image/jpeg',
    lastModified: new Date('2026-04-15T10:00:00Z').getTime(),
  });

  beforeEach(() => {
    mockExifrParse.mockReset();
  });

  it('returns exif date and gps coordinates for photos', async () => {
    const takenAt = new Date('2026-04-14T12:34:56Z');
    mockExifrParse.mockResolvedValue({
      DateTimeOriginal: takenAt,
      latitude: 35.68,
      longitude: 139.76,
    });

    await expect(extractCapturedAt(file, 'photo')).resolves.toEqual({
      capturedAt: takenAt,
      source: 'exif',
      location: {
        latitude: 35.68,
        longitude: 139.76,
      },
    });

    expect(mockExifrParse).toHaveBeenCalledWith(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
    });
  });

  it('uses fallback date when exif date is missing but keeps gps', async () => {
    mockExifrParse.mockResolvedValue({
      latitude: 34.69,
      longitude: 135.5,
    });

    await expect(extractCapturedAt(file, 'photo')).resolves.toEqual({
      capturedAt: new Date(file.lastModified),
      source: 'fallback',
      location: {
        latitude: 34.69,
        longitude: 135.5,
      },
    });
  });

  it('omits coordinates when gps is unavailable', async () => {
    const createdAt = new Date('2026-04-13T12:00:00Z');
    mockExifrParse.mockResolvedValue({
      CreateDate: createdAt,
    });

    await expect(extractCapturedAt(file, 'photo')).resolves.toEqual({
      capturedAt: createdAt,
      source: 'exif',
      location: undefined,
    });
  });

  it('falls back cleanly when exif and gps parsing both throw', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockExifrParse.mockRejectedValue(new Error('broken exif'));

    await expect(extractCapturedAt(file, 'photo')).resolves.toEqual({
      capturedAt: new Date(file.lastModified),
      source: 'fallback',
      location: undefined,
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('uses lastModified fallback for videos without attempting gps', async () => {
    const video = new File(['video'], 'tokyo.mp4', {
      type: 'video/mp4',
      lastModified: file.lastModified,
    });

    await expect(extractCapturedAt(video, detectMediaKind(video))).resolves.toEqual({
      capturedAt: new Date(file.lastModified),
      source: 'fallback',
      location: undefined,
    });

    expect(mockExifrParse).not.toHaveBeenCalled();
  });
});
