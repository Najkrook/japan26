import React, { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, MessageCircle, Plus, Trash2, X } from 'lucide-react';
import { db } from '../config/firebase';
import { useAdmin } from '../hooks/useAdmin';
import { useComments } from '../hooks/useComments';

interface EmaBoardProps {
  dayId: string;
}

const EMOJI_OPTIONS = ['\u{1F338}', '\u26E9', '\u{1F3E0}', '\u{1F3D4}', '\u{1F9F8}', '\u{1F35C}', '\u{1F363}', '\u{1F381}', '\u{1F376}', '\u{1F98A}', '\u{1F375}', '\u{1F390}'];

const EmaBoard: React.FC<EmaBoardProps> = ({ dayId }) => {
  const { isAdmin } = useAdmin();
  const boardId = `ema-board-${dayId}`;
  const [isExpanded, setIsExpanded] = useState(false);
  const { comments: emas, addComment, loading } = useComments(isExpanded ? boardId : null);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftName.trim() || !draftText.trim()) {
      setError('Bade namn och halsning kravs!');
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
    } catch {
      setError('Kunde inte hanga upp din Ema.');
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
      <button
        type="button"
        className="ema-toggle"
        onClick={() => setIsExpanded((current) => !current)}
      >
        <div>
          <h3 className="ema-title">Lamna ett spar</h3>
          <p className="ema-subtitle">Hang en Ema (onskning) pa tavlan nar du vill.</p>
        </div>
        <span className="ema-toggle-pill">
          <MessageCircle size={14} />
          {isExpanded ? 'Stang' : 'Oppna'}
          <ChevronDown size={16} className={isExpanded ? 'is-open' : ''} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {loading ? (
              <div className="ema-loading-state">Hamtar tavlan...</div>
            ) : (
              <>
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
                                  <div className="ema-emoji">{item.ema.emoji || '\u{1F338}'}</div>
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
                                  <span>Hang Ema</span>
                                </div>
                              </motion.button>
                            ),
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
                        <label>Valj en symbol:</label>
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
                          onChange={(event) => setDraftName(event.target.value)}
                          maxLength={30}
                          required
                          disabled={isSubmitting}
                        />
                        <textarea
                          placeholder="En kort halsning..."
                          value={draftText}
                          onChange={(event) => setDraftText(event.target.value)}
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
                        {isSubmitting ? 'Hanger upp...' : 'Hang upp!'}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .ema-board-section {
          margin-top: 1.5rem;
          border-top: 1px solid rgba(188, 0, 45, 0.08);
          padding-top: 1.5rem;
        }

        .ema-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          text-align: left;
          padding: 0.9rem 1rem;
          border-radius: var(--radius-md);
          background: rgba(188, 0, 45, 0.05);
          border: 1px solid rgba(188, 0, 45, 0.12);
        }

        .ema-title {
          margin: 0;
          font-size: 1.1rem;
        }

        .ema-subtitle {
          margin: 0.2rem 0 0 0;
          color: var(--text-dim);
          font-size: 0.9rem;
        }

        .ema-toggle-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--primary);
          font-weight: 700;
          font-size: 0.85rem;
        }

        .ema-toggle-pill .is-open {
          transform: rotate(180deg);
        }

        .ema-loading-state {
          padding: 1rem 0;
          color: var(--text-dim);
        }

        .ema-rack {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ema-row {
          position: relative;
          padding-top: 0.5rem;
        }

        .ema-rail {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(188, 0, 45, 0.12);
        }

        .ema-row-cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .ema-row.single-card .ema-row-cards {
          grid-template-columns: minmax(0, 1fr);
        }

        .ema-card {
          position: relative;
          min-height: 140px;
          padding: 1rem;
          border-radius: 18px;
          background: linear-gradient(180deg, #fff5f2 0%, #fffdf8 100%);
          border: 1px solid rgba(188, 0, 45, 0.12);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
        }

        .ema-add-card {
          display: flex;
          align-items: center;
          justify-content: center;
          border-style: dashed;
          color: var(--primary);
        }

        .ema-delete {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          color: var(--text-dim);
        }

        .ema-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          gap: 0.5rem;
        }

        .ema-emoji {
          font-size: 1.4rem;
        }

        .ema-text {
          color: var(--text-main);
          line-height: 1.4;
        }

        .ema-author {
          color: var(--text-dim);
          font-size: 0.85rem;
        }

        .ema-draft-form {
          margin-top: 1rem;
          padding: 1rem;
          border-radius: var(--radius-md);
          background: rgba(188, 0, 45, 0.04);
          border: 1px solid rgba(188, 0, 45, 0.12);
          overflow: hidden;
        }

        .ema-draft-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .ema-inputs {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.5rem;
          margin: 0.75rem 0 1rem;
        }

        .emoji-btn,
        .ema-submit-btn {
          border-radius: var(--radius-sm);
        }

        .emoji-btn {
          padding: 0.55rem;
          background: white;
          border: 1px solid var(--border-color);
        }

        .emoji-btn.selected {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(188, 0, 45, 0.12);
        }

        .ema-inputs input,
        .ema-inputs textarea {
          width: 100%;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 0.75rem 0.9rem;
          font: inherit;
          color: var(--text-main);
        }

        .ema-error {
          margin-top: 0.75rem;
          color: #9b2c2c;
          font-size: 0.9rem;
        }

        .ema-submit-btn {
          margin-top: 1rem;
          width: 100%;
          padding: 0.85rem 1rem;
          background: var(--primary);
          color: white;
          font-weight: 700;
        }

        @media (max-width: 640px) {
          .ema-row-cards {
            grid-template-columns: minmax(0, 1fr);
          }

          .emoji-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
};

export default EmaBoard;
