import React from 'react';
import { motion } from 'framer-motion';
import type { Media } from '../types';
import MediaItem from './MediaItem';

interface MediaGridProps {
  media: Media[];
  isAdmin?: boolean;
  commentCounts: Record<string, number>;
  onItemClick: (item: Media) => void;
  onDeleteItem?: (item: Media) => Promise<void>;
}

const MediaGrid: React.FC<MediaGridProps> = ({ media, isAdmin, commentCounts, onItemClick, onDeleteItem }) => (
  <motion.div
    className="photo-grid"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ staggerChildren: 0.1 }}
  >
    {media.map((item) => (
      <MediaItem
        key={item.id}
        item={item}
        isAdmin={isAdmin}
        commentCount={commentCounts[item.id] ?? 0}
        onClick={() => onItemClick(item)}
        onDelete={() => onDeleteItem?.(item)}
      />
    ))}
  </motion.div>
);

export default MediaGrid;
