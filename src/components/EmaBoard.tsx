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

const EMOJI_OPTIONS = ['🌸', '⛩️', '🏠', '🏔️', '🧸', '🍜', '🍣', '🎁', '🍶', '🦊', '🍵', '🎐'];

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
    if (length < 16) return '0.94rem';
    if (length < 30) return '0.82rem';
    if (length < 45) return '0.74rem';
    if (length < 60) return '0.7rem';
    if (length < 75) return '0.64rem';
    return '0.6rem';
  };

  type RackItem = { type: 'ema'; ema: (typeof emas)[number] } | { type: 'add' };

  const rackItems = React.useMemo<RackItem[]>(() => {
    const items: RackItem[] = emas.map((ema) => ({ type: 'ema', ema }));

    if (!isDrafting) {
      items.push({ type: 'add' });
    }

    return items;
  }, [emas, isDrafting]);

  const emaRows = React.useMemo(() => {
    const rows: RackItem[][] = [];

    for (let index = 0; index < rackItems.length; index += 2) {
      rows.push(rackItems.slice(index, index + 2));
    }

    return rows;
  }, [rackItems]);

  return (
    <div className="ema-board-section">
      <div className="ema-board-header">
        <h3 className="ema-title">Lämna ett spår</h3>
        <p className="ema-subtitle">Häng en Ema (önskning) på tavlan</p>
      </div>

      <div className="ema-rack">
        {emaRows.map((row, rowIndex) => (
          <div
            key={`ema-row-${rowIndex}`}
            className={`ema-row ${row.length === 1 ? 'single-card' : ''}`}
          >
            <div className="ema-rail" aria-hidden="true" />
            <div className="ema-row-cards">
              <AnimatePresence initial={false}>
                {row.map((item) =>
                  item.type === 'ema' ? (
                    <motion.div
                      key={item.ema.id}
                      className="ema-card"
                      initial={{ opacity: 0, y: -20, rotate: -5 }}
                      animate={{ opacity: 1, y: 0, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ rotate: [-2, 2, -1, 1, 0], transition: { duration: 0.8 } }}
                    >
                      {isAdmin && (
                        <button
                          className="ema-delete"
                          onClick={() => handleDelete(item.ema.id)}
                          title="Ta bort Ema"
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <div className="ema-content">
                        <div className="ema-emoji">{item.ema.emoji || '🌸'}</div>
                        <div className="ema-text" style={{ fontSize: getFontSize(item.ema.text) }}>
                          "{item.ema.text}"
                        </div>
                        <div className="ema-author">- {item.ema.author}</div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="ema-add-card"
                      className="ema-card ema-add-card"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setIsDrafting(true)}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="ema-content ema-add-content">
                        <Plus size={32} />
                        <span>Häng Ema</span>
                      </div>
                    </motion.button>
                  )
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
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
                maxLength={70}
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
          margin-top: 3rem;
          padding-top: 1.75rem;
          border-top: 1px solid var(--border-color);
          position: relative;
        }

        .ema-board-header {
          text-align: center;
          margin-bottom: 1.4rem;
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
          --ema-card-width: 240px;
          --ema-card-height: 195px;
          --ema-row-gap: 2.35rem;
          --ema-column-gap: 1.5rem;
          --ema-hang-gap: 0.28rem;
          display: flex;
          flex-direction: column;
          gap: var(--ema-row-gap);
          padding: 1rem 0.75rem 0.6rem;
        }

        .ema-row {
          display: flex;
          flex-direction: column;
          gap: var(--ema-hang-gap);
        }

        .ema-rail {
          position: relative;
          width: calc(100% - 0.9rem);
          height: 0.72rem;
          margin: 0 auto;
          border-radius: 999px;
          background:
            linear-gradient(
              to bottom,
              rgba(255, 244, 223, 0.55) 0,
              rgba(255, 244, 223, 0.18) 18%,
              #74401a 18%,
              #9c6230 44%,
              #74401a 69%,
              #4b2207 100%
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.32),
            inset 0 -1px 0 rgba(62, 28, 8, 0.38),
            0 2px 6px rgba(70, 34, 12, 0.18);
        }

        .ema-rail::before,
        .ema-rail::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          transform: translateY(-50%);
          background: rgba(69, 30, 8, 0.82);
          box-shadow: 0 0 0 1px rgba(147, 98, 48, 0.35);
        }

        .ema-rail::before {
          left: 1rem;
        }

        .ema-rail::after {
          right: 1rem;
        }

        .ema-row-cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, var(--ema-card-width)));
          justify-content: center;
          column-gap: var(--ema-column-gap);
          align-items: start;
        }

        .ema-row.single-card .ema-row-cards {
          grid-template-columns: minmax(0, var(--ema-card-width));
        }

        .ema-card {
          position: relative;
          width: var(--ema-card-width);
          height: var(--ema-card-height);
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
          padding: 0;
          z-index: 1;
        }

        .ema-content {
          position: absolute;
          top: 55.6%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 69%;
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
          line-height: 1.15;
          margin-bottom: 0.18rem;
          overflow-wrap: anywhere;
          word-break: normal;
          max-width: 100%;
          height: 3.45em;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          padding: 0 6px;
          font-weight: 600;
        }

        .ema-author {
          font-size: 0.62rem;
          font-weight: 700;
          color: #5d2e0d;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1;
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
          border: none;
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
          margin-top: 0;
          top: 58%;
          width: 72%;
        }

        .ema-add-content span {
          font-size: 0.85rem;
          font-weight: 600;
        }

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
          .ema-board-section {
            margin-top: 2.4rem;
            padding-top: 1.35rem;
          }

          .ema-board-header {
            margin-bottom: 1rem;
          }

          .ema-rack {
            --ema-card-width: 100%;
            --ema-card-height: 154px;
            --ema-row-gap: 1.75rem;
            --ema-column-gap: 0.45rem;
            --ema-hang-gap: 0.16rem;
            padding: 0.65rem 0 0.3rem;
          }

          .ema-rail {
            width: 100%;
            height: 0.62rem;
          }

          .ema-rail::before {
            left: 0.75rem;
          }

          .ema-rail::after {
            right: 0.75rem;
          }

          .ema-row-cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            column-gap: var(--ema-column-gap);
          }

          .ema-row.single-card .ema-row-cards {
            grid-template-columns: minmax(0, 1fr);
          }

          .ema-row.single-card .ema-card {
            justify-self: center;
            width: min(100%, 172px);
          }

          .ema-card {
            width: 100%;
            height: auto;
            aspect-ratio: 240 / 195;
            max-width: none;
          }

          .ema-content {
            width: 72%;
            top: 55.3%;
          }

          .ema-emoji {
            font-size: clamp(0.95rem, 4vw, 1.15rem);
            margin-bottom: 0.15rem;
          }

          .ema-text {
            line-height: 1.08;
            height: 3.24em;
            margin-bottom: 0.1rem;
            padding: 0 1px;
          }

          .ema-author {
            font-size: clamp(0.5rem, 1.9vw, 0.62rem);
          }

          .emoji-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .ema-add-content {
            top: 57%;
            width: 74%;
            gap: 0.28rem;
          }

          .ema-add-content svg {
            width: 18px;
            height: 18px;
          }

          .ema-add-content span {
            font-size: 0.68rem;
          }
        }

        @media (max-width: 480px) {
          .ema-rack {
            --ema-card-height: 148px;
            --ema-row-gap: 1.55rem;
            --ema-column-gap: 0.4rem;
          }

          .ema-row.single-card .ema-card {
            width: min(100%, 160px);
          }

          .ema-content {
            width: 73%;
            top: 55%;
          }

          .ema-text {
            line-height: 1.06;
            height: 3.18em;
          }

          .ema-add-content {
            width: 75%;
            top: 56.8%;
          }

          .ema-add-content span {
            font-size: 0.64rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EmaBoard;
