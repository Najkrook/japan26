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
            <ShieldCheck size={32} />
          </div>
          <h2>Logga in med Google</h2>
          <p>Bara godkända konton får uppladdningsåtkomst och adminbehörighet.</p>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <button className="google-login-btn" onClick={() => void onLogin()} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
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
          background: rgba(29, 31, 35, 0.45);
          backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1rem;
        }

        .admin-modal {
          width: 100%;
          max-width: 400px;
          padding: 3rem 2rem;
          border-radius: var(--radius-lg);
          text-align: center;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .close-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          color: var(--text-muted);
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: var(--text-main);
        }

        .icon-wrapper {
          color: var(--primary);
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
        }

        .modal-header h2 {
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
          color: var(--text-main);
        }

        .modal-header p {
          color: var(--text-dim);
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 2.5rem;
        }

        .error-box {
          background: rgba(193, 62, 49, 0.1);
          border: 1px solid var(--primary);
          color: var(--primary);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          text-align: left;
        }

        .google-login-btn {
          width: 100%;
          background: white;
          color: rgba(0, 0, 0, 0.6);
          padding: 0.75rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .google-login-btn:hover:not(:disabled) {
          background: #f8f8f8;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .google-login-btn img {
          width: 20px;
          height: 20px;
        }

        .google-login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .modal-footer {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color);
        }

        .modal-footer p {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </motion.div>
  );
};

export default AdminLogin;
