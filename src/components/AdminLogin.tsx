import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ShieldCheck, X } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => Promise<void>;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onClose, loading = false, error = null }) => {
  return (
    <motion.div
      className="admin-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        className="admin-modal glass"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
      >
        <button className="close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <div className="icon-wrapper">
            <div className="icon-circle">
              <ShieldCheck size={28} />
            </div>
          </div>
          <h2>Logga in</h2>
          <p>Bara godkända konton får uppladdningsåtkomst och adminbehörighet.</p>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <button className="google-login-btn" onClick={() => void onLogin()} disabled={loading}>
          <div className="google-icon-wrapper">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
          </div>
          <span>{loading ? 'Loggar in...' : 'Fortsätt med Google'}</span>
        </button>

        <div className="modal-footer">
          <p>Besökare kan fortfarande titta och kommentera utan att logga in.</p>
        </div>
      </motion.div>

      <style>{`
        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(42, 42, 46, 0.4);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1.5rem;
        }

        .admin-modal {
          width: 100%;
          max-width: 380px;
          padding: 3.5rem 2rem 2.5rem;
          border-radius: var(--radius-lg);
          text-align: center;
          position: relative;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 25px 50px -12px rgba(188, 0, 45, 0.15);
        }

        .close-btn {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          color: var(--text-muted);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          color: var(--primary);
          background: rgba(188, 0, 45, 0.05);
          transform: rotate(90deg);
        }

        .icon-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .icon-circle {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, var(--tertiary) 0%, var(--secondary) 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          box-shadow: 0 10px 20px rgba(188, 0, 45, 0.1);
          transform: rotate(-10deg);
        }

        .modal-header h2 {
          font-family: var(--font-heading);
          font-size: 1.75rem;
          margin-bottom: 1rem;
          color: var(--text-main);
          letter-spacing: -0.01em;
        }

        .modal-header p {
          color: var(--text-dim);
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 2.5rem;
          padding: 0 1rem;
        }

        .error-box {
          background: rgba(188, 0, 45, 0.08);
          border: 1px solid rgba(188, 0, 45, 0.15);
          color: var(--primary);
          padding: 1rem;
          border-radius: var(--radius-sm);
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          text-align: left;
        }

        .google-login-btn {
          width: 100%;
          background: white;
          color: #3C4043;
          padding: 0.5rem;
          padding-right: 1.5rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid #DADCE0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .google-icon-wrapper {
          background: white;
          padding: 0.5rem;
          border-radius: 8px;
        }

        .google-login-btn:hover:not(:disabled) {
          background: #fdfdfd;
          border-color: #BEC1C5;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
        }

        .google-login-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .google-login-btn img {
          width: 20px;
          height: 20px;
        }

        .google-login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          filter: grayscale(1);
        }

        .modal-footer {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(188, 0, 45, 0.05);
        }

        .modal-footer p {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
        }
      `}</style>
    </motion.div>
  );
};

export default AdminLogin;
