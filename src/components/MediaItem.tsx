import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Play, X } from 'lucide-react';
import type { Media } from '../types';

import { preloadImageUrl } from '../utils/imagePreload';

interface MediaItemProps {
  item: Media;
  isAdmin?: boolean;
  commentCount: number;
  onClick: () => void;
  onDelete?: () => void;
}

const MediaItem: React.FC<MediaItemProps> = ({ item, isAdmin, commentCount, onClick, onDelete }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm('Vill du ta bort denna bild permanent?')) {
      onDelete();
    }
  };

  const handlePreload = () => {
    if (item.type === 'photo') {
      preloadImageUrl(item.url).catch(() => undefined);
    }
  };

  return (
    <motion.button
      type="button"
      className="media-item-container"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      onMouseEnter={handlePreload}
      onTouchStart={handlePreload}
    >
      <div className="media-preview-wrapper">
        <img
          src={item.thumbnailUrl || item.url}
          alt={item.fileName}
          loading="lazy"
          className="media-image"
        />

        {item.type === 'video' && (
          <div className="video-preview">
            <div className="play-overlay">
              <Play fill="white" size={24} />
            </div>
          </div>
        )}

        <div className="item-overlay">
          <div className="item-info">
            <div className="comment-badge">
              <MessageCircle size={14} />
              <span>{commentCount}</span>
            </div>
          </div>
        </div>

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

        .media-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
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

        .item-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1rem;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
          opacity: 0;
          transition: opacity 0.3s;
        }

        .media-item-container:hover .item-overlay {
          opacity: 1;
        }

        .comment-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: var(--primary);
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 600;
          color: white;
          width: max-content;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .item-delete-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
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
