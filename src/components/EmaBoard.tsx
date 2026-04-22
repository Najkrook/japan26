import React, { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, X } from 'lucide-react';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useComments } from '../hooks/useComments';
import { formatDateTimeSwedish } from '../utils/dateHelpers';

interface EmaBoardProps {
  dayId: string;
}

const EMOJI_OPTIONS = ['🌸', '⛩️', '🍡', '🏔️', '🧸', '🍜', '🍣', '🎏', '🎋', '🦊', '🍵', '🏮'];

const EmaBoard: React.FC<EmaBoardProps> = ({ dayId }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const boardId = `ema-board-${dayId}`;
  
  const { comments: emas, loading, addComment } = useComments(boardId);
  
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
              <div className="ema-string"></div>
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
                <div className="ema-text">"{ema.text}"</div>
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
            <div className="ema-string"></div>
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
                maxLength={100}
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
    </div>
  );
};

export default EmaBoard;
