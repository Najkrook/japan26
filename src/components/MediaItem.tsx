import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, MessageCircle, Play, X } from 'lucide-react';
import type { Media } from '../types';
import { preloadImageUrl } from '../utils/imagePreload';

interface MediaItemProps {
  item: Media;
  isAdmin?: boolean;
  commentCount: number;
  onClick: () => void;
  onDelete?: () => void;
}

const canHoverMedia = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};

const MediaItem: React.FC<MediaItemProps> = ({ item, isAdmin, commentCount, onClick, onDelete }) => {
  const supportsHover = canHoverMedia();
  const [isLoaded, setIsLoaded] = useState(() =>
    item.type === 'photo' ? !Boolean(item.thumbnailUrl) : false,
  );
  const hasPhotoThumbnail = item.type !== 'photo' || Boolean(item.thumbnailUrl);

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDelete && window.confirm('Vill du ta bort denna bild permanent?')) {
      onDelete();
    }
  };

  const handlePreload = () => {
    if (supportsHover && item.type === 'photo') {
      void preloadImageUrl(item.url).catch(() => undefined);
    }
  };

  return (
    <motion.button
      type="button"
      className="media-item-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={supportsHover ? { y: -5 } : undefined}
      onClick={onClick}
      onMouseEnter={handlePreload}
    >
      <div className={`media-preview-wrapper ${!isLoaded ? 'is-loading' : 'is-loaded'}`}>
        {!isLoaded && <div className="ink-wash-loader"></div>}

        {item.type === 'video' && !item.thumbnailUrl ? (
          <video
            src={`${item.url}#t=0.001`}
            preload="metadata"
            playsInline
            muted
            onLoadedData={() => setIsLoaded(true)}
            className="media-image"
            style={{ objectFit: 'cover', pointerEvents: 'none' }}
          />
        ) : item.type === 'photo' && !hasPhotoThumbnail ? (
          <div className="media-placeholder" data-testid={`media-placeholder-${item.id}`}>
            <ImageIcon size={28} />
            <span>Miniatyr saknas</span>
          </div>
        ) : (
          <img
            src={item.thumbnailUrl}
            alt={item.fileName}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            className="media-image"
          />
        )}

        {item.type === 'video' && (
          <div className="video-preview">
            <div className="play-overlay">
              <Play fill="white" size={24} />
            </div>
          </div>
        )}

        {commentCount > 0 && (
          <div className="top-right-comment-badge" title={`${commentCount} kommentar${commentCount > 1 ? 'er' : ''}`}>
            +{commentCount}
          </div>
        )}

        {isAdmin && (
          <button
            className="item-delete-btn"
            onClick={handleDelete}
            title="Ta bort bild"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <style>{`
        .media-item-container {
          cursor: pointer;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--surface-color);
          border: none;
          padding: 0;
        }

        .media-preview-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .media-image,
        .media-placeholder {
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 2;
        }

        .media-image {
          object-fit: cover;
          transition: transform 0.4s ease, opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), filter 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          opacity: 0;
          filter: blur(10px);
        }

        .media-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, rgba(188, 0, 45, 0.08), rgba(188, 0, 45, 0.02));
          color: var(--text-dim);
          font-size: 0.8rem;
          font-weight: 600;
        }

        .is-loaded .media-image {
          opacity: 1;
          filter: blur(0);
        }

        .ink-wash-loader {
          position: absolute;
          inset: 0;
          background: linear-gradient(-45deg, #fdfbf7, #ffe1e8, #fdfbf7, #fff0f3);
          background-size: 400% 400%;
          animation: sumie-wash 4s ease infinite;
          z-index: 1;
        }

        @keyframes sumie-wash {
          0% { background-position: 0% 50%; opacity: 0.7; }
          50% { background-position: 100% 50%; opacity: 1; }
          100% { background-position: 0% 50%; opacity: 0.7; }
        }

        .media-item-container:hover .media-image {
          transform: scale(1.05);
        }

        .video-preview {
          position: absolute;
          inset: 0;
        }

        .play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--primary);
          backdrop-filter: blur(4px);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(188, 0, 45, 0.3);
        }

        .top-right-comment-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: var(--primary);
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-full);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          z-index: 4;
        }

        .item-delete-btn {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          color: var(--primary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          z-index: 5;
        }

        .media-item-container:hover .item-delete-btn {
          opacity: 1;
        }

        .item-delete-btn:hover {
          background: var(--primary);
          color: white;
          transform: scale(1.1);
        }
      `}</style>
    </motion.button>
  );
};

export default MediaItem;
