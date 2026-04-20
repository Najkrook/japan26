import exifr from 'exifr';
import heic2any from 'heic2any';
import imageCompression from 'browser-image-compression';

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

interface ParsedDateMetadata {
  DateTimeOriginal?: Date;
  CreateDate?: Date;
}

const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.m4v', '.webm', '.avi'];

const getExtension = (fileName: string): string => {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '';
};

export const isHeicFile = (file: File): boolean => {
  const extension = getExtension(file.name);
  return extension === '.heic' || extension === '.heif' || file.type === 'image/heic' || file.type === 'image/heif';
};

export const detectMediaKind = (file: File): MediaKind => {
  if (file.type.startsWith('video/')) {
    return 'video';
  }

  if (file.type.startsWith('image/')) {
    return 'photo';
  }

  return VIDEO_EXTENSIONS.includes(getExtension(file.name)) ? 'video' : 'photo';
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

  // Skip compression for very small files (< 500 KB)
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
    
    // Safety check: if compression somehow made it larger, use original
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

const extractDateMetadata = async (file: File): Promise<ParsedDateMetadata | undefined> => {
  try {
    const metadata = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate'],
    });

    return metadata as ParsedDateMetadata | undefined;
  } catch (error) {
    console.warn('Could not read EXIF date metadata', error);
    return undefined;
  }
};

const extractGpsLocation = async (
  file: File,
): Promise<CapturedAtResult['location'] | undefined> => {
  try {
    const gps = await exifr.gps(file);

    if (gps?.latitude !== undefined && gps?.longitude !== undefined) {
      return {
        latitude: gps.latitude,
        longitude: gps.longitude,
      };
    }
  } catch (error) {
    console.warn('Could not read EXIF GPS metadata', error);
  }

  return undefined;
};

export const extractCapturedAt = async (
  file: File,
  kind: MediaKind = detectMediaKind(file),
): Promise<CapturedAtResult> => {
  const [dateMetadata, location] = await Promise.all([
    extractDateMetadata(file),
    kind === 'photo' ? extractGpsLocation(file) : Promise.resolve(undefined),
  ]);

  const candidate = dateMetadata?.DateTimeOriginal ?? dateMetadata?.CreateDate;

  if (candidate instanceof Date) {
    return { capturedAt: candidate, source: 'exif', location };
  }

  return {
    capturedAt: new Date(file.lastModified),
    source: 'fallback',
    location,
  };
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Kunde inte läsa bilden.'));
    };
    image.src = objectUrl;
  });

const loadVideo = (file: File): Promise<HTMLVideoElement> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;
    video.onloadeddata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Kunde inte läsa videon.'));
    };
    video.src = objectUrl;
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

export const readMediaDimensions = async (file: File, kind: MediaKind): Promise<MediaDimensions> => {
  if (kind === 'video') {
    const video = await loadVideo(file);
    return {
      width: video.videoWidth || 0,
      height: video.videoHeight || 0,
    };
  }

  const image = await loadImage(file);
  return {
    width: image.naturalWidth || image.width || 0,
    height: image.naturalHeight || image.height || 0,
  };
};

export const createThumbnail = async (file: File, kind: MediaKind, maxSize = 600): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Kunde inte skapa canvas-kontekst.');
  }

  if (kind === 'video') {
    const video = await loadVideo(file);
    const width = video.videoWidth || maxSize;
    const height = video.videoHeight || maxSize;
    const scale = Math.min(maxSize / width, maxSize / height, 1);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvasToBlob(canvas);
  }

  const image = await loadImage(file);
  const width = image.naturalWidth || image.width || maxSize;
  const height = image.naturalHeight || image.height || maxSize;
  const scale = Math.min(maxSize / width, maxSize / height, 1);
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas);
};
