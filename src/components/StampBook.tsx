import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Book } from 'lucide-react';
import { isWithinRadius } from '../utils/geoUtils';
import type { Day, Media } from '../types';

interface StampBookProps {
  isOpen: boolean;
  onClose: () => void;
  days: Day[];
  media: Media[];
}

interface Stamp {
  id: string;
  name: string;
  kanji: string;
  color: string;
  secondaryColor?: string;
  center?: { lat: number; lng: number };
  radiusKm?: number;
}

const PREDEFINED_STAMPS: Stamp[] = [
  { 
    id: 'tokyo', name: 'Tokyo', kanji: '東', color: '#bc002d',
    center: { lat: 35.6895, lng: 139.6917 }, radiusKm: 15
  },
  { 
    id: 'kyoto', name: 'Kyoto', kanji: '京', color: '#1a237e',
    center: { lat: 35.0116, lng: 135.7681 }, radiusKm: 10
  },
  { 
    id: 'osaka', name: 'Osaka', kanji: '阪', color: '#1b5e20',
    center: { lat: 34.6937, lng: 135.5023 }, radiusKm: 12
  },
  { 
    id: 'okinawa', name: 'Okinawa', kanji: '沖', color: '#0097a7',
    center: { lat: 26.2124, lng: 127.6809 }, radiusKm: 40
  },
  { 
    id: 'nara', name: 'Nara', kanji: '奈', color: '#5d4037',
    center: { lat: 34.6851, lng: 135.8048 }, radiusKm: 8
  },
  { 
    id: 'kamakura', name: 'Kamakura', kanji: '鎌', color: '#004d40',
    center: { lat: 35.3190, lng: 139.5467 }, radiusKm: 7
  },
  { 
    id: 'nikko', name: 'Nikko', kanji: '日', color: '#e65100',
    center: { lat: 36.7199, lng: 139.6983 }, radiusKm: 12
  },
  { 
    id: 'uji', name: 'Uji', kanji: '宇', color: '#33691e',
    center: { lat: 34.8892, lng: 135.8077 }, radiusKm: 6
  },
];

