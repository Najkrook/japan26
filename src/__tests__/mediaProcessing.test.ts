import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectMediaKind,
  extractCapturedAt,
} from '../utils/mediaProcessing';

const mockExifrParse = vi.fn();
const mockExifrGps = vi.fn();

vi.mock('exifr', () => ({
  default: {
    parse: (...args: unknown[]) => mockExifrParse(...args),
    gps: (...args: unknown[]) => mockExifrGps(...args),
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
    mockExifrGps.mockReset();
  });

  it('returns exif date and gps coordinates for photos', async () => {
    const takenAt = new Date('2026-04-14T12:34:56Z');
    mockExifrParse.mockResolvedValue({
      DateTimeOriginal: takenAt,
    });
    mockExifrGps.mockResolvedValue({
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
      pick: ['DateTimeOriginal', 'CreateDate'],
    });
    expect(mockExifrGps).toHaveBeenCalledWith(file);
  });

  it('uses fallback date when exif date is missing but keeps gps', async () => {
    mockExifrParse.mockResolvedValue(undefined);
    mockExifrGps.mockResolvedValue({
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
    mockExifrGps.mockResolvedValue(undefined);

    await expect(extractCapturedAt(file, 'photo')).resolves.toEqual({
      capturedAt: createdAt,
      source: 'exif',
      location: undefined,
    });
  });

  it('falls back cleanly when exif parsing throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockExifrParse.mockRejectedValue(new Error('broken exif'));
    mockExifrGps.mockRejectedValue(new Error('broken gps'));

    await expect(extractCapturedAt(file, 'photo')).resolves.toEqual({
      capturedAt: new Date(file.lastModified),
      source: 'fallback',
      location: undefined,
    });

    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it('does not try to read gps for videos', async () => {
    const video = new File(['video'], 'tokyo.mp4', {
      type: 'video/mp4',
      lastModified: file.lastModified,
    });
    const capturedAt = new Date('2026-04-14T22:00:00Z');
    mockExifrParse.mockResolvedValue({
      CreateDate: capturedAt,
    });

    await expect(extractCapturedAt(video, detectMediaKind(video))).resolves.toEqual({
      capturedAt,
      source: 'exif',
      location: undefined,
    });

    expect(mockExifrGps).not.toHaveBeenCalled();
  });
});
