import React, { useEffect, useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';
import { Check, Edit3, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { useDayCommentCounts } from '../hooks/useDayCommentCounts';
import { useMedia } from '../hooks/useMedia';
import type { DataLoadMode, Day, Media, UpdateDayInput } from '../types';
import { formatDateSwedish } from '../utils/dateHelpers';
import EmaBoard from './EmaBoard';
import MediaGrid from './MediaGrid';

interface DaySectionProps {
  day: Day;
  isActive: boolean;
  isPreviousAdjacent: boolean;
  isNextAdjacent: boolean;
  isAdmin: boolean;
  canPost: boolean;
  authorizationError: string | null;
  onVisible: (dayId: string) => void;
  onMediaClick: (media: Media[], index: number) => void;
  onSectionRef?: (dayId: string, node: HTMLDivElement | null) => void;
  onUpdateDay?: (id: string, data: UpdateDayInput) => Promise<void>;
  onDeleteDay?: (id: string) => Promise<void>;
  onDeleteMedia?: (item: Media) => Promise<void>;
}

interface DaySectionContentProps {
  dayId: string;
  mode: DataLoadMode;
  isAdmin: boolean;
  showNextDayPreload: boolean;
  onMediaClick: (media: Media[], index: number) => void;
  onDeleteMedia?: (item: Media) => Promise<void>;
}

const DEFAULT_SKELETON_MEDIA_COUNT = 5;
const NEXT_DAY_PRELOAD_MEDIA_COUNT = 8;
const cachedMediaCounts = new Map<string, number>();

const getSkeletonTileCount = (mediaCount: number) => {
  const normalizedCount = Math.max(mediaCount, 1);

  if (normalizedCount === 1) {
    return 1;
  }

  return 1 + Math.ceil((normalizedCount - 1) / 2) * 2;
};

const MediaSkeleton = ({ mediaCount }: { mediaCount: number }) => {
  const tileCount = getSkeletonTileCount(mediaCount);

  return (
    <div className="media-preview-skeleton" aria-hidden="true">
      {Array.from({ length: tileCount }, (_, index) => (
        <div
          key={`skeleton-${index}`}
          className={`media-skeleton-tile ${index === 0 ? 'media-skeleton-feature' : ''}`}
          data-testid="media-skeleton-tile"
        />
      ))}
    </div>
  );
};

const MediaLoadingPreview = ({
  copy,
  mediaCount,
}: {
  copy: string;
  mediaCount: number;
}) => (
  <div className="media-loading-state" aria-label={copy}>
    <MediaSkeleton mediaCount={mediaCount} />
    <div className="loading-state-inline">
      <Loader2 className="spinner" size={24} />
      <p>{copy}</p>
    </div>
  </div>
);

const DeferredMediaPreview = ({ mediaCount }: { mediaCount: number }) => (
  <div className="deferred-media-state">
    <MediaSkeleton mediaCount={mediaCount} />
    <p>Bilderna laddas när du närmar dig dagen.</p>
  </div>
);

const NextDayPreloadPreview = ({ mediaCount }: { mediaCount: number }) => (
  <div
    className="next-day-preload-state"
    data-testid="next-day-preload-state"
    aria-label="Förbereder nästa dag..."
  >
    <MediaSkeleton mediaCount={mediaCount} />
    <div className="next-day-loader">
      <div className="next-day-sakura" aria-hidden="true">
        ✿
      </div>
      <div className="next-day-loader-copy">
        <p className="next-day-loader-title">Förbereder nästa dag...</p>
        <p className="next-day-loader-subtitle">Laddar bilderna innan du scrollar vidare.</p>
      </div>
    </div>
  </div>
);

const DaySectionContent: React.FC<DaySectionContentProps> = ({
  dayId,
  mode,
  isAdmin,
  showNextDayPreload,
  onMediaClick,
  onDeleteMedia,
}) => {
  const { media, loading: mediaLoading, error: mediaError } = useMedia(dayId, mode);
  const { counts: commentCounts } = useDayCommentCounts(dayId, mode);

  useEffect(() => {
    if (media.length > 0) {
      cachedMediaCounts.set(dayId, media.length);
    }
  }, [dayId, media.length]);

  const reservedMediaCount = useMemo(
    () => cachedMediaCounts.get(dayId) ?? DEFAULT_SKELETON_MEDIA_COUNT,
    [dayId]
  );
  const nextDayReservedMediaCount = useMemo(
    () => Math.max(cachedMediaCounts.get(dayId) ?? 0, NEXT_DAY_PRELOAD_MEDIA_COUNT),
    [dayId]
  );

  return (
    <>
      <div className="card-media">
        {mediaLoading && showNextDayPreload ? (
          <NextDayPreloadPreview mediaCount={nextDayReservedMediaCount} />
        ) : mediaLoading ? (
          <MediaLoadingPreview copy="Hämtar minnen..." mediaCount={reservedMediaCount} />
        ) : media.length > 0 ? (
          <MediaGrid
            media={media}
            isAdmin={isAdmin}
            commentCounts={commentCounts}
            onItemClick={(item) => {
              const index = media.findIndex((candidate) => candidate.id === item.id);
              onMediaClick(media, index);
            }}
            onDeleteItem={onDeleteMedia}
          />
        ) : (
          <div className="empty-state-card">
            <div className="empty-icon-small">
              <ImageIcon size={32} />
            </div>
            <p>{mediaError ?? 'Inga bilder än.'}</p>
          </div>
        )}
      </div>

      <EmaBoard dayId={dayId} />
    </>
  );
};

const DaySection: React.FC<DaySectionProps> = ({
  day,
  isActive,
  isPreviousAdjacent,
  isNextAdjacent,
  isAdmin,
  onVisible,
  onMediaClick,
  onSectionRef,
  onUpdateDay,
  onDeleteDay,
  onDeleteMedia,
}) => {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [hasActivatedContent, setHasActivatedContent] = useState(
    isActive || isPreviousAdjacent || isNextAdjacent
  );
  const [isEditingText, setIsEditingText] = useState(false);
  const [draftText, setDraftText] = useState(day.description || '');
  const [draftLocation, setDraftLocation] = useState(day.location || '');
  const [isSaving, setIsSaving] = useState(false);

  const reservedMediaCount = cachedMediaCounts.get(day.id) ?? DEFAULT_SKELETON_MEDIA_COUNT;

  const { ref: activeRef } = useInView({
    rootMargin: '-10% 0px -30% 0px',
    onChange: (visible) => {
      if (visible) {
        setHasAnimated(true);
        onVisible(day.id);
      }
    },
  });

  const { ref: nearViewportRef } = useInView({
    rootMargin: '200% 0px 200% 0px',
    onChange: (visible) => {
      if (visible) {
        setHasActivatedContent(true);
      }
    },
  });

  useEffect(() => {
    if (isActive || isPreviousAdjacent || isNextAdjacent) {
      setHasActivatedContent(true);
    }
  }, [isActive, isNextAdjacent, isPreviousAdjacent]);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      activeRef(node);
      nearViewportRef(node);
      onSectionRef?.(day.id, node);
    },
    [activeRef, nearViewportRef, onSectionRef, day.id]
  );

  const contentMode: DataLoadMode =
    isActive ? 'live' : hasActivatedContent || isPreviousAdjacent || isNextAdjacent ? 'once' : 'off';
  const shouldMountContent = contentMode !== 'off';
  const showNextDayPreload = isNextAdjacent && !isActive;

  const handleSaveText = async () => {
    if (!onUpdateDay) {
      return;
    }

    setIsSaving(true);
    await onUpdateDay(day.id, { description: draftText, location: draftLocation });
    setIsSaving(false);
    setIsEditingText(false);
  };

  const handleCancelText = () => {
    setDraftText(day.description || '');
    setDraftLocation(day.location || '');
    setIsEditingText(false);
  };

  const handleDeleteDay = async () => {
    if (
      onDeleteDay &&
      window.confirm('Är du säker på att du vill ta bort hela denna dag? Detta kan inte ångras.')
    ) {
      await onDeleteDay(day.id);
    }
  };

  const dateObj = day.date;
  const monthNames = [
    'Januari',
    'Februari',
    'Mars',
    'April',
    'Maj',
    'Juni',
    'Juli',
    'Augusti',
    'September',
    'Oktober',
    'November',
    'December',
  ];
  const dateStr = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;
  const locationStr = day.location ? ` — ${day.location}` : '';
  const dateFormatted = `${dateStr}${locationStr}`;
  const defaultTitle = formatDateSwedish(day.date);
  const isDefaultOrSimilar =
    day.title.toLowerCase() === defaultTitle.toLowerCase() ||
    day.title.toLowerCase() === dateFormatted.toLowerCase();

  return (
    <motion.div
      className="day-wrapper"
      ref={setRefs}
      id={`day-${day.id}`}
      initial={{ opacity: 0, y: 30 }}
      animate={hasAnimated ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <article className="journal-card">
        <div className="card-header">
          {!isDefaultOrSimilar && <p className="card-date">{dateFormatted}</p>}
          <h2 className="card-title">{day.title}</h2>

          {isAdmin && onDeleteDay && (
            <button
              className="card-delete-trigger"
              onClick={handleDeleteDay}
              title="Ta bort inlägg"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="card-body">
          {isEditingText ? (
            <div className="inline-editor">
              <input
                type="text"
                value={draftLocation}
                onChange={(event) => setDraftLocation(event.target.value)}
                placeholder="Plats (t.ex. Tokyo)"
                className="editor-input-short"
                disabled={isSaving}
              />
              <textarea
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                placeholder="Skriv något om dagen..."
                className="editor-textarea"
                rows={4}
                disabled={isSaving}
              />
              <div className="editor-actions">
                <button
                  className="editor-btn cancel"
                  onClick={handleCancelText}
                  disabled={isSaving}
                >
                  <X size={16} /> Avbryt
                </button>
                <button
                  className="editor-btn save"
                  onClick={handleSaveText}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 size={16} className="spinner" /> : <Check size={16} />} Spara
                </button>
              </div>
            </div>
          ) : (
            <div className="card-body-text fade-in">
              {day.description && <p>{day.description}</p>}

              {isAdmin && (
                <button
                  className="inline-edit-trigger"
                  onClick={() => setIsEditingText(true)}
                  title="Redigera text"
                >
                  <Edit3 size={16} />
                  <span>{day.description ? 'Redigera text' : 'Skriv något om dagen...'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {shouldMountContent ? (
          <DaySectionContent
            dayId={day.id}
            mode={contentMode}
            isAdmin={isAdmin}
            showNextDayPreload={showNextDayPreload}
            onMediaClick={onMediaClick}
            onDeleteMedia={onDeleteMedia}
          />
        ) : (
          <div className="card-media">
            <DeferredMediaPreview mediaCount={reservedMediaCount} />
          </div>
        )}
      </article>

      <style>{`
        .day-wrapper {
          position: relative;
          margin-bottom: 5rem;
          overflow-anchor: none;
        }

        .card-header {
          position: relative;
          margin-bottom: 2rem;
        }

        .card-delete-trigger {
          position: absolute;
          top: -0.5rem;
          right: -1rem;
          padding: 0.5rem;
          color: var(--text-muted);
          opacity: 0.3;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 50%;
        }

        .card-delete-trigger:hover {
          opacity: 1;
          color: var(--primary);
          background: rgba(188, 0, 45, 0.05);
          transform: scale(1.1);
        }

        .card-date {
          color: var(--primary);
          font-weight: 500;
          font-size: 0.85rem;
          margin-bottom: 0.5rem;
          font-family: var(--font-mono);
          letter-spacing: 0.15em;
          text-transform: uppercase;
          opacity: 0.8;
        }

        .journal-card {
          position: relative;
          background: var(--surface-color);
          border-radius: var(--radius-lg);
          padding: 3rem;
          transition: all 0.4s ease;
          border: 1px solid var(--border-color);
        }

        [data-theme='dark'] .journal-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 2rem;
          bottom: 2rem;
          width: 3px;
          background: linear-gradient(to bottom, var(--primary), var(--secondary));
          box-shadow: 0 0 15px var(--primary);
          border-radius: 0 2px 2px 0;
        }

        [data-theme='dark'] .journal-card {
          border: none;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          background: linear-gradient(145deg, #1e1f25 0%, #121318 100%);
        }

        .card-title {
          font-size: 2.75rem;
          line-height: 1.1;
          color: var(--text-main);
          letter-spacing: -0.02em;
          font-weight: 700;
        }

        [data-theme='dark'] .card-title {
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-body-text {
          color: var(--text-dim);
          font-size: 1.25rem;
          line-height: 1.65;
          letter-spacing: -0.01em;
        }

        .editor-input-short {
          width: 100%;
          background: var(--glass-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 0.85rem 1.25rem;
          font-family: var(--font-main);
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 0.75rem;
          outline: none;
        }

        [data-theme='dark'] .editor-input-short:focus {
          border-color: var(--secondary);
          box-shadow: 0 0 10px var(--secondary);
        }

        .inline-edit-trigger {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          color: var(--primary);
          opacity: 0.6;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: var(--font-mono);
          margin-top: 1.5rem;
          padding: 0.6rem 0;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .inline-edit-trigger:hover {
          opacity: 1;
          transform: translateX(4px);
          color: var(--secondary);
        }

        .inline-editor {
          margin-top: 2rem;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          backdrop-filter: blur(20px);
        }

        .editor-textarea {
          width: 100%;
          background: transparent;
          border: none;
          resize: vertical;
          padding: 1.25rem;
          font-family: var(--font-main);
          font-size: 1.1rem;
          line-height: 1.6;
          color: var(--text-main);
          outline: none;
        }

        .editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(var(--primary-rgb), 0.03);
          border-top: 1px solid var(--border-color);
        }

        .editor-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .editor-btn.cancel {
          background: transparent;
          color: var(--text-dim);
          border: 1px solid var(--border-color);
        }

        .editor-btn.cancel:hover {
          background: var(--glass-bg);
          color: var(--text-main);
          border-color: var(--text-muted);
        }

        .editor-btn.save {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);
        }

        .editor-btn.save:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(var(--primary-rgb), 0.4);
          filter: brightness(1.1);
        }

        [data-theme='dark'] .editor-btn.save {
          background: linear-gradient(135deg, var(--primary) 0%, #ff4a8d 100%);
          box-shadow: 0 0 20px rgba(255, 0, 127, 0.4);
        }

        [data-theme='dark'] .editor-btn.save:hover {
          box-shadow: 0 0 30px rgba(255, 0, 127, 0.6);
        }

        .editor-btn:active {
          transform: scale(0.95);
        }

        .card-media {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .media-loading-state,
        .deferred-media-state,
        .next-day-preload-state {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .media-preview-skeleton {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .media-skeleton-tile {
          aspect-ratio: 1 / 1;
          border-radius: var(--radius-md);
          background:
            linear-gradient(
              110deg,
              rgba(188, 0, 45, 0.08) 8%,
              rgba(188, 0, 45, 0.16) 18%,
              rgba(188, 0, 45, 0.08) 33%
            );
          background-size: 200% 100%;
          animation: shimmer 1.8s linear infinite;
        }

        .media-skeleton-feature {
          grid-column: 1 / -1;
          aspect-ratio: 16 / 9;
        }

        .empty-state-card {
          padding: 4rem 1.5rem;
          text-align: center;
          background: var(--primary-light);
          border-radius: var(--radius-md);
          color: var(--text-dim);
          border: 1px dashed var(--border-color);
        }

        .deferred-media-state p,
        .loading-state-inline p {
          text-align: center;
          color: var(--text-dim);
        }

        .next-day-preload-state {
          padding: 1rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(var(--primary-rgb), 0.12);
          background:
            linear-gradient(180deg, rgba(var(--primary-rgb), 0.04) 0%, rgba(var(--primary-rgb), 0.015) 100%),
            var(--surface-color);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .next-day-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          padding: 0.5rem 0 0.25rem;
          text-align: center;
        }

        .next-day-sakura {
          font-size: 2rem;
          color: var(--primary);
          animation: sakura-spin 3s ease-in-out infinite;
          filter: drop-shadow(0 0 12px rgba(var(--primary-rgb), 0.2));
        }

        .next-day-loader-copy {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .next-day-loader-title,
        .next-day-loader-subtitle {
          margin: 0;
        }

        .next-day-loader-title {
          color: var(--text-main);
          font-weight: 600;
        }

        .next-day-loader-subtitle {
          color: var(--text-dim);
          font-size: 0.95rem;
        }

        .loading-state-inline {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.25rem 0 0;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes sakura-spin {
          0% {
            transform: rotate(0deg) scale(1);
          }

          50% {
            transform: rotate(180deg) scale(1.08);
          }

          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes shimmer {
          to {
            background-position-x: -200%;
          }
        }

        @media (max-width: 640px) {
          .card-title {
            font-size: 2.25rem;
          }

          .card-body-text {
            font-size: 1.15rem;
          }

          .journal-card {
            padding: 2rem 1.5rem;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default DaySection;