const StampBook: React.FC<StampBookProps> = ({ isOpen, onClose, days, media }) => {
  // Lock scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const unlockedLocations = React.useMemo(() => {
    // 1. Check text-based locations from journal days
    const journalLocations = days
      .map((d) => d.location?.toLowerCase() || '')
      .filter((l) => l.length > 0);
    
    // 2. Extract coordinates from media
    const mediaCoords = media
      .filter((m) => m.latitude !== undefined && m.longitude !== undefined)
      .map((m) => ({ lat: m.latitude!, lng: m.longitude! }));

    return PREDEFINED_STAMPS.filter((stamp) => {
      // Check if text matches
      const textMatch = journalLocations.some((loc) => loc.includes(stamp.name.toLowerCase()));
      if (textMatch) return true;

      // Check if any photo is within the geofence
      if (stamp.center && stamp.radiusKm) {
        return mediaCoords.some((coord) => 
          isWithinRadius(coord.lat, coord.lng, stamp.center!.lat, stamp.center!.lng, stamp.radiusKm!)
        );
      }

      return false;
    }).map(s => s.id);
  }, [days, media]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="stamp-book-overlay">
          <motion.div 
            className="stamp-book-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div 
            className="stamp-book-modal"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="stamp-book-paper">
              <div className="stamp-book-header">
                <div className="header-icon">
                  <Book size={24} />
                </div>
                <div className="header-text">
                  <h2>Eki-Stamp Samling</h2>
                  <p>Minnen från platser du besökt i Japan</p>
                </div>
                <button className="close-btn" onClick={onClose}>
                  <X size={24} />
                </button>
              </div>

              <div className="stamp-grid">
                {PREDEFINED_STAMPS.map((stamp) => {
                  const isUnlocked = unlockedLocations.includes(stamp.id);
                  return (
                    <div 
                      key={stamp.id} 
                      className={`stamp-slot ${isUnlocked ? 'unlocked' : 'locked'}`}
                    >
                      <div className="stamp-circle-wrapper">
                        <div 
                          className="stamp-circle"
                          style={{ 
                            borderColor: isUnlocked ? stamp.color : '#ddd',
                            color: isUnlocked ? stamp.color : '#ccc'
                          }}
                        >
                          <span className="stamp-kanji">{stamp.kanji}</span>
                          <div className="stamp-inner-border" style={{ borderColor: isUnlocked ? stamp.color : '#eee' }} />
                        </div>
                      </div>
                      <span className="stamp-label">{stamp.name}</span>
                    </div>
                  );
                })}
              </div>

              <div className="stamp-book-footer">
                <p>Besök fler platser för att låsa upp fler stämplar</p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(unlockedLocations.length / PREDEFINED_STAMPS.length) * 100}%` }} 
                  />
                </div>
                <span className="progress-text">{unlockedLocations.length} av {PREDEFINED_STAMPS.length} stämplar samlade</span>
              </div>
            </div>
          </motion.div>

          <style>{`
            .stamp-book-overlay {
              position: fixed;
              inset: 0;
              z-index: 5000;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
            }

            .stamp-book-backdrop {
              position: absolute;
              inset: 0;
              background: rgba(10, 10, 10, 0.4);
              backdrop-filter: blur(12px);
            }

            .stamp-book-modal {
              position: relative;
              width: 100%;
              max-width: 600px;
              background: #fbfaf5; /* Washi paper-ish */
              border-radius: 24px;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.5);
            }

            .stamp-book-paper {
              padding: 2.5rem;
              background-image: 
                radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0);
              background-size: 24px 24px;
              position: relative;
            }

            .stamp-book-header {
              display: flex;
              align-items: center;
              gap: 1rem;
              margin-bottom: 2.5rem;
            }

            .header-icon {
              width: 48px;
              height: 48px;
              background: var(--primary);
              border-radius: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            }

            .header-text h2 {
              margin: 0;
              font-family: var(--font-heading);
              font-size: 1.5rem;
              color: var(--text-main);
            }

            .header-text p {
              margin: 0.25rem 0 0 0;
              font-size: 0.9rem;
              color: var(--text-dim);
            }

            .close-btn {
              margin-left: auto;
              background: transparent;
              color: var(--text-dim);
              padding: 0.5rem;
              border-radius: 50%;
              transition: all 0.2s;
            }

            .close-btn:hover {
              background: rgba(0,0,0,0.05);
              color: var(--text-main);
            }

            .stamp-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 2rem 1rem;
              margin-bottom: 3rem;
            }

            .stamp-slot {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.75rem;
              transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .stamp-slot.unlocked {
              transform: scale(1.05) rotate(${Math.floor(Math.random() * 6) - 3}deg);
            }

            .stamp-slot.locked {
              opacity: 0.5;
            }

            .stamp-circle-wrapper {
              position: relative;
              width: 80px;
              height: 80px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .stamp-circle {
              width: 70px;
              height: 70px;
              border: 3px solid;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              transition: all 0.5s ease;
            }

            .stamp-inner-border {
              position: absolute;
              inset: 4px;
              border: 1px solid;
              border-radius: 50%;
              opacity: 0.5;
            }

            .stamp-kanji {
              font-family: var(--font-heading);
              font-size: 1.8rem;
              font-weight: 700;
            }

            .stamp-label {
              font-size: 0.85rem;
              font-weight: 600;
              color: var(--text-main);
              text-align: center;
            }

            .locked .stamp-circle {
              border-style: dashed;
            }

            .locked .stamp-kanji {
              filter: grayscale(1);
              opacity: 0.2;
            }

            .stamp-book-footer {
              text-align: center;
              padding-top: 2rem;
              border-top: 1px dashed rgba(0,0,0,0.1);
            }

            .stamp-book-footer p {
              margin: 0 0 1rem 0;
              font-size: 0.85rem;
              color: var(--text-dim);
            }

            .progress-bar {
              width: 100%;
              height: 6px;
              background: rgba(0, 0, 0, 0.05);
              border-radius: 3px;
              margin-bottom: 0.75rem;
              overflow: hidden;
            }

            .progress-fill {
              height: 100%;
              background: var(--primary);
              border-radius: 3px;
              transition: width 1s cubic-bezier(0.19, 1, 0.22, 1);
            }

            .progress-text {
              font-size: 0.8rem;
              font-weight: 600;
              color: var(--text-dim);
            }

            @media (max-width: 600px) {
              .stamp-book-overlay {
                padding: 1rem;
              }
              .stamp-grid {
                grid-template-columns: repeat(3, 1fr);
                gap: 1.5rem 0.5rem;
              }
              .stamp-book-paper {
                padding: 1.5rem;
              }
              .stamp-circle-wrapper {
                width: 65px;
                height: 65px;
              }
              .stamp-circle {
                width: 60px;
                height: 60px;
              }
              .stamp-kanji {
                font-size: 1.5rem;
              }
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StampBook;
