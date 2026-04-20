import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send } from 'lucide-react';
import type { Comment } from '../types';
import { formatDateTimeSwedish } from '../utils/dateHelpers';

interface CommentSectionProps {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  draft: string;
  isSubmitting: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void | Promise<void>;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  loading,
  error,
  draft,
  isSubmitting,
  onDraftChange,
  onSubmit,
}) => {
  return (
    <div className="comments-container">
      <h4 className="comments-title" data-testid="lightbox-comment-count">
        {`Kommentarer (${comments.length})`}
      </h4>

      <form onSubmit={onSubmit} className="comment-form">
        <div className="comment-input-wrapper">
          <input
            type="text"
            placeholder={'Skriv n\u00e5got trevligt...'}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            disabled={isSubmitting}
          />
          <button type="submit" disabled={!draft.trim() || isSubmitting}>
            {isSubmitting ? <div className="spinner-sm" /> : <Send size={18} />}
          </button>
        </div>
      </form>

      {error && <p className="loading-text">{error}</p>}

      <div className="comments-list">
        {loading ? (
          <p className="loading-text">{'Laddar kommentarer...'}</p>
        ) : comments.length === 0 ? (
          <p className="empty-comments">{'Var den f\u00f6rsta att kommentera!'}</p>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                className="comment-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="comment-avatar">
                  {(comment.author[0] || '?').toUpperCase()}
                </div>
                <div className="comment-content">
                  <div className="comment-info">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-time">{formatDateTimeSwedish(comment.createdAt)}</span>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <style>{`
        .comments-container {
          padding-top: 2rem;
        }

        .comments-title {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          color: var(--text-main);
        }

        .comment-form {
          margin-bottom: 1rem;
        }

        .comment-input-wrapper {
          display: flex;
          gap: 0.75rem;
          background: rgba(188, 0, 45, 0.02);
          border: 1px solid var(--border-color);
          padding: 0.5rem 0.5rem 0.5rem 1.25rem;
          border-radius: var(--radius-full);
          transition: border-color 0.3s;
        }

        .comment-input-wrapper:focus-within {
          border-color: var(--primary);
        }

        .comment-input-wrapper input {
          flex: 1;
          background: none;
          border: none;
          color: var(--text-main);
          font-size: 0.95rem;
        }

        .comment-input-wrapper input:focus {
          outline: none;
        }

        .comment-input-wrapper button {
          background: var(--primary);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .comment-input-wrapper button:hover:not(:disabled) {
          transform: scale(1.1);
        }

        .comment-input-wrapper button:disabled {
          opacity: 0.3;
          filter: grayscale(1);
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .comment-item {
          display: flex;
          gap: 1rem;
        }

        .comment-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--surface-hover);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          color: var(--primary);
          border: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .comment-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .comment-author {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-main);
        }

        .comment-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .comment-text {
          font-size: 0.95rem;
          color: var(--text-dim);
          line-height: 1.4;
        }

        .empty-comments,
        .loading-text {
          text-align: center;
          color: var(--text-muted);
          font-size: 0.9rem;
          padding: 0.5rem 0;
        }
      `}</style>
    </div>
  );
};

export default CommentSection;
