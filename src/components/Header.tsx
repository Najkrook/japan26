import React from 'react';
import { Plus, User, Moon, Sun } from 'lucide-react';
interface HeaderProps {
  canPost?: boolean;
  isAdminPanelOpen?: boolean;
  onToggleAdminPanel?: () => void;
  onLoginClick?: () => void;
  onHankoClick?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  canPost, 
  onToggleAdminPanel, 
  onLoginClick, 
  onHankoClick,
  theme = 'light',
  onToggleTheme
}) => {
  return (
    <header className="main-header">
      <div className="header-content">
        <div className="header-left">
          <button 
            type="button" 
            className="hanko-seal-square" 
            title="Klicka för stämpelbok"
            onClick={onHankoClick}
          >
            日
          </button>
        </div>

        <div className="logo-text">
          <h1>Japan <span>Journal</span></h1>
        </div>

        <div className="header-right">
          <div className="header-actions">
            {canPost && (
              <button className="header-icon-btn" onClick={onToggleAdminPanel} title="Adminverktyg">
                <Plus size={20} />
              </button>
            )}
            <button className="header-icon-btn" onClick={onLoginClick} title="Logga in">
              <User size={18} />
            </button>
            <button 
              className="header-icon-btn" 
              onClick={onToggleTheme}
              title={theme === 'light' ? 'Växla till mörkt läge' : 'Växla till ljust läge'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .main-header {
          position: sticky;
          top: 0;
          z-index: 100;
          padding: 1rem 0;
          background: var(--glass-bg);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-color);
          transition: all 0.3s ease;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
        }

        .header-left {
          display: flex;
          align-items: center;
        }

        .hanko-seal-square {
          width: 32px;
          height: 32px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2);
          transition: transform 0.2s ease;
        }

        .hanko-seal-square:hover {
          transform: scale(1.05);
        }

        .logo-text h1 {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          color: var(--text-main);
          font-weight: 600;
          letter-spacing: 0.02em;
          margin: 0;
        }

        .logo-text h1 span {
          font-weight: 400;
          font-style: italic;
          opacity: 0.9;
        }

        .header-right {
          display: flex;
          justify-content: flex-end;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .header-icon-btn {
          color: var(--text-dim);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header-icon-btn:hover {
          background: var(--primary-light);
          color: var(--primary);
        }

        @media (max-width: 640px) {
          .header-content {
            padding: 0 1rem;
          }
          .logo-text h1 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
