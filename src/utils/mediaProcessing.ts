import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import heic2any from 'heic2any';

export type MediaKind = 'photo' | 'video';
export type CapturedAtSource = 'exif' | 'fallback';

export interface CapturedAtResult {
  capturedAt: Date;
  source: CapturedAtSource;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface PhotoArtifacts {
  dimensions: MediaDimensions;
  thumbnailBlob: Blob;
}

interface LoadedImageResource {
  image: HTMLImageElement;
  cleanup: () => void;
}

interface LoadedVideoResource {
  video: HTMLVideoElement;
  cleanup: () => void;
}

const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.m4v', '.webm', '.avi'];

const getExtension = (fileName: string): string => {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '';
};

const releaseCanvas = (canvas: HTMLCanvasElement) => {
  canvas.width = 0;
  canvas.height = 0;
};

const createObjectUrlCleanup = (objectUrl: string, reset: () => void) => {
  let cleanedUp = false;

  return () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    reset();
    URL.revokeObjectURL(objectUrl);
  };
};

export const isHeicFile = (file: File): boolean => {
  const extension = getExtension(file.name);
  return extension === '.heic' || extension === '.heif' || file.type === 'image/heic' || file.type === 'image/heif';
};

export const detectMediaKind = (file: File): MediaKind => {
  if (file.type.startsWith('video/')) {
    return 'video';
  }

  const extension = getExtension(file.name);
  if (VIDEO_EXTENSIONS.includes(extension)) {
    return 'video';
  }

  if (file.type.startsWith('image/')) {
    return 'photo';
  }

  return 'photo';
};

export const convertHeicToJpeg = async (file: File): Promise<File> => {
  if (!isHeicFile(file)) {
    return file;
  }

  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.86,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
};

export const compressImage = async (file: File, kind: MediaKind): Promise<File> => {
  if (kind !== 'photo') {
    return file;
  }

  if (file.size < 500 * 1024) {
    return file;
  }

  try {
    const isHeic = file.name.match(/\.(heic|heif)$/i);
    const targetFileType = isHeic ? 'image/jpeg' : file.type;
    const options = {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      preserveExif: true,
      fileType: targetFileType,
      initialQuality: 0.85,
    };

    const compressedBlob = await imageCompression(file, options);
    if (compressedBlob.size >= file.size) {
      return file;
    }

    const newFileName = isHeic ? file.name.replace(/\.(heic|heif)$/i, '.jpg') : file.name;

    return new File([compressedBlob], newFileName, {
      type: targetFileType,
      lastModified: file.lastModified,
    });
  } catch (error) {
    console.warn('Image compression failed, falling back to original file', error);
    return file;
  }
};

export const extractCapturedAt = async (
  file: File,
  kind: MediaKind = detectMediaKind(file),
): Promise<CapturedAtResult> => {
  if (kind !== 'photo') {
    return {
      capturedAt: new Date(file.lastModified),
      source: 'fallback',
      location: undefined,
    };
  }

  try {
    const metadata = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
    });
    const candidate = metadata?.DateTimeOriginal ?? metadata?.CreateDate;
    const latitude = metadata?.latitude;
    const longitude = metadata?.longitude;
    const location =
      typeof latitude === 'number' && typeof longitude === 'number'
        ? {
            latitude,
            longitude,
          }
        : undefined;

    if (candidate instanceof Date) {
      return {
        capturedAt: candidate,
        source: 'exif',
        location,
      };
    }

    return {
      capturedAt: new Date(file.lastModified),
      source: 'fallback',
      location,
    };
  } catch (error) {
    console.warn('Could not read EXIF metadata, falling back to file metadata', error);
    return {
      capturedAt: new Date(file.lastModified),
      source: 'fallback',
      location: undefined,
    };
  }
};

const loadImageResource = (file: File): Promise<LoadedImageResource> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    const cleanup = createObjectUrlCleanup(objectUrl, () => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
    });

    image.onload = () => {
      resolve({
        image,
        cleanup,
      });
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Kunde inte lasa bilden.'));
    };
    image.src = objectUrl;
  });

const loadVideoResource = (file: File): Promise<LoadedVideoResource> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Videoinläsning tog för lång tid.'));
    }, 12000);

    const cleanup = createObjectUrlCleanup(objectUrl, () => {
      clearTimeout(timeout);
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.pause();
      video.removeAttribute('src');
      video.src = '';
      video.load();
    });

    video.preload = 'auto';
    video.playsInline = true;
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.setAttribute('playsinline', '');

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      resolve({
        video,
        cleanup,
      });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Kunde inte lasa videofilen.'));
    };

    video.src = objectUrl;
    video.load();
  });

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Kunde inte skapa miniatyr.'));
      },
      'image/jpeg',
      0.84,
    );
  });

const drawPhotoThumbnail = async (image: HTMLImageElement, maxSize: number): Promise<Blob> => {
  const width = image.naturalWidth || image.width || maxSize;
  const height = image.naturalHeight || image.height || maxSize;
  const scale = Math.min(maxSize / width, maxSize / height, 1);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    releaseCanvas(canvas);
    throw new Error('Kunde inte skapa canvas-kontekst.');
  }

  try {
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvasToBlob(canvas);
  } finally {
    releaseCanvas(canvas);
  }
};

export const preparePhotoArtifacts = async (file: File, maxSize = 600): Promise<PhotoArtifacts> => {
  const { image, cleanup } = await loadImageResource(file);

  try {
    return {
      dimensions: {
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0,
      },
      thumbnailBlob: await drawPhotoThumbnail(image, maxSize),
    };
  } finally {
    cleanup();
  }
};

export const readMediaDimensions = async (file: File, kind: MediaKind): Promise<MediaDimensions> => {
  if (kind === 'video') {
    const { video, cleanup } = await loadVideoResource(file);
    try {
      return {
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      };
    } finally {
      cleanup();
    }
  }

  const { image, cleanup } = await loadImageResource(file);
  try {
    return {
      width: image.naturalWidth || image.width || 0,
      height: image.naturalHeight || image.height || 0,
    };
  } finally {
    cleanup();
  }
};

export const createThumbnail = async (file: File, kind: MediaKind, maxSize = 600): Promise<Blob> => {
  if (kind === 'video') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      releaseCanvas(canvas);
      throw new Error('Kunde inte skapa canvas-kontekst.');
    }

    const { video, cleanup } = await loadVideoResource(file);

    try {
      const width = video.videoWidth || maxSize;
      const height = video.videoHeight || maxSize;
      const scale = Math.min(maxSize / width, maxSize / height, 1);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return await canvasToBlob(canvas);
    } finally {
      cleanup();
      releaseCanvas(canvas);
    }
  }

  const { thumbnailBlob } = await preparePhotoArtifacts(file, maxSize);
  return thumbnailBlob;
};
