import type { Media } from '../types';

const loadedImageUrls = new Set<string>();
const pendingImageLoads = new Map<string, Promise<void>>();

const normalizeUrl = (url?: string | null): string | null => {
  if (typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  return trimmed ? trimmed : null;
};

export const isImageUrlReady = (url?: string | null): boolean => {
  const normalizedUrl = normalizeUrl(url);
  return normalizedUrl ? loadedImageUrls.has(normalizedUrl) : false;
};

export const preloadImageUrl = (url?: string | null): Promise<void> => {
  const normalizedUrl = normalizeUrl(url);

  if (!normalizedUrl) {
    return Promise.resolve();
  }

  if (loadedImageUrls.has(normalizedUrl)) {
    return Promise.resolve();
  }

  const existingLoad = pendingImageLoads.get(normalizedUrl);
  if (existingLoad) {
    return existingLoad;
  }

  if (typeof Image === 'undefined') {
    loadedImageUrls.add(normalizedUrl);
    return Promise.resolve();
  }

  const preloadPromise = new Promise<void>((resolve, reject) => {
    const image = new Image();

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };

    const markReady = () => {
      cleanup();
      loadedImageUrls.add(normalizedUrl);
      pendingImageLoads.delete(normalizedUrl);
      resolve();
    };

    image.onload = () => {
      if (typeof image.decode === 'function') {
        image.decode().then(markReady).catch(markReady);
        return;
      }

      markReady();
    };

    image.onerror = () => {
      cleanup();
      pendingImageLoads.delete(normalizedUrl);
      reject(new Error(`Kunde inte preload:a bild: ${normalizedUrl}`));
    };

    image.src = normalizedUrl;
  });

  pendingImageLoads.set(normalizedUrl, preloadPromise);
  return preloadPromise;
};

export const warmImageUrl = (url?: string | null) => {
  void preloadImageUrl(url).catch(() => undefined);
};

export const warmPhotoMedia = (item?: Media | null) => {
  if (!item || item.type !== 'photo') {
    return;
  }

  warmImageUrl(item.url);
};

export const warmLightboxPhotos = (media: Media[], index: number) => {
  if (index < 0 || index >= media.length) {
    return;
  }

  warmPhotoMedia(media[index] ?? null);
  warmPhotoMedia(media[index - 1] ?? null);
  warmPhotoMedia(media[index + 1] ?? null);
};

export const resetImagePreloadCache = () => {
  loadedImageUrls.clear();
  pendingImageLoads.clear();
};
