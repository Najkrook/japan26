import { useState, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { Image as ImageIcon, Loader2, X } from 'lucide-react';
import AdminLogin from './components/AdminLogin';
import DaySection from './components/DaySection';
import Header from './components/Header';
import Lightbox from './components/Lightbox';
import NamePrompt from './components/NamePrompt';
import SakuraBackground from './components/SakuraBackground';
import UploadPanel from './components/UploadPanel';
import DayEditor from './components/DayEditor';
import BottomNav, { type TabType } from './components/BottomNav';
import MapTab from './components/MapTab';
import { useAdmin } from './hooks/useAdmin';
import { useDays } from './hooks/useDays';
import { useMediaActions } from './hooks/useMediaActions';
import { useUserName } from './hooks/useUserName';
import type { Media } from './types';
import { warmLightboxPhotos } from './utils/imagePreload';

function App() {
  const welcomeLabel = 'V\u00e4lkommen till resedagboken';
  const loadingMediaLabel = 'H\u00e4mtar minnen...';
  const { userName, saveUserName, hasName } = useUserName();
  const { isAdmin, canPost, authorizationError, loading: authLoading, loginWithGoogle } = useAdmin();
  const { days, loading: daysLoading, createDay, updateDay, deleteDay, ensureDay } = useDays();
  const { deleteMedia } = useMediaActions();

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<Media[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Animated scroll progress for the timeline
  const { scrollYProgress } = useScroll();
  
  // Apply a gentle spring physics for buttery smooth mobile scrolling
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const selectedDay = useMemo(() =>
    days.find((day) => day.id === activeDayId) ?? days[0] ?? null
    , [days, activeDayId]);

  const selectedMedia = selectedMediaIndex !== null ? lightboxMedia[selectedMediaIndex] ?? null : null;
  const nextMediaItem =
    selectedMediaIndex !== null ? lightboxMedia[selectedMediaIndex + 1] ?? null : null;
  const prevMediaItem =
    selectedMediaIndex !== null ? lightboxMedia[selectedMediaIndex - 1] ?? null : null;

  // Cache the last selected media so the Lightbox stays mounted with the correct image when closed
  const [lastSelectedMedia, setLastSelectedMedia] = useState<Media | null>(null);
  useEffect(() => {
    if (selectedMedia) {
      setLastSelectedMedia(selectedMedia);
    }
  }, [selectedMedia]);

  const handleDayVisible = useCallback((dayId: string) => {
    setActiveDayId(dayId);
  }, []);

  const handleOpenLightbox = useCallback((mediaList: Media[], index: number) => {
    warmLightboxPhotos(mediaList, index);
    setLightboxMedia(mediaList);
    setSelectedMediaIndex(index);
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const authorizedProfile = await loginWithGoogle();
      if (authorizedProfile) setShowAdminLogin(false);
      else setLoginError('Saknar behörighet.');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      console.error('[Auth] Login failed:', firebaseError.code, firebaseError.message);
      setLoginError(`Inloggning misslyckades: ${firebaseError.code ?? 'Okänt fel'}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const activeLoginError = showAdminLogin ? authorizationError ?? loginError : null;

  if (authLoading) {
    return (
      <div className="app-container">
        <Header />
        <main className="main-content">
          <div className="loading-state">
            <Loader2 className="spinner" />
            <p>Startar Journalen...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <AnimatePresence>{!hasName && <NamePrompt onSave={saveUserName} />}</AnimatePresence>

      <SakuraBackground />
      <Header
        canPost={canPost}
        isAdminPanelOpen={isAdminPanelOpen}
        onToggleAdminPanel={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
        onLoginClick={() => setShowAdminLogin(true)}
      />

      <div style={{ display: activeTab === 'map' ? 'block' : 'none', height: '100%' }}>
        <MapTab onMediaOpen={handleOpenLightbox} />
      </div>
      
      <div style={{ display: activeTab === 'journal' ? 'block' : 'none' }}>
        <main
          className="main-content"
          aria-label={welcomeLabel}
          data-loading-copy={loadingMediaLabel}
        >
          <div className="ethereal-cover fade-in">
            <div className="cover-title-stack">
              <span className="cover-title">Japan</span>
              <span className="cover-year">2026</span>
            </div>
            <p className="cover-description">
              Följ vårt äventyr i Japan 🌸🗾🍙.
            </p>
          </div>

          <AnimatePresence>
          {canPost && isAdminPanelOpen && (
            <motion.div
              className="admin-panel-overlay fade-in"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="admin-content-card">
                <div className="admin-header">
                  <h3>Adminverktyg</h3>
                  <button onClick={() => setIsAdminPanelOpen(false)}><X size={20} /></button>
                </div>
                <div className="admin-body">
                  {isAdmin && (
                    <DayEditor
                      days={days}
                      selectedDay={selectedDay}
                      createDay={createDay}
                      updateDay={updateDay}
                      onSelectDay={(id) => setActiveDayId(id)}
                    />
                  )}
                  <UploadPanel
                    days={days}
                    selectedDay={selectedDay}
                    ensureDay={ensureDay}
                    onUploadComplete={(id) => setActiveDayId(id)}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="timeline-section">
          {/* Animated Timeline */}
          <div className="timeline-track" />
          <motion.div 
            className="timeline-fill" 
            style={{ scaleY, transformOrigin: 'top' }}
          />
          {daysLoading ? (
            <div className="ethereal-loading-state fade-in">
              <div className="sakura-spinner">🌸</div>
              <p>Hämtar tidslinjen...</p>
            </div>
          ) : days.length > 0 ? (
            <div className="days-list">
              {days.map((day) => (
                <DaySection
                  key={day.id}
                  day={day}
                  isAdmin={isAdmin}
                  canPost={canPost}
                  authorizationError={authorizationError}
                  onVisible={handleDayVisible}
                  onMediaClick={handleOpenLightbox}
                  onUpdateDay={updateDay}
                  onDeleteDay={deleteDay}
                  onDeleteMedia={deleteMedia}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state-main">
              <div className="empty-icon-large">
                <ImageIcon size={64} />
              </div>
              <h2>Ingen resa än</h2>
              <p>Börja med att ladda upp bilder för att starta din journal.</p>
            </div>
          )}
        </section>
      </main>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div 
        aria-hidden={!selectedMedia}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 3000,
          opacity: selectedMedia ? 1 : 0,
          visibility: selectedMedia ? 'visible' : 'hidden',
          pointerEvents: selectedMedia ? 'auto' : 'none',
          transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s'
        }}
      >
        {lastSelectedMedia && (
          <Lightbox
            item={selectedMedia || lastSelectedMedia}
            nextItem={nextMediaItem ?? undefined}
            prevItem={prevMediaItem ?? undefined}
            mediaIndex={selectedMediaIndex ?? 0}
            mediaCount={lightboxMedia.length}
            userName={userName || 'Besökare'}
            isOpen={!!selectedMedia}
            onClose={() => setSelectedMediaIndex(null)}
            onNext={
              selectedMediaIndex !== null && selectedMediaIndex < lightboxMedia.length - 1
                ? () => setSelectedMediaIndex((curr) => curr !== null ? curr + 1 : null)
                : undefined
            }
            onPrev={
              selectedMediaIndex !== null && selectedMediaIndex > 0
                ? () => setSelectedMediaIndex((curr) => curr !== null ? curr - 1 : null)
                : undefined
            }
          />
        )}
      </div>

      <AnimatePresence>
        {showAdminLogin && (
          <AdminLogin
            onLogin={handleLogin}
            onClose={() => setShowAdminLogin(false)}
            loading={loginLoading}
            error={activeLoginError}
          />
        )}
      </AnimatePresence>

      <style>{`
        .admin-panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(250, 249, 246, 0.9);
          backdrop-filter: blur(10px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .admin-content-card {
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: var(--radius-lg);
          padding: 2.5rem;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--glass-border);
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        }

        .ethereal-cover {
          text-align: center;
          margin-bottom: 8rem;
          margin-top: 4rem;
          position: relative;
          z-index: 10;
          /* Force centering within the narrow content column */
          margin-left: auto;
          margin-right: auto;
        }

        .cover-title-stack {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 0.9;
          margin-bottom: 2.5rem;
        }

        .cover-title {
          font-family: var(--font-heading);
          font-size: clamp(3.5rem, 8vw, 7rem);
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 700;
          /* Gradient: dark at top, red at bottom — fixed stop so red is reachable */
          background: linear-gradient(175deg, var(--text-main) 0%, var(--primary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: block;
        }

        .cover-year {
          font-family: var(--font-heading);
          font-size: clamp(2.5rem, 6.5vw, 6rem);
          line-height: 1;
          letter-spacing: -0.03em;
          font-weight: 400;
          font-style: italic;
          /* Year is in red — gives a clear two-tone effect */
          color: var(--primary);
          opacity: 0.85;
          display: block;
        }

        .cover-description {
          font-family: var(--font-main);
          font-size: clamp(1rem, 1.5vw, 1.2rem);
          line-height: 1.8;
          color: var(--text-dim);
          max-width: 480px;
          margin: 0 auto;
          font-style: italic;
          opacity: 0.85;
        }

        .empty-state-main {
          text-align: center;
          padding: 8rem 2rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.4);
          border-radius: var(--radius-lg);
          border: 1px solid var(--glass-border);
          backdrop-filter: blur(8px);
        }

        .empty-icon-large {
          color: var(--secondary);
          margin-bottom: 2rem;
          opacity: 0.6;
        }

        @media (max-width: 768px) {
          .ethereal-cover {
            margin-bottom: 5rem;
            margin-top: 2rem;
          }
          .cover-title {
            font-size: 3.5rem;
          }

          .cover-description {
            max-width: 90%;
            font-size: 1.05rem;
          }
        }

        .ethereal-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem;
          gap: 1.5rem;
        }

        .sakura-spinner {
          font-size: 2.5rem;
          animation: sakura-spin 3s ease-in-out infinite;
          filter: drop-shadow(0 0 12px rgba(188, 0, 45, 0.3));
        }

        @keyframes sakura-spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }

        .ethereal-loading-state p {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          color: var(--primary);
          letter-spacing: 0.05em;
          font-style: italic;
          animation: pulse-opacity 2s ease-in-out infinite;
        }

        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default App;
