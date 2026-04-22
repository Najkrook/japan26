import { useState, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { Image as ImageIcon, Loader2, X, Trash2, AlertTriangle } from 'lucide-react';
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
import StampBook from './components/StampBook';
import { useAdmin } from './hooks/useAdmin';
import { useDays } from './hooks/useDays';
import { useMediaActions } from './hooks/useMediaActions';
import { useUserName } from './hooks/useUserName';
import { useAllMedia } from './hooks/useAllMedia';
import { useMaintenance } from './hooks/useMaintenance';
import type { Media } from './types';
import { warmLightboxPhotos } from './utils/imagePreload';

function App() {
  const welcomeLabel = 'V\u00e4lkommen till resedagboken';
  const loadingMediaLabel = 'H\u00e4mtar minnen...';
  const { userName, saveUserName, hasName } = useUserName();
  const { isAdmin, canPost, authorizationError, loading: authLoading, loginWithGoogle } = useAdmin();
  const { days, loading: daysLoading, createDay, updateDay, deleteDay, ensureDay } = useDays();
  const { deleteMedia } = useMediaActions();
  const { media: allMedia } = useAllMedia();
  const { orphanedMedia, isCleaning, lastCleanCount, lastFailCount, cleanupOrphanedMedia } = useMaintenance(days, allMedia);

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<Media[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isStampBookOpen, setIsStampBookOpen] = useState(false);

  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('japan-journal-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('japan-journal-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Tab Hibernation Effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.title = 'Minnen från Japan... 🌸';
      } else {
        document.title = 'Jojje i Japan ⛩️';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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

      <SakuraBackground isDarkMode={theme === 'dark'} />
      <Header
        canPost={canPost}
        isAdminPanelOpen={isAdminPanelOpen}
        theme={theme}
        onToggleAdminPanel={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
        onLoginClick={() => setShowAdminLogin(true)}
        onHankoClick={() => setIsStampBookOpen(true)}
        onToggleTheme={toggleTheme}
      />

      <div style={{ display: activeTab === 'map' ? 'block' : 'none', height: '100%' }}>
        <MapTab isActive={activeTab === 'map'} onMediaOpen={handleOpenLightbox} />
      </div>

      <div style={{ display: activeTab === 'journal' ? 'block' : 'none' }}>
        <main
          className="main-content"
          aria-label={welcomeLabel}
          data-loading-copy={loadingMediaLabel}
        >
          <div className="ethereal-cover fade-in">
            <h1 className="hero-title-main">Japan</h1>
            <div className="hero-year-main">2026</div>
            <p className="hero-tagline">Följ äventyret i Japan 🌸🗾🍙</p>
            <p className="hero-description-small">
              わかったよ、君は自分で読めないものを翻訳するのが好きなんだね。君が頭がいいってわかるように、ニヤリとした絵文字を送ってくれ。
            </p>
          </div>

          <div className="content-container">
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

                      {isAdmin && orphanedMedia.length > 0 && (
                        <div className="maintenance-section">
                          <div className="maintenance-header">
                            <AlertTriangle size={16} className="warning-icon" />
                            <h4>Systemunderhåll</h4>
                          </div>
                          <p>Hittade {orphanedMedia.length} föräldralösa bilder som saknar en dag.</p>
                          <button
                            className="cleanup-btn"
                            onClick={() => {
                              if (window.confirm(`Vill du permanent radera ${orphanedMedia.length} bilder? Detta kan inte ångras.`)) {
                                cleanupOrphanedMedia();
                              }
                            }}
                            disabled={isCleaning}
                          >
                            <Trash2 size={16} />
                            {isCleaning ? 'Rensar...' : 'Rensa föräldralösa bilder'}
                          </button>
                        </div>
                      )}

                      {lastCleanCount !== null && (
                        <div className="maintenance-success fade-in">
                          {lastFailCount === null ? (
                            <>✅ {lastCleanCount} bilder har raderats permanent.</>
                          ) : (
                            <>
                              ⚠️ {lastCleanCount} raderade, {lastFailCount} misslyckades.
                              <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 400 }}>
                                Prova att rensa igen eller kontakta support om felet kvarstår.
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <section className="timeline-section">
              {days.length > 0 && (
                <>
                  <div className="timeline-track" />
                  <motion.div
                    className="timeline-fill"
                    style={{ scaleY, transformOrigin: 'top' }}
                  />
                </>
              )}
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
                      isActive={activeDayId === day.id}
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
                <div className="empty-state-card fade-in">
                  <div className="empty-icon-container">
                    <ImageIcon size={32} />
                  </div>
                  <h2>Ingen resa än</h2>
                  <p>Börja med att ladda upp bilder för att starta din journal.</p>
                  <button
                    className="add-first-memory-btn"
                    onClick={() => setIsAdminPanelOpen(true)}
                  >
                    <ImageIcon size={18} />
                    Lägg till första minnet
                  </button>
                </div>
              )}
            </section>
          </div>
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

      <StampBook
        isOpen={isStampBookOpen}
        onClose={() => setIsStampBookOpen(false)}
        days={days}
        media={allMedia}
      />

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
          background: var(--surface-color);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }
        .ethereal-cover {
          text-align: center;
          padding: 8rem 0 6rem;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-title-main {
          font-family: var(--font-heading);
          font-size: clamp(5rem, 15vw, 9rem);
          color: var(--primary);
          margin: 0;
          font-weight: 700;
          line-height: 1;
        }

        .hero-year-main {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 5vw, 3.5rem);
          color: var(--primary);
          letter-spacing: 0.6em;
          margin: 0.5rem 0 2rem;
          padding-left: 0.6em;
          font-weight: 700;
        }

        .hero-tagline {
          font-family: var(--font-heading);
          font-size: clamp(1.1rem, 1.8vw, 1.6rem);
          color: var(--text-dim);
          font-style: italic;
          margin-bottom: 0.5rem;
          opacity: 0.8;
        }

        .hero-description-small {
          font-family: var(--font-main);
          font-size: 1rem;
          color: var(--text-dim);
          opacity: 0.7;
          letter-spacing: 0.05em;
        }

        .empty-state-card {
          max-width: 600px;
          margin: 2rem auto;
          background: var(--surface-color);
          padding: 4rem 2rem;
          border-radius: 20px;
          box-shadow: var(--shadow-md);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px solid var(--border-color);
        }

        .empty-icon-container {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--primary-light);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          box-shadow: inset 0 2px 4px rgba(188, 0, 45, 0.05);
        }

        .empty-state-card h2 {
          font-family: var(--font-heading);
          font-size: 2rem;
          margin-bottom: 1rem;
          color: var(--text-main);
        }

        .empty-state-card p {
          color: var(--text-dim);
          margin-bottom: 2.5rem;
          max-width: 320px;
        }

        .add-first-memory-btn {
          background: var(--primary);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(188, 0, 45, 0.2);
        }

        .add-first-memory-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(188, 0, 45, 0.3);
          background: var(--primary-hover, #9E0026);
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

        .timeline-section {
          position: relative;
          max-width: 900px;
          margin: 0 auto;
          min-height: 400px;
        }

        .timeline-track {
          position: absolute;
          left: calc(3rem - 1px);
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--border-color);
          z-index: 0;
          opacity: 0.5;
        }

        .timeline-fill {
          position: absolute;
          left: calc(3rem - 1px);
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--primary);
          z-index: 1;
        }

        [data-theme='dark'] .timeline-fill {
          width: 2px;
          left: calc(3rem - 1px);
          background: linear-gradient(to bottom, var(--primary), var(--secondary));
          box-shadow: 0 0 15px var(--primary);
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
