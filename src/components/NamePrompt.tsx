import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface NamePromptProps {
  onSave: (name: string) => void;
}

const NamePrompt: React.FC<NamePromptProps> = ({ onSave }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (inputValue.trim()) {
      onSave(inputValue.trim());
    }
  };

  return (
    <div className="name-prompt-overlay">
      <motion.div
        className="name-prompt-card"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="hanko-seal-prompt" title="Sakura Seal">
          <span className="seal-text-prompt">印</span>
        </div>
        <h1 className="name-prompt-title">Hallojs!</h1>
        <p className="name-prompt-subtitle">Vem är du?</p>

        <form onSubmit={handleSubmit} className="name-prompt-form">
          <input
            type="text"
            placeholder="Ditt namn..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            autoFocus
            className="name-prompt-input"
          />
          <button
            type="submit"
            className="name-prompt-button"
            disabled={!inputValue.trim()}
          >
            Börja snoka!
          </button>
        </form>
      </motion.div>

      <style>{`
        .name-prompt-overlay {
          position: fixed;
          inset: 0;
          background: rgba(253, 226, 228, 0.7); /* Tertiary Sakura Color w/ opacity */
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.5rem;
        }

        .name-prompt-card {
          width: 100%;
          max-width: 440px;
          padding: 3rem 2.5rem;
          border-radius: var(--radius-lg);
          text-align: center;
          background: var(--surface-color);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-color);
          position: relative;
        }

        .hanko-seal-prompt {
          width: 40px;
          height: 40px;
          border: 2px solid var(--primary);
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto 1.5rem;
          color: var(--primary);
        }

        .seal-text-prompt {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          line-height: 1;
        }

        .name-prompt-title {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: var(--primary);
        }

        .name-prompt-subtitle {
          color: var(--text-dim);
          margin-bottom: 2.5rem;
          font-size: 1.1rem;
        }

        .name-prompt-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .name-prompt-input {
          background: rgba(188, 0, 45, 0.02); /* Very light primary */
          border: 1px solid var(--border-color);
          padding: 1.25rem 1.5rem;
          border-radius: var(--radius-md);
          color: var(--text-main);
          font-size: 1.1rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .name-prompt-input:focus {
          outline: none;
          background: rgba(188, 0, 45, 0.04);
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(188, 0, 45, 0.08); /* Primary glow */
        }

        .name-prompt-button {
          background: var(--primary);
          color: white;
          padding: 1.25rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 1.1rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .name-prompt-button:hover:not(:disabled) {
          background: var(--primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(188, 0, 45, 0.25);
        }

        .name-prompt-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(1);
        }

        @media (max-width: 640px) {
          .name-prompt-card {
            padding: 2.5rem 1.5rem;
          }

          .name-prompt-title {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default NamePrompt;
