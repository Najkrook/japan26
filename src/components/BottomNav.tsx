import React from 'react';
import { BookOpen, Map } from 'lucide-react';

export type TabType = 'journal' | 'map';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bottom-nav">
      <div className="nav-container">
        <button 
          className={`nav-item ${activeTab === 'journal' ? 'active' : ''}`}
          onClick={() => onTabChange('journal')}
        >
          <BookOpen size={20} />
          <span>JOURNAL</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => onTabChange('map')}
        >
          <Map size={20} />
          <span>KARTA</span>
        </button>
      </div>

      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(252, 249, 242, 0.82); /* Matches --neutral */
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          padding: 0.9rem 1rem calc(0.9rem + env(safe-area-inset-bottom));
          border-top: 1px solid rgba(188, 0, 45, 0.06);
          border-radius: 24px 24px 0 0;
          z-index: 1000;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.04);
        }

        .nav-container {
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          justify-content: space-around;
          align-items: center;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-muted);
          flex: 1;
          position: relative;
          transition: all 0.2s ease;
          padding: 0.5rem 0;
          border-radius: var(--radius-lg);
        }

        .nav-item span {
          font-size: 0.6rem;
          font-family: var(--font-main);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .nav-item.active {
          color: var(--primary);
          background: var(--tertiary);
        }

        .nav-item:hover:not(.active) {
          color: var(--text-main);
        }
      `}</style>
    </nav>
  );
};

export default BottomNav;
