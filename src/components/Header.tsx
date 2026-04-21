import React from 'react';
import { Plus, User } from 'lucide-react';
interface HeaderProps {
  canPost?: boolean;
  isAdminPanelOpen?: boolean;
  onToggleAdminPanel?: () => void;
  onLoginClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ canPost, onToggleAdminPanel, onLoginClick }) => {
  return (
    <header className="main-header">
      <div className="header-content">
        <div className="hanko-seal" title="Sakura Seal">
          <span className="seal-text">印</span>
        </div>

        <div className="logo-text">
          <h1>Japan Journal</h1>
        </div>

        <div className="header-actions">
          {canPost && (
            <button className="header-icon-btn" onClick={onToggleAdminPanel} title="Adminverktyg">
              <Plus size={20} />
            </button>
          )}
          <button className="header-icon-btn" onClick={onLoginClick} title="Logga in">
            <User size={18} />
          </button>
        </div>
      </div>

      <style>{`
        .main-header {
          position: sticky;
          top: 0;
          z-index: 100;
          padding: 1.25rem 0;
          background: rgba(252, 249, 242, 0.85); /* Matches --neutral with opacity */
          backdrop-filter: blur(14px) saturate(160%);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          border-bottom: 1px solid rgba(188, 0, 45, 0.04);
          transition: all 0.3s ease;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
        }

        .hanko-seal {
          width: 36px;
          height: 36px;
          border-radius: 8px; /* Square with slight rounding for more authentic seal look */
          background: rgba(188, 0, 45, 0.03);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(188, 0, 45, 0.15);
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
          cursor: pointer;
        }

        .hanko-seal:hover {
          transform: rotate(-10deg) scale(1.1);
          background: rgba(188, 0, 45, 0.08);
          box-shadow: 0 4px 15px rgba(188, 0, 45, 0.1);
        }

        .seal-text {
          font-family: var(--font-heading);
          font-size: 0.9rem;
          font-weight: 700;
          opacity: 0.85;
        }

        .header-actions {
          justify-self: end;
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .header-icon-btn {
          color: var(--text-dim);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: transparent;
        }

        .header-icon-btn:hover {
          background: rgba(188, 0, 45, 0.05);
          color: var(--primary);
          transform: translateY(-2px);
        }

        .logo-text h1 {
          font-family: var(--font-heading);
          font-size: 1.6rem;
          color: var(--text-main);
          font-weight: 700;
          font-style: italic;
          letter-spacing: -0.01em;
          background: linear-gradient(135deg, var(--text-main) 0%, var(--primary) 150%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @media (max-width: 640px) {
          .header-content {
            padding: 0 1rem;
          }
          .logo-text h1 {
            font-size: 1.35rem;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
