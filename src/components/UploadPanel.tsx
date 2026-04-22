import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CalendarDays, Image as ImageIcon, Loader2, Upload, Video } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Day } from '../types';
import { formatDateSwedish } from '../utils/dateHelpers';
import {
  compressImage,
  convertHeicToJpeg,
  createThumbnail,
  detectMediaKind,
  extractCapturedAt,
  readMediaDimensions,
  type CapturedAtSource,
  type MediaKind,
} from '../utils/mediaProcessing';

interface UploadPanelProps {
  days: Day[];
  selectedDay: Day | null;
  ensureDay: (date: Date) => Promise<string>;
  onUploadComplete: (dayId: string) => void;
}

type UploadStatus = 'preparing' | 'queued' | 'uploading' | 'success' | 'error';

interface UploadQueueItem {
  id: string;
  file: File;
  thumbnailBlob: Blob;
  fileName: string;
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
}

const makeQueueId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const UploadPanel: React.FC<UploadPanelProps> = ({ ensureDay, onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateQueueItem = (itemId: string, updater: (item: UploadQueueItem) => UploadQueueItem) => {
    setQueue((currentQueue) => currentQueue.map((item) => (item.id === itemId ? updater(item) : item)));
  };

  const prepareFile = async (file: File): Promise<UploadQueueItem> => {
    const kind = detectMediaKind(file);
    const isLargeVideo = kind === 'video' && file.size > 80 * 1024 * 1024; // 80 MB Limit
    
    const capturedAtInfo = await extractCapturedAt(file, kind);
    const processedFile = await convertHeicToJpeg(file);
    const compressedFile = await compressImage(processedFile, kind);
    
    let dimensions = { width: 0, height: 0 };
    let thumbnailBlob = new Blob();

    // Fast-track large videos to avoid crashing iOS Safari with out-of-memory errors
    if (!isLargeVideo) {
      try {
        dimensions = await readMediaDimensions(compressedFile, kind);
        thumbnailBlob = await createThumbnail(compressedFile, kind);
      } catch (err) {
        console.warn('Miniatyrskapande misslyckades/tog för lång tid, aktiverar snabbspår:', err);
        // Genom att ignorera felet faller vi tillbaka på "snabbspår"-logiken
        // med width=0 och tom thumbnailBlob, vilket gör att uppladdningen kan fortsätta.
      }
    }
    
    return {
      id: makeQueueId(),
      file: compressedFile,
      thumbnailBlob,
      fileName: compressedFile.name,
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
    };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    const fileList = Array.from(files);

    try {
      const preparedItems = await Promise.all(
        fileList.map(async (file) => {
          try {
            return await prepareFile(file);
          } catch (preparationError) {
            return {
              id: makeQueueId(),
              file: file,
              thumbnailBlob: new Blob(),
              fileName: file.name,
              kind: detectMediaKind(file),
              capturedAt: new Date(file.lastModified),
              capturedAtSource: 'fallback' as const,
              width: 0,
              height: 0,
              status: 'error' as const,
              progress: 0,
              error:
                preparationError instanceof Error
                  ? preparationError.message
                  : 'Kunde inte förbereda filen.',
            };
          }
        }),
      );

      setQueue((currentQueue) => [...currentQueue, ...preparedItems]);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const uploadableItems = queue.filter((item) => item.status !== 'success'); // Allow items without thumbnails (fast-tracked videos)
  const pendingItems = uploadableItems.filter((item) => item.status === 'queued' || item.status === 'error').length;

  const handleStartUpload = async () => {
    if (isUploading || uploadableItems.length === 0) {
      return;
    }

    let latestDayId: string | null = null;
    setIsUploading(true);
    setError(null);

    try {
      for (const item of uploadableItems) {
        updateQueueItem(item.id, (currentItem) => ({
          ...currentItem,
          status: 'uploading',
          progress: 0,
          error: null,
        }));

        try {
          const targetDayId = await ensureDay(item.capturedAt);
          latestDayId = targetDayId;

          const fileExt = item.fileName.split('.').pop()?.toLowerCase() || 'jpg';
          const safeFileName = `${item.id}.${fileExt}`;
          const mediaPath = `media/${targetDayId}/${safeFileName}`;
          const thumbPath = `thumbnails/${targetDayId}/${safeFileName}`;

          await new Promise<void>((resolve, reject) => {
            const uploadTask = uploadBytesResumable(ref(storage, mediaPath), item.file);

            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                updateQueueItem(item.id, (currentItem) => ({
                  ...currentItem,
                  progress,
                }));
              },
              reject,
              () => resolve(),
            );
          });

          let thumbnailUrl = '';
          if (item.thumbnailBlob && item.thumbnailBlob.size > 0) {
            await uploadBytes(ref(storage, thumbPath), item.thumbnailBlob, {
              contentType: 'image/jpeg',
            });
            thumbnailUrl = await getDownloadURL(ref(storage, thumbPath));
          }

          const url = await getDownloadURL(ref(storage, mediaPath));

          const mediaPayload: Record<string, unknown> = {
            dayId: targetDayId,
            type: item.kind,
            url,
            thumbnailUrl,
            storagePath: mediaPath,
            fileName: item.fileName,
            capturedAt: item.capturedAt,
            uploadedAt: serverTimestamp(),
            width: item.width,
            height: item.height,
            caption: '',
          };

          if (item.latitude !== undefined && item.longitude !== undefined) {
            mediaPayload.latitude = item.latitude;
            mediaPayload.longitude = item.longitude;
          }

          await addDoc(collection(db, 'media'), mediaPayload);

          updateQueueItem(item.id, (currentItem) => ({
            ...currentItem,
            status: 'success',
            progress: 100,
          }));
        } catch (uploadError) {
          updateQueueItem(item.id, (currentItem) => ({
            ...currentItem,
            status: 'error',
            error: uploadError instanceof Error ? uploadError.message : 'Uppladdningen misslyckades.',
          }));
        }
      }
    } finally {
      setIsUploading(false);
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
            <p>Laddar upp filkö...</p>
          </div>
        ) : (
          <div className="idle-state">
            <div className="icons">
              <ImageIcon size={32} />
              <Video size={32} />
            </div>
            <p>Tryck för att välja bilder och videos</p>
            <span>HEIC konverteras automatiskt och datum läses från bildens metadata</span>
          </div>
        )}
      </div>

      {queue.length > 0 && (
        <div className="queue-list">
          {queue.map((item) => (
            <div key={item.id} className="queue-item">
              <div className="queue-meta">
                <div className="queue-name-row">
                  <span className="queue-name">{item.fileName}</span>
                  <span className={`status-pill ${item.status}`}>{item.status}</span>
                </div>
                <div className="queue-subline">
                  <span>{item.kind === 'video' ? 'Video' : 'Foto'}</span>
                  <span>{item.width > 0 ? `${item.width}x${item.height}` : 'Bearbetar...'}</span>
                  <span className="source-tag">{item.capturedAtSource === 'exif' ? 'EXIF' : 'Fil-datum'}</span>
                </div>
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

        .queue-list {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .queue-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(200px, 260px);
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
          color: #7fe29a;
        }

        .status-pill.error {
          color: #ff8585;
        }

        .status-pill.uploading {
          color: var(--accent);
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
          margin-top: 0.5rem;
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .item-error {
          display: none;
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
        }
      `}</style>
    </div>
  );
};

export default UploadPanel;
