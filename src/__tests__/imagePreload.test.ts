import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isImageUrlReady, preloadImageUrl, resetImagePreloadCache } from '../utils/imagePreload';

const loadCounts = new Map<string, number>();

class MockImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  decode() {
    return Promise.resolve();
  }

  set src(value: string) {
    loadCounts.set(value, (loadCounts.get(value) ?? 0) + 1);
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

beforeEach(() => {
  loadCounts.clear();
  resetImagePreloadCache();
  vi.stubGlobal('Image', MockImage);
});

describe('imagePreload', () => {
  it('dedupes concurrent requests for the same image url', async () => {
    const url = 'https://example.com/a.jpg';

    const first = preloadImageUrl(url);
    const second = preloadImageUrl(url);

    expect(first).toBe(second);

    await Promise.all([first, second]);

    expect(loadCounts.get(url)).toBe(1);
    expect(isImageUrlReady(url)).toBe(true);
  });

  it('returns immediately for a cached image url', async () => {
    const url = 'https://example.com/b.jpg';

    await preloadImageUrl(url);
    expect(isImageUrlReady(url)).toBe(true);

    await preloadImageUrl(url);

    expect(loadCounts.get(url)).toBe(1);
  });
});
