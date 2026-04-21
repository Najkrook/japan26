import { useState, useCallback, useMemo } from 'react';
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

      {activeTab === 'map' ? (
        <MapTab onMediaOpen={handleOpenLightbox} />
      ) : (
        <main
          className="main-content"
          aria-label={welcomeLabel}
          data-loading-copy={loadingMediaLabel}
        >
          <div className="ethereal-cover fade-in">
            <h1 className="cover-title">Japan<br />2026</h1>
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
            <div className="loading-state">
              <Loader2 className="spinner" size={32} />
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
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence>
        {selectedMedia && (
          <Lightbox
            item={selectedMedia}
            nextItem={nextMediaItem ?? undefined}
            prevItem={prevMediaItem ?? undefined}
            mediaIndex={selectedMediaIndex ?? 0}
            mediaCount={lightboxMedia.length}
            userName={userName || 'Besökare'}
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
      </AnimatePresence>

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
          margin-bottom: 5rem;
          position: relative;
          z-index: 10;
        }

        .cover-title {
          font-family: var(--font-heading);
          font-size: 3.5rem;
          line-height: 1.1;
          color: var(--primary);
          margin-bottom: 1.5rem;
          letter-spacing: 0.02em;
        }

        .cover-description {
          font-family: var(--font-main);
          font-size: 1.05rem;
          line-height: 1.7;
          color: var(--text-dim);
          max-width: 80%;
          margin: 0 auto;
        }

        .empty-state-main {
          text-align: center;
          padding: 6rem 2rem;
          color: var(--text-muted);
        }

        .empty-icon-large {
          color: var(--secondary-dark);
          margin-bottom: 2rem;
          opacity: 0.5;
        }

        @media (max-width: 768px) {
          .cover-title {
            font-size: 2.75rem;
          }

          .cover-description {
            max-width: 95%;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
