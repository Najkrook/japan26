import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import type { Day } from '../types';
import { formatDateKey, formatDateSwedish } from '../utils/dateHelpers';
import {
  compressImage,
  convertHeicToJpeg,
  detectMediaKind,
  extractCapturedAt,
  preparePhotoArtifacts,
  type CapturedAtSource,
  type MediaKind,
} from '../utils/mediaProcessing';

interface UploadPanelProps {
  days: Day[];
  selectedDay: Day | null;
  ensureDay: (date: Date) => Promise<string>;
  onUploadComplete: (dayId: string) => void;
}

type UploadStatus =
  | 'preparing'
  | 'queued'
  | 'prepareFailed'
  | 'uploading'
  | 'uploadFailed'
  | 'success';

interface UploadQueueItem {
  id: string;
  file: File;
  thumbnailBlob: Blob;
  fileName: string;
  contentType: string;
  kind: MediaKind;
  capturedAt: Date;
  capturedAtSource: CapturedAtSource;
  width: number;
  height: number;
  latitude?: number;
  longitude?: number;
  status: UploadStatus;
  progress: number;
  error: string | null;
  mediaDocId: string | null;
  storagePath: string | null;
  thumbnailStoragePath: string | null;
}

interface BatchSummary {
  successCount: number;
  failureCount: number;
}

const MAX_QUEUE_ITEMS = 24;
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const SUPPORTED_VIDEO_EXTENSIONS = new Set(['.mov', '.mp4', '.m4v', '.webm', '.avi']);
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.heic',
  '.heif',
]);
const MOBILE_PREPARE_CONCURRENCY = 1;
const DESKTOP_PREPARE_CONCURRENCY = 2;

const STATUS_LABELS: Record<UploadStatus, string> = {
  preparing: 'Forbereder',
  queued: 'Klar',
  prepareFailed: 'Fastnade',
  uploading: 'Laddar upp',
  uploadFailed: 'Misslyckades',
  success: 'Klar',
};

const makeQueueId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getExtension = (fileName: string): string => {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '';
};

const inferContentType = (file: File, kind: MediaKind): string => {
  if (file.type) {
    return file.type;
  }

  const extension = getExtension(file.name);

  if (kind === 'video') {
    if (extension === '.mov') return 'video/quicktime';
    if (extension === '.webm') return 'video/webm';
    if (extension === '.avi') return 'video/x-msvideo';
    return 'video/mp4';
  }

  if (extension === '.png') return 'image/png';
  if (extension === '.gif') return 'image/gif';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.bmp') return 'image/bmp';
  return 'image/jpeg';
};

const isSupportedFile = (file: File, kind: MediaKind): boolean => {
  const extension = getExtension(file.name);

  if (kind === 'video') {
    return file.type.startsWith('video/') || SUPPORTED_VIDEO_EXTENSIONS.has(extension);
  }

  return file.type.startsWith('image/') || SUPPORTED_IMAGE_EXTENSIONS.has(extension);
};

const validateFileForUpload = (file: File, currentQueueCount: number, selectionIndex: number): string | null => {
  if (currentQueueCount + selectionIndex >= MAX_QUEUE_ITEMS) {
    return `Koen ar full. Max ${MAX_QUEUE_ITEMS} filer samtidigt.`;
  }

  const kind = detectMediaKind(file);
  if (!isSupportedFile(file, kind)) {
    return 'Filtypen stod inte pa listan over stodda uppladdningar.';
  }

  const sizeLimit = kind === 'video' ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (file.size > sizeLimit) {
    return `Filen ar for stor. Max ${formatFileSize(sizeLimit)} for ${kind === 'video' ? 'video' : 'foto'}.`;
  }

  return null;
};

const makeBaseQueueItem = (file: File, itemId = makeQueueId()): UploadQueueItem => {
  const kind = detectMediaKind(file);

  return {
    id: itemId,
    file,
    thumbnailBlob: new Blob(),
    fileName: file.name,
    contentType: inferContentType(file, kind),
    kind,
    capturedAt: new Date(file.lastModified),
    capturedAtSource: 'fallback',
    width: 0,
    height: 0,
    status: 'preparing',
    progress: 0,
    error: null,
    mediaDocId: null,
    storagePath: null,
    thumbnailStoragePath: null,
  };
};

