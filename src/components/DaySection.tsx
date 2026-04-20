import React, { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Image as ImageIcon, Loader2, Edit3, Check, X } from 'lucide-react';
import { useMedia } from '../hooks/useMedia';
import { useDayCommentCounts } from '../hooks/useDayCommentCounts';
import MediaGrid from './MediaGrid';
import { formatDateSwedish } from '../utils/dateHelpers';
import type { Day, Media, UpdateDayInput } from '../types';

interface DaySectionProps {
  day: Day;
  isAdmin: boolean;
  canPost: boolean;
  authorizationError: string | null;
  onVisible: (dayId: string) => void;
  onMediaClick: (media: Media[], index: number) => void;
  onUpdateDay?: (id: string, data: UpdateDayInput) => Promise<void>;
  onDeleteDay?: (id: string) => Promise<void>;
  onDeleteMedia?: (item: Media) => Promise<void>;
}

const DaySection: React.FC<DaySectionProps> = ({
  day,
  isAdmin,
  onVisible,
  onMediaClick,
  onUpdateDay,
  onDeleteDay,
  onDeleteMedia,
}) => {
  const { ref } = useInView({
    rootMargin: '-20% 0px -60% 0px',
    onChange: (inView) => {
      if (inView) {
        onVisible(day.id);
      }
    },
  });

  const { media, loading: mediaLoading, error: mediaError } = useMedia(day.id);
  const { counts: commentCounts } = useDayCommentCounts(day.id);

  const [isEditingText, setIsEditingText] = useState(false);
  const [draftText, setDraftText] = useState(day.description || '');
  const [draftLocation, setDraftLocation] = useState(day.location || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveText = async () => {
    if (onUpdateDay) {
      setIsSaving(true);
      await onUpdateDay(day.id, { description: draftText, location: draftLocation });
      setIsSaving(false);
      setIsEditingText(false);
    }
  };

  const handleCancelText = () => {
    setDraftText(day.description || '');
    setDraftLocation(day.location || '');
    setIsEditingText(false);
  };

  const handleDeleteDay = async () => {
    if (onDeleteDay && window.confirm('Är du säker på att du vill ta bort hela denna dag? Detta kan inte ångras.')) {
      await onDeleteDay(day.id);
    }
  };

  // Extract day and month for the specific design
  const dateObj = day.date;
  const monthNames = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];
  const dateStr = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()].toUpperCase()}`;
  const locationStr = day.location ? ` • ${day.location.toUpperCase()}` : '';
  const dateFormatted = `${dateStr}${locationStr}`.toUpperCase();
  
  const defaultTitle = formatDateSwedish(day.date);
  const isDefaultOrSimilar = day.title.toLowerCase() === defaultTitle.toLowerCase() || day.title.toLowerCase() === dateFormatted.toLowerCase();

  return (
    <div className="day-wrapper fade-in" ref={ref} id={`day-${day.id}`}>
      {!mediaLoading && media.length > 0 && <div className="timeline-dot" />}
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
              <X size={24} />
            </button>
          )}
        </div>

        <div className="card-body">
          {isEditingText ? (
            <div className="inline-editor">
              <input
                type="text"
                value={draftLocation}
                onChange={(e) => setDraftLocation(e.target.value)}
                placeholder="Ev. stadsnamn (t.ex. Osaka)"
                className="editor-input-short"
                disabled={isSaving}
              />
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
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

        <div className="card-media">
          {mediaLoading ? (
            <div className="loading-state-inline">
              <Loader2 className="spinner" size={24} />
              <p>Hämtar minnen...</p>
            </div>
          ) : media.length > 0 ? (
            <MediaGrid
              media={media}
              isAdmin={isAdmin}
              commentCounts={commentCounts}
              onItemClick={(item) => {
                const index = media.findIndex((m) => m.id === item.id);
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
      </article>

      <style>{`
        .day-wrapper {
          position: relative;
          margin-bottom: 4rem;
        }

        .card-header {
          position: relative;
          margin-bottom: 1.5rem;
        }

        .card-delete-trigger {
          position: absolute;
          top: -0.5rem;
          right: -0.5rem;
          padding: 0.5rem;
          color: var(--primary);
          opacity: 0.4;
          transition: all 0.2s;
          border-radius: 50%;
        }

        .card-delete-trigger:hover {
          opacity: 1;
          background: rgba(188, 0, 45, 0.05);
          transform: scale(1.1);
        }

        .card-date {
          color: var(--primary);
          font-weight: 700;
          font-size: 0.75rem;
          margin-bottom: 0.75rem;
          font-family: var(--font-main);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          opacity: 0.8;
        }

        .card-title {
          font-size: 2.25rem;
          line-height: 1.15;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }

        .card-body {
          margin-bottom: 2rem;
        }

        .card-body-text {
          color: var(--text-dim);
          font-size: 1.15rem;
          line-height: 1.6;
        }

        .editor-input-short {
          width: 100%;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: var(--radius-sm);
          padding: 0.75rem 1rem;
          font-family: var(--font-main);
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 0.5rem;
          outline: none;
        }

        .inline-edit-trigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary);
          opacity: 0.6;
          font-size: 0.85rem;
          font-weight: 500;
          margin-top: 1rem;
          padding: 0.5rem 0;
          transition: opacity 0.2s;
        }

        .inline-edit-trigger:hover {
          opacity: 1;
        }

        .inline-editor {
          margin-top: 1.5rem;
          background: var(--neutral);
          border-radius: var(--radius-md);
          padding: 0.5rem;
        }

        .editor-textarea {
          width: 100%;
          background: transparent;
          border: none;
          resize: vertical;
          padding: 1rem;
          font-family: var(--font-main);
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-main);
          outline: none;
        }

        .editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          padding: 0.5rem 1rem 0.5rem;
        }

        .editor-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .editor-btn.cancel {
          color: var(--text-muted);
        }

        .editor-btn.cancel:hover {
          background: rgba(0,0,0,0.05);
        }

        .editor-btn.save {
          background: var(--primary);
          color: white;
        }

        .editor-btn.save:hover {
          background: var(--primary-hover);
        }

        .empty-state-card {
          padding: 3rem 1rem;
          text-align: center;
          background: var(--neutral);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          border: 1px dashed var(--secondary-dark);
        }

        @media (max-width: 640px) {
          .card-title {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DaySection;
