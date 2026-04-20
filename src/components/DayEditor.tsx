import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit3, FileText, Plus, X } from 'lucide-react';
import type { Day } from '../types';
import { dateFromDateKey, formatDateKey, formatDateSwedish } from '../utils/dateHelpers';

interface DayEditorProps {
  days: Day[];
  selectedDay: Day | null;
  createDay: (input: {
    date: Date;
    title?: string;
    description?: string;
    itinerary?: string;
  }) => Promise<string>;
  updateDay: (dayId: string, patch: {
    title?: string;
    description?: string;
    itinerary?: string;
  }) => Promise<void>;
  onSelectDay: (dayId: string) => void;
}

type EditorMode = 'closed' | 'create' | 'edit';

const DayEditor: React.FC<DayEditorProps> = ({ days, selectedDay, createDay, updateDay, onSelectDay }) => {
  const [mode, setMode] = useState<EditorMode>('closed');
  const [dateKey, setDateKey] = useState<string>(selectedDay?.dateKey ?? formatDateKey(new Date()));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itinerary, setItinerary] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingDateKeys = days.map((day) => day.dateKey);

  const openCreate = () => {
    setDateKey(formatDateKey(new Date()));
    setTitle('');
    setDescription('');
    setItinerary('');
    setError(null);
    setMode('create');
  };

  const openEdit = () => {
    if (!selectedDay) {
      return;
    }

    setDateKey(selectedDay.dateKey);
    setTitle(selectedDay.title);
    setDescription(selectedDay.description ?? '');
    setItinerary(selectedDay.itinerary ?? '');
    setError(null);
    setMode('edit');
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      if (mode === 'create') {
        const createdDayId = await createDay({
          date: dateFromDateKey(dateKey),
          title,
          description,
          itinerary,
        });
        onSelectDay(createdDayId);
      } else if (selectedDay) {
        await updateDay(selectedDay.id, {
          title,
          description,
          itinerary,
        });
      }

      setMode('closed');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Kunde inte spara dagen.');
    } finally {
      setIsSaving(false);
    }
  };

  const isCreate = mode === 'create';
  const hasDuplicateDate = isCreate && existingDateKeys.includes(dateKey);

  return (
    <div className="day-editor-container">
      {mode === 'closed' ? (
        <div className="day-display">
          <div className="action-row">
            <button className="edit-btn glass" onClick={openCreate}>
              <Plus size={14} />
              <span>{days.length === 0 ? 'Skapa första dagen' : 'Ny dag'}</span>
            </button>

            {selectedDay && (
              <button className="edit-btn glass" onClick={openEdit}>
                <Edit3 size={14} />
                <span>Redigera dag</span>
              </button>
            )}
          </div>

          {selectedDay?.itinerary && (
            <div className="itinerary-preview glass">
              <FileText size={16} />
              <p>{selectedDay.itinerary}</p>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          className="admin-edit-panel glass"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isCreate && (
            <div className="edit-field">
              <label>Datum</label>
              <input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} />
              <p className="date-hint">{dateKey ? formatDateSwedish(dateFromDateKey(dateKey)) : 'Välj ett datum.'}</p>
            </div>
          )}

          <div className="edit-field">
            <label>Titel (valfritt)</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Framme i Tokyo"
            />
          </div>

          <div className="edit-field">
            <label>Kort beskrivning</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Vad stack ut den här dagen?"
              rows={2}
            />
          </div>

          <div className="edit-field">
            <label>Text om dagen</label>
            <textarea
              value={itinerary}
              onChange={(event) => setItinerary(event.target.value)}
              placeholder="Berätta mer om vad ni gjorde..."
              rows={4}
            />
          </div>

          {hasDuplicateDate && <p className="helper-text">Den dagen finns redan.</p>}
          {error && <p className="helper-text">{error}</p>}

          <div className="edit-actions">
            <button className="cancel-btn" onClick={() => setMode('closed')}>
              <X size={16} /> Avbryt
            </button>
            <button className="save-btn" onClick={handleSave} disabled={isSaving || hasDuplicateDate}>
              {isSaving ? 'Sparar...' : <><Check size={16} /> {isCreate ? 'Skapa dag' : 'Spara'}</>}
            </button>
          </div>
        </motion.div>
      )}

      <style>{`
        .day-editor-container {
          margin-bottom: 2rem;
        }

        .day-display {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .edit-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          color: var(--text-dim);
          width: max-content;
        }

        .edit-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .edit-btn:hover:not(:disabled) {
          color: var(--text-main);
          border-color: var(--primary);
        }

        .itinerary-preview {
          padding: 1.25rem;
          border-radius: var(--radius-md);
          display: flex;
          gap: 1rem;
          color: var(--text-dim);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .admin-edit-panel {
          padding: 1.5rem;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          border: 1px solid var(--primary);
        }

        .edit-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .edit-field label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .edit-field input,
        .edit-field textarea {
          background: var(--accent-light);
          border: 1px solid var(--border-color);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          color: var(--text-main);
          font-family: inherit;
        }

        .edit-field input:focus,
        .edit-field textarea:focus {
          outline: none;
          border-color: var(--text-muted);
        }

        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        .helper-text,
        .date-hint {
          color: var(--text-dim);
          font-size: 0.85rem;
        }

        .save-btn {
          background: var(--primary);
          color: white;
          padding: 0.6rem 1.25rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .save-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .cancel-btn {
          color: var(--text-dim);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default DayEditor;