const UploadPanel: React.FC<UploadPanelProps> = ({ ensureDay, onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prepareConcurrency =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
      ? MOBILE_PREPARE_CONCURRENCY
      : DESKTOP_PREPARE_CONCURRENCY;

  const updateQueueItem = (itemId: string, updater: (item: UploadQueueItem) => UploadQueueItem) => {
    setQueue((currentQueue) => currentQueue.map((item) => (item.id === itemId ? updater(item) : item)));
  };

  const removeQueueItem = (itemId: string) => {
    setQueue((currentQueue) => currentQueue.filter((item) => item.id !== itemId));
  };

  const clearCompletedItems = () => {
    setQueue((currentQueue) => currentQueue.filter((item) => item.status !== 'success'));
  };

  const markItemForRetry = (itemId: string) => {
    updateQueueItem(itemId, (item) =>
      item.status === 'uploadFailed'
        ? {
            ...item,
            status: 'queued',
            error: null,
            progress: 0,
          }
        : item,
    );
    setBatchSummary(null);
  };

  const prepareFile = async (file: File, itemId: string): Promise<UploadQueueItem> => {
    const kind = detectMediaKind(file);
    const isVideo = kind === 'video';
    const capturedAtInfo = await extractCapturedAt(file, kind);
    const processedFile = await convertHeicToJpeg(file);
    const compressedFile = await compressImage(processedFile, kind);

    let dimensions = { width: 0, height: 0 };
    let thumbnailBlob = new Blob();

    if (!isVideo) {
      try {
        const photoArtifacts = await preparePhotoArtifacts(compressedFile);
        dimensions = photoArtifacts.dimensions;
        thumbnailBlob = photoArtifacts.thumbnailBlob;
      } catch (thumbnailError) {
        console.warn('Thumbnail generation failed, continuing without thumbnail.', thumbnailError);
      }
    }

    return {
      id: itemId,
      file: compressedFile,
      thumbnailBlob,
      fileName: compressedFile.name,
      contentType: inferContentType(compressedFile, kind),
      kind,
      capturedAt: capturedAtInfo.capturedAt,
      capturedAtSource: capturedAtInfo.source,
      width: dimensions.width,
      height: dimensions.height,
      latitude: capturedAtInfo.location?.latitude,
      longitude: capturedAtInfo.location?.longitude,
      status: 'queued',
      progress: 0,
      error: null,
      mediaDocId: null,
      storagePath: null,
      thumbnailStoragePath: null,
    };
  };

  const cleanupStorageFiles = async (mediaPath: string | null, thumbnailPath: string | null) => {
    const cleanupTasks: Promise<unknown>[] = [];

    if (mediaPath) {
      cleanupTasks.push(deleteObject(ref(storage, mediaPath)).catch(() => undefined));
    }

    if (thumbnailPath) {
      cleanupTasks.push(deleteObject(ref(storage, thumbnailPath)).catch(() => undefined));
    }

    await Promise.all(cleanupTasks);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setBatchSummary(null);

    const fileList = Array.from(files);
    const currentQueueCount = queue.length;
    const placeholderItems = fileList.map((file) => makeBaseQueueItem(file));

    setQueue((currentQueue) => [...currentQueue, ...placeholderItems]);

    for (let startIndex = 0; startIndex < placeholderItems.length; startIndex += prepareConcurrency) {
      const batch = placeholderItems.slice(startIndex, startIndex + prepareConcurrency);

      await Promise.all(
        batch.map(async (placeholder, batchIndex) => {
          const selectionIndex = startIndex + batchIndex;
          const validationError = validateFileForUpload(placeholder.file, currentQueueCount, selectionIndex);

          if (validationError) {
            updateQueueItem(placeholder.id, (item) => ({
              ...item,
              status: 'prepareFailed',
              error: validationError,
            }));
            return;
          }

          try {
            const preparedItem = await prepareFile(placeholder.file, placeholder.id);
            updateQueueItem(placeholder.id, () => preparedItem);
          } catch (preparationError) {
            updateQueueItem(placeholder.id, (item) => ({
              ...item,
              status: 'prepareFailed',
              error:
                preparationError instanceof Error
                  ? preparationError.message
                  : 'Kunde inte forbereda filen.',
            }));
          }
        }),
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadableItems = queue.filter((item) => item.status === 'queued' || item.status === 'uploadFailed');
  const pendingItems = uploadableItems.length;
  const completedItems = queue.filter((item) => item.status === 'success').length;

  const handleStartUpload = async () => {
    if (isUploading || uploadableItems.length === 0) {
      return;
    }

    const uploaderUid = auth.currentUser?.uid;
    if (!uploaderUid) {
      setError('Du maste vara inloggad for att ladda upp media.');
      return;
    }

    let latestDayId: string | null = null;
    let successCount = 0;
    let failureCount = 0;

    setIsUploading(true);
    setError(null);
    setBatchSummary(null);

    const dayResolution = new Map<string, { dayId?: string; error?: string }>();
    const uniqueDateKeys = Array.from(new Set(uploadableItems.map((item) => formatDateKey(item.capturedAt))));

    for (const dateKey of uniqueDateKeys) {
      const sampleItem = uploadableItems.find((item) => formatDateKey(item.capturedAt) === dateKey);
      if (!sampleItem) {
        continue;
      }

      try {
        const dayId = await ensureDay(sampleItem.capturedAt);
        dayResolution.set(dateKey, { dayId });
      } catch (dayError) {
        dayResolution.set(dateKey, {
          error: dayError instanceof Error ? dayError.message : 'Kunde inte skapa dagen for uppladdningen.',
        });
      }
    }

    try {
      for (const item of uploadableItems) {
        const dateKey = formatDateKey(item.capturedAt);
        const dayResult = dayResolution.get(dateKey);

        if (!dayResult?.dayId) {
          failureCount++;
          updateQueueItem(item.id, (currentItem) => ({
            ...currentItem,
            status: 'uploadFailed',
            progress: 0,
            error: dayResult?.error ?? 'Kunde inte hitta maldagen for filen.',
          }));
          continue;
        }

        const dayId = dayResult.dayId;
        const mediaDocId = item.mediaDocId ?? doc(collection(db, 'media')).id;
        const fileExtension = getExtension(item.fileName) || (item.kind === 'video' ? '.mp4' : '.jpg');
        const canonicalFileName = `${mediaDocId}${fileExtension}`;
        const mediaPath = item.storagePath ?? `media/${dayId}/${canonicalFileName}`;
        const thumbnailPath =
          item.thumbnailStoragePath ?? `thumbnails/${dayId}/${canonicalFileName}`;
        const mediaRef = doc(db, 'media', mediaDocId);

        updateQueueItem(item.id, (currentItem) => ({
          ...currentItem,
          status: 'uploading',
          progress: 0,
          error: null,
          mediaDocId,
          storagePath: mediaPath,
          thumbnailStoragePath: thumbnailPath,
        }));

        let draftCreated = false;

        try {
          await setDoc(mediaRef, {
            dayId,
            type: item.kind,
            url: '',
            thumbnailUrl: '',
            storagePath: mediaPath,
            thumbnailStoragePath: thumbnailPath,
            fileName: item.fileName,
            capturedAt: item.capturedAt,
            uploadedAt: serverTimestamp(),
            width: item.width,
            height: item.height,
            caption: '',
            uploadStatus: 'uploading',
            capturedAtSource: item.capturedAtSource,
            uploaderUid,
            ...(item.latitude !== undefined && item.longitude !== undefined
              ? {
                  latitude: item.latitude,
                  longitude: item.longitude,
                }
              : {}),
          });
          draftCreated = true;

          await new Promise<void>((resolve, reject) => {
            const uploadTask = uploadBytesResumable(ref(storage, mediaPath), item.file, {
              contentType: item.contentType,
              cacheControl: 'public,max-age=31536000,immutable',
              customMetadata: {
                dayId,
                capturedAtSource: item.capturedAtSource,
                kind: item.kind,
                mediaDocId,
              },
            });

            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const originalProgress =
                  snapshot.totalBytes > 0 ? (snapshot.bytesTransferred / snapshot.totalBytes) * 90 : 0;
                updateQueueItem(item.id, (currentItem) => ({
                  ...currentItem,
                  progress: originalProgress,
                }));
              },
              reject,
              () => resolve(),
            );
          });

          let thumbnailUrl = '';
          if (item.thumbnailBlob.size > 0) {
            updateQueueItem(item.id, (currentItem) => ({
              ...currentItem,
              progress: 95,
            }));

            await uploadBytes(ref(storage, thumbnailPath), item.thumbnailBlob, {
              contentType: 'image/jpeg',
              cacheControl: 'public,max-age=31536000,immutable',
              customMetadata: {
                dayId,
                parentMediaId: mediaDocId,
              },
            });
            thumbnailUrl = await getDownloadURL(ref(storage, thumbnailPath));
          }

          const url = await getDownloadURL(ref(storage, mediaPath));

          await updateDoc(mediaRef, {
            url,
            thumbnailUrl,
            uploadStatus: 'ready',
            uploadedAt: serverTimestamp(),
          });

          successCount++;
          latestDayId = dayId;
          updateQueueItem(item.id, (currentItem) => ({
            ...currentItem,
            status: 'success',
            progress: 100,
            error: null,
            mediaDocId,
            storagePath: mediaPath,
            thumbnailStoragePath: thumbnailPath,
          }));
        } catch (uploadError) {
          failureCount++;
          await cleanupStorageFiles(mediaPath, item.thumbnailBlob.size > 0 ? thumbnailPath : null);

          if (draftCreated) {
            // Failed drafts should not survive page reloads in the admin-only flow.
            await deleteDoc(mediaRef).catch(() => undefined);
          }

          updateQueueItem(item.id, (currentItem) => ({
            ...currentItem,
            status: 'uploadFailed',
            progress: 0,
            mediaDocId,
            storagePath: mediaPath,
            thumbnailStoragePath: thumbnailPath,
            error: uploadError instanceof Error ? uploadError.message : 'Uppladdningen misslyckades.',
          }));
        }
      }
    } finally {
      setIsUploading(false);
      setBatchSummary({
        successCount,
        failureCount,
      });

      if (latestDayId) {
        onUploadComplete(latestDayId);
      }
    }
  };

  return (
    <div className="upload-container glass">
      <div className="upload-header">
        <Upload size={20} className="primary-icon" />
        <h3>Ladda upp media</h3>
      </div>

      <div className="upload-zone" onClick={() => !isUploading && fileInputRef.current?.click()}>
        <input
          type="file"
          multiple
          accept="image/*,video/*,.heic,.heif"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="uploading-state">
            <Loader2 className="spinner" size={32} />
            <p>Laddar upp filko...</p>
          </div>
        ) : (
          <div className="idle-state">
            <div className="icons">
              <ImageIcon size={32} />
              <Video size={32} />
            </div>
            <p>Tryck for att valja bilder och videor</p>
            <span>HEIC konverteras automatiskt och datum lases i forsta hand fran metadata.</span>
          </div>
        )}
      </div>

      {queue.length > 0 && (
        <div className="queue-actions">
          <span>{queue.length} filer i ko</span>
          {completedItems > 0 && (
            <button type="button" className="subtle-btn" onClick={clearCompletedItems} disabled={isUploading}>
              <CheckCircle2 size={14} />
              Rensa klara
            </button>
          )}
        </div>
      )}

      {queue.length > 0 && (
        <div className="queue-list">
          {queue.map((item) => (
            <div key={item.id} className="queue-item">
              <div className="queue-meta">
                <div className="queue-name-row">
                  <span className="queue-name">{item.fileName}</span>
                  <span className={`status-pill ${item.status}`}>{STATUS_LABELS[item.status]}</span>
                </div>
                <div className="queue-subline">
                  <span>{item.kind === 'video' ? 'Video' : 'Foto'}</span>
                  <span>{formatFileSize(item.file.size)}</span>
                  <span>
                    {item.width > 0 && item.height > 0
                      ? `${item.width}x${item.height}`
                      : item.status === 'preparing'
                        ? 'Bearbetar...'
                        : 'Ingen miniatyr'}
                  </span>
                  <span className="source-tag">{item.capturedAtSource === 'exif' ? 'EXIF' : 'Fil-datum'}</span>
                </div>
                <div className="item-progress-bar" aria-hidden="true">
                  <div className="item-progress-fill" style={{ width: `${item.progress}%` }} />
                </div>
                <div className="item-progress-copy">{Math.round(item.progress)}%</div>
              </div>

              <div className="queue-controls">
                {item.error ? (
                  <div className="item-error-msg">
                    <AlertCircle size={14} />
                    <span>{item.error}</span>
                  </div>
                ) : (
                  <div className="auto-date-label">
                    <CalendarDays size={14} />
                    <span>{formatDateSwedish(item.capturedAt)}</span>
                  </div>
                )}

                <div className="queue-action-row">
                  {item.status === 'uploadFailed' && (
                    <button
                      type="button"
                      className="subtle-btn"
                      onClick={() => markItemForRetry(item.id)}
                      disabled={isUploading}
                    >
                      <RefreshCcw size={14} />
                      Forsok igen
                    </button>
                  )}
                  <button
                    type="button"
                    className="subtle-btn danger"
                    onClick={() => removeQueueItem(item.id)}
                    disabled={isUploading}
                  >
                    <Trash2 size={14} />
                    Ta bort
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {queue.length > 0 && (
        <button
          type="button"
          className="start-upload-btn"
          onClick={handleStartUpload}
          disabled={isUploading || pendingItems === 0}
        >
          {isUploading ? 'Laddar upp...' : `Ladda upp ${pendingItems} filer`}
        </button>
      )}

      {batchSummary && (
        <div className={`batch-summary ${batchSummary.failureCount > 0 ? 'has-failures' : 'all-good'}`}>
          {batchSummary.failureCount > 0
            ? `${batchSummary.successCount} klara, ${batchSummary.failureCount} behovde ett nytt forsok.`
            : `${batchSummary.successCount} filer laddades upp utan fel.`}
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            className="error-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <AlertCircle size={16} />
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .upload-container {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          margin-bottom: 2rem;
          border: 1px dashed var(--border-color);
        }

        .upload-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .primary-icon {
          color: var(--primary);
        }

        .upload-zone {
          background: var(--accent-light);
          border-radius: var(--radius-md);
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-zone:hover {
          background: #fff0f2;
          border-color: var(--primary);
        }

        .idle-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .idle-state .icons {
          display: flex;
          gap: 1rem;
          color: var(--text-muted);
        }

        .idle-state p {
          font-weight: 600;
          color: var(--text-main);
        }

        .idle-state span {
          font-size: 0.8rem;
          color: var(--text-dim);
        }

        .uploading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .queue-actions {
          margin-top: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          color: var(--text-dim);
          font-size: 0.9rem;
        }

        .queue-list {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .queue-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
          gap: 1rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: #ffffff;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
        }

        .queue-name-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.4rem;
        }

        .queue-name {
          font-weight: 600;
          color: var(--text-main);
          word-break: break-word;
        }

        .queue-subline {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          color: var(--text-dim);
          font-size: 0.85rem;
        }

        .source-tag {
          font-size: 0.7rem;
          opacity: 0.5;
          text-transform: uppercase;
        }

        .queue-controls {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          justify-content: center;
          align-items: flex-start;
        }

        .queue-action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .auto-date-label {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: var(--accent);
          font-weight: 600;
          font-size: 0.9rem;
          background: rgba(193, 62, 49, 0.1);
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius-sm);
          width: fit-content;
        }

        .status-pill {
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.7rem;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-dim);
        }

        .status-pill.success {
          color: #2f855a;
        }

        .status-pill.prepareFailed,
        .status-pill.uploadFailed {
          color: #c53030;
        }

        .status-pill.uploading {
          color: var(--accent);
        }

        .status-pill.preparing,
        .status-pill.queued {
          color: var(--text-dim);
        }

        .spinner {
          animation: spin 1s linear infinite;
          color: var(--primary);
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .item-error-msg {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #ff4d4d;
          font-size: 0.85rem;
          font-weight: 500;
          background: rgba(255, 77, 77, 0.05);
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius-sm);
        }

        .item-progress-bar {
          margin-top: 0.65rem;
          width: 100%;
          height: 6px;
          background: rgba(193, 62, 49, 0.12);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .item-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          transition: width 0.2s ease;
        }

        .item-progress-copy {
          margin-top: 0.35rem;
          font-size: 0.78rem;
          color: var(--text-dim);
        }

        .subtle-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.7rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-main);
          font-size: 0.82rem;
          font-weight: 600;
        }

        .subtle-btn.danger {
          color: #c53030;
        }

        .subtle-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .start-upload-btn {
          margin-top: 1rem;
          background: var(--primary);
          color: white;
          width: 100%;
          padding: 0.9rem 1rem;
          border-radius: var(--radius-md);
          font-weight: 600;
        }

        .start-upload-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .batch-summary {
          margin-top: 1rem;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .batch-summary.all-good {
          background: rgba(47, 133, 90, 0.1);
          color: #2f855a;
        }

        .batch-summary.has-failures {
          background: rgba(193, 62, 49, 0.1);
          color: #9b2c2c;
        }

        .error-banner {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(255, 77, 77, 0.1);
          border-radius: var(--radius-sm);
          color: #ff4d4d;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        @media (max-width: 900px) {
          .queue-item {
            grid-template-columns: 1fr;
          }

          .queue-actions {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default UploadPanel;
