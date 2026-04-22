import React, { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, X } from 'lucide-react';
import { db } from '../config/firebase';
import { useAdmin } from '../hooks/useAdmin';
import { useComments } from '../hooks/useComments';

interface EmaBoardProps {
  dayId: string;
}

const EMOJI_OPTIONS = ['🌸', '⛩️', '🍡', '🏔️', '🧸', '🍜', '🍣', '🎏', '🎋', '🦊', '🍵', '🏮'];

const EmaBoard: React.FC<EmaBoardProps> = ({ dayId }) => {
  const { isAdmin } = useAdmin();
  const boardId = `ema-board-${dayId}`;
  
  const { comments: emas, addComment } = useComments(boardId);
  
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftText, setDraftText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (emaId: string) => {
    if (window.confirm('Vill du plocka ner denna Ema?')) {
      try {
        await deleteDoc(doc(db, 'comments', emaId));
      } catch (err) {
        console.error('Failed to delete Ema', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftName.trim() || !draftText.trim()) {
      setError('Både namn och hälsning krävs!');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addComment(draftName, draftText, dayId, selectedEmoji);
      setIsDrafting(false);
      setDraftName('');
      setDraftText('');
      setSelectedEmoji(EMOJI_OPTIONS[0]);
    } catch (err) {
      setError('Kunde inte hänga upp din Ema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFontSize = (text: string) => {
    const length = text.length;
    if (length < 20) return '0.85rem';
    if (length < 40) return '0.75rem';
    if (length < 60) return '0.65rem';
    return '0.55rem';
  };

  return (
    <div className="ema-board-section">
      <div className="ema-board-header">
        <h3 className="ema-title">Lämna ett spår</h3>
        <p className="ema-subtitle">Häng en Ema (önskning) på tavlan</p>
      </div>

      <div className="ema-rack">
        <AnimatePresence>
          {emas.map((ema) => (
            <motion.div
              key={ema.id}
              className="ema-card"
              initial={{ opacity: 0, y: -20, rotate: -5 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ rotate: [-2, 2, -1, 1, 0], transition: { duration: 0.8 } }}
            >
              {isAdmin && (
                <button
                  className="ema-delete"
                  onClick={() => handleDelete(ema.id)}
                  title="Ta bort Ema"
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <div className="ema-content">
                <div className="ema-emoji">{ema.emoji || '🌸'}</div>
                <div 
                  className="ema-text" 
                  style={{ fontSize: getFontSize(ema.text) }}
                >
                  "{ema.text}"
                </div>
                <div className="ema-author">- {ema.author}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!isDrafting && (
          <motion.div
            className="ema-card ema-add-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsDrafting(true)}
            whileHover={{ scale: 1.05 }}
          >
            <div className="ema-content ema-add-content">
              <Plus size={32} />
              <span>Häng Ema</span>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isDrafting && (
          <motion.form
            className="ema-draft-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
          >
            <div className="ema-draft-header">
              <h4>Skriv din Ema</h4>
              <button type="button" onClick={() => setIsDrafting(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="ema-emoji-picker">
              <label>Välj en symbol:</label>
              <div className="emoji-grid">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`emoji-btn ${selectedEmoji === emoji ? 'selected' : ''}`}
                    onClick={() => setSelectedEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="ema-inputs">
              <input
                type="text"
                placeholder="Ditt namn..."
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={30}
                required
                disabled={isSubmitting}
              />
              <textarea
                placeholder="En kort hälsning..."
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                maxLength={80}
                rows={2}
                required
                disabled={isSubmitting}
              />
            </div>

            {error && <div className="ema-error">{error}</div>}

            <button
              type="submit"
              className="ema-submit-btn"
              disabled={isSubmitting || !draftName.trim() || !draftText.trim()}
            >
              {isSubmitting ? 'Hänger upp...' : 'Häng upp!'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <style>{`
        .ema-board-section {
          margin-top: 4rem;
          padding-top: 3rem;
          border-top: 1px solid var(--border-color);
          position: relative;
        }

        .ema-board-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .ema-title {
          font-family: var(--font-main);
          font-size: 1.75rem;
          color: var(--text-main);
          margin-bottom: 0.5rem;
        }

        .ema-subtitle {
          color: var(--text-dim);
          font-size: 0.95rem;
          font-style: italic;
        }

        .ema-rack {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          justify-content: center;
          padding: 1rem;
        }

        .ema-card {
          position: relative;
          width: 240px;
          height: 195px;
          background: url('/ema-plaque.png') no-repeat center center;
          background-size: contain;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: default;
          transform-origin: top center;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.12));
          padding: 0; /* Content handled by absolute positioning */
        }

        .ema-content {
          position: absolute;
          top: 55%; /* Centered in the wooden flat part */
          left: 50%;
          transform: translate(-50%, -50%);
          width: 65%; /* Slightly narrower for safer margins */
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ema-emoji {
          font-size: 1.4rem;
          margin-bottom: 0.1rem;
        }

        .ema-text {
          font-family: var(--font-mono);
          color: #4a3423;
          line-height: 1.2;
          margin-bottom: 0.3rem;
          overflow-wrap: break-word;
          max-width: 100%;
          max-height: 3.6em; 
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
        }

        .ema-author {
          font-size: 0.6rem;
          font-weight: 700;
          color: #5d2e0d;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 90%;
        }

        .ema-delete {
          position: absolute;
          top: 25%;
          right: 15%;
          color: #8b0000;
          background: rgba(255, 255, 255, 0.8);
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 10;
        }

        .ema-card:hover .ema-delete {
          opacity: 1;
        }

        .ema-add-card {
          background-color: transparent;
          cursor: pointer;
          filter: sepia(0.5) opacity(0.7);
        }

        .ema-add-content {
          color: #5d2e0d;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          margin-top: 2rem;
        }

        .ema-add-content span {
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Draft Form */
        .ema-draft-form {
          max-width: 500px;
          margin: 2rem auto;
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .ema-draft-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .ema-draft-header h4 {
          margin: 0;
          color: var(--text-main);
        }

        .ema-draft-header button {
          background: transparent;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.5rem;
          margin: 0.75rem 0 1.5rem;
        }

        .emoji-btn {
          font-size: 1.5rem;
          background: var(--primary-light);
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .emoji-btn:hover {
          background: #ffe1e8;
          transform: scale(1.1);
        }

        .emoji-btn.selected {
          border-color: var(--primary);
          background: #ffe1e8;
        }

        .ema-inputs {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ema-inputs input,
        .ema-inputs textarea {
          width: 100%;
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.75rem;
          font-family: inherit;
          font-size: 0.95rem;
          color: var(--text-main);
          outline: none;
        }

        .ema-inputs input:focus,
        .ema-inputs textarea:focus {
          border-color: var(--primary);
        }

        .ema-submit-btn {
          width: 100%;
          margin-top: 1.5rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          padding: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ema-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ema-error {
          color: var(--primary);
          font-size: 0.85rem;
          margin-top: 0.75rem;
          text-align: center;
        }

        @media (max-width: 640px) {
          .ema-rack {
            gap: 1.5rem 0.5rem;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
          }
          .ema-card {
            width: 165px;
            height: 134px;
          }
          .ema-emoji {
            font-size: 1rem;
          }
          .ema-text {
            font-size: 0.55rem !important; /* Force smaller size on mini-cards */
            line-height: 1.1;
          }
          .ema-author {
            font-size: 0.45rem;
          }
          .emoji-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .ema-add-content {
            margin-top: 1.5rem;
          }
          .ema-add-content span {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EmaBoard;
