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
          padding: 1rem 0;
          background: rgba(250, 249, 246, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
        }

        .hanko-seal {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--tertiary);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(188, 0, 45, 0.1);
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
          cursor: pointer;
        }

        .hanko-seal:hover {
          transform: rotate(-15deg) scale(1.15);
          box-shadow: 0 4px 12px rgba(188, 0, 45, 0.2);
        }

        .seal-text {
          font-family: var(--font-heading);
          font-size: 0.8rem;
          font-weight: 700;
        }

        .header-actions {
          justify-self: end;
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }

        .header-icon-btn {
          color: var(--primary);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .header-icon-btn:hover {
          background: var(--tertiary);
        }

        .logo-text h1 {
          font-family: var(--font-heading);
          font-size: 1.4rem;
          color: var(--primary);
          font-weight: 700;
          font-style: italic;
          letter-spacing: 0.02em;
        }

        @media (max-width: 640px) {
          .logo-text h1 {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
