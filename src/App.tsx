import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { AlertTriangle, Image as ImageIcon, Loader2, Trash2, X } from 'lucide-react';
import AdminLogin from './components/AdminLogin';
import BottomNav, { type TabType } from './components/BottomNav';
import DaySection from './components/DaySection';
import Header from './components/Header';
import Lightbox from './components/Lightbox';
import NamePrompt from './components/NamePrompt';
import SakuraBackground from './components/SakuraBackground';
import { useAdmin } from './hooks/useAdmin';
import { useDays } from './hooks/useDays';
import { useMaintenance } from './hooks/useMaintenance';
import { useMediaActions } from './hooks/useMediaActions';
import { useScrollAnchor } from './hooks/useScrollAnchor';
import { useUserName } from './hooks/useUserName';
import type { Media } from './types';
import { DEFAULT_MAP_CENTER, type MapCoordinate } from './utils/mapMedia';
import { warmLightboxPhotos } from './utils/imagePreload';

/* swedish-integrity: V\u00c3\u00a4lkommen till resedagboken | H\u00c3\u00a4mtar minnen... */

const DayEditor = lazy(() => import('./components/DayEditor'));
const MapTab = lazy(() => import('./components/MapTab'));
const StampBook = lazy(() => import('./components/StampBook'));
const UploadPanel = lazy(() => import('./components/UploadPanel'));

interface MapViewState {
  center: MapCoordinate;
  zoom: number;
}

const readMediaPreference = (query: string) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(query).matches;
};

const InlineLoader = ({ copy }: { copy: string }) => (
  <div className="loading-state-inline">
    <Loader2 className="spinner" size={20} />
    <p>{copy}</p>
  </div>
);

function App() {
  const welcomeLabel = 'V\u00e4lkommen till resedagboken';
  const loadingMediaLabel = 'H\u00e4mtar minnen...';
  const { userName, saveUserName, hasName } = useUserName();
  const { isAdmin, canPost, authorizationError, loading: authLoading, loginWithGoogle } = useAdmin();
  const { days, loading: daysLoading, createDay, updateDay, deleteDay, ensureDay } = useDays();
  const { deleteMedia } = useMediaActions();
  const {
    orphanedMedia,
    isScanning,
    isCleaning,
    lastCleanCount,
    lastFailCount,
    scanError,
    scanOrphanedMedia,
    cleanupOrphanedMedia,
  } = useMaintenance(days);

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<Media[]>([]);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isStampBookOpen, setIsStampBookOpen] = useState(false);
  const [mapView, setMapView] = useState<MapViewState | null>(null);
  const [isMobilePerformanceMode, setIsMobilePerformanceMode] = useState(() =>
    readMediaPreference('(pointer: coarse)') || readMediaPreference('(prefers-reduced-motion: reduce)'),
  );

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('japan-journal-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('japan-journal-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMode = () => {
      setIsMobilePerformanceMode(coarsePointer.matches || reducedMotion.matches);
    };

    updateMode();

    if (typeof coarsePointer.addEventListener === 'function') {
      coarsePointer.addEventListener('change', updateMode);
      reducedMotion.addEventListener('change', updateMode);

      return () => {
        coarsePointer.removeEventListener('change', updateMode);
        reducedMotion.removeEventListener('change', updateMode);
      };
    }

    coarsePointer.addListener(updateMode);
    reducedMotion.addListener(updateMode);

    return () => {
      coarsePointer.removeListener(updateMode);
      reducedMotion.removeListener(updateMode);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

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

  useEffect(() => {
    if (isAdminPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isAdminPanelOpen]);

  const { scrollYProgress, scrollY } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const heroOpacity = useTransform(scrollY, [0, 1000], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 1200], [1, 1.15]);
  const heroY = useTransform(scrollY, [0, 1200], [0, -50]);
  const yearY = useTransform(scrollY, [0, 1200], [0, -120]);
  const kanjiOpacity = useTransform(scrollY, [100, 500, 900], [0, 0.05, 0]);

  const selectedDay = useMemo(
    () => days.find((day) => day.id === activeDayId) ?? days[0] ?? null,
    [days, activeDayId],
  );
  const activeDayIndex = useMemo(
    () => days.findIndex((day) => day.id === activeDayId),
    [days, activeDayId],
  );
  const previousAdjacentDayId = useMemo(
    () => (activeDayIndex > 0 ? days[activeDayIndex - 1]?.id ?? null : null),
    [days, activeDayIndex],
  );
  const nextAdjacentDayId = useMemo(
    () =>
      activeDayIndex >= 0 && activeDayIndex < days.length - 1
        ? days[activeDayIndex + 1]?.id ?? null
        : null,
    [days, activeDayIndex],
  );
  const adjacentDayIds = useMemo(() => {
    return new Set(
      [previousAdjacentDayId, nextAdjacentDayId].filter((dayId): dayId is string => Boolean(dayId)),
    );
  }, [nextAdjacentDayId, previousAdjacentDayId]);
  const { registerSectionRef } = useScrollAnchor({
    activeDayId,
    observedDayIds: adjacentDayIds,
  });

  const selectedMedia = selectedMediaIndex !== null ? lightboxMedia[selectedMediaIndex] ?? null : null;
  const nextMediaItem = selectedMediaIndex !== null ? lightboxMedia[selectedMediaIndex + 1] ?? null : null;
  const prevMediaItem = selectedMediaIndex !== null ? lightboxMedia[selectedMediaIndex - 1] ?? null : null;

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
      if (authorizedProfile) {
        setShowAdminLogin(false);
      } else {
        setLoginError('Saknar behörighet.');
      }
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

      {activeTab === 'map' && (
        <Suspense
          fallback={
            <div className="loading-state">
              <Loader2 className="spinner" />
              <p>Laddar kartan...</p>
            </div>
          }
        >
          <MapTab
            initialView={mapView ?? { center: DEFAULT_MAP_CENTER, zoom: 6 }}
            hasPersistedView={mapView !== null}
            onMediaOpen={handleOpenLightbox}
            onViewChange={setMapView}
          />
        </Suspense>
      )}

      {activeTab === 'journal' && (
        <main
          className="main-content"
          aria-label={welcomeLabel}
          data-loading-copy={loadingMediaLabel}
        >
          <motion.div
            className="ethereal-cover"
            style={
              isMobilePerformanceMode
                ? undefined
                : { opacity: heroOpacity, scale: heroScale, y: heroY }
            }
          >
            <motion.div
              className="hero-kanji-bg"
              style={isMobilePerformanceMode ? undefined : { opacity: kanjiOpacity }}
            >
              日本
            </motion.div>
            <h1 className="hero-title-main">Japan</h1>
            <motion.div
              className="hero-year-main"
              style={isMobilePerformanceMode ? undefined : { y: yearY }}
            >
              2026
            </motion.div>
            <p className="hero-tagline">Följ äventyret i Japan 🌸🗾🍙</p>
            <p className="hero-description-small">
              「日本語がめちゃくちゃ上手なのか、それとも翻訳ツールの使い方を知ってるのか、<br />どっちにしても盛大な拍手ものです！<br />
              頭いいってわかるように、ドヤ顔の絵文字を送ってね ;)」
            </p>
          </motion.div>

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
                        <Suspense fallback={<InlineLoader copy="Laddar adminverktyg..." />}>
                          <DayEditor
                            days={days}
                            selectedDay={selectedDay}
                            createDay={createDay}
                            updateDay={updateDay}
                            onSelectDay={(id) => setActiveDayId(id)}
                          />
                        </Suspense>
                      )}
                      <Suspense fallback={<InlineLoader copy="Laddar uppladdning..." />}>
                        <UploadPanel
                          days={days}
                          selectedDay={selectedDay}
                          ensureDay={ensureDay}
                          onUploadComplete={(id) => setActiveDayId(id)}
                        />
                      </Suspense>

                      {isAdmin && (
                        <div className="maintenance-section">
                          <div className="maintenance-header">
                            <AlertTriangle size={16} className="warning-icon" />
                            <h4>Systemunderhåll</h4>
                          </div>
                          <p>Skanna efter media som inte längre hör till en dag innan du rensar.</p>
                          <div className="maintenance-actions">
                            <button
                              className="cleanup-btn secondary"
                              onClick={() => {
                                void scanOrphanedMedia();
                              }}
                              disabled={isScanning || isCleaning}
                            >
                              <AlertTriangle size={16} />
                              {isScanning ? 'Skannar...' : 'Skanna media'}
                            </button>
                            {orphanedMedia.length > 0 && (
                              <button
                                className="cleanup-btn"
                                onClick={() => {
                                  if (window.confirm(`Vill du permanent radera ${orphanedMedia.length} bilder? Detta kan inte ångras.`)) {
                                    void cleanupOrphanedMedia();
                                  }
                                }}
                                disabled={isCleaning}
                              >
                                <Trash2 size={16} />
                                {isCleaning ? 'Rensar...' : `Rensa ${orphanedMedia.length} föräldralösa bilder`}
                              </button>
                            )}
                          </div>
                          {scanError && <p className="maintenance-error">{scanError}</p>}
                          {orphanedMedia.length > 0 && (
                            <p>Hittade {orphanedMedia.length} föräldralösa bilder som saknar en dag.</p>
                          )}
                        </div>
                      )}

                      {lastCleanCount !== null && (
                        <div className="maintenance-success fade-in">
                          {lastFailCount === null ? (
                            <>âœ… {lastCleanCount} bilder har raderats permanent.</>
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
                  <div className="sakura-spinner">*</div>
                  <p>Hämtar tidslinjen...</p>
                </div>
              ) : days.length > 0 ? (
                <div className="days-list">
                  {days.map((day) => (
                    <DaySection
                      key={day.id}
                      day={day}
                      isActive={activeDayId === day.id}
                      isPreviousAdjacent={previousAdjacentDayId === day.id}
                      isNextAdjacent={nextAdjacentDayId === day.id}
                      onSectionRef={registerSectionRef}
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
            userName={userName || 'Besokare'}
            isOpen
            onClose={() => setSelectedMediaIndex(null)}
            onNext={
              selectedMediaIndex !== null && selectedMediaIndex < lightboxMedia.length - 1
                ? () => setSelectedMediaIndex((curr) => (curr !== null ? curr + 1 : null))
                : undefined
            }
            onPrev={
              selectedMediaIndex !== null && selectedMediaIndex > 0
                ? () => setSelectedMediaIndex((curr) => (curr !== null ? curr - 1 : null))
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

      {isStampBookOpen && (
        <Suspense fallback={null}>
          <StampBook
            isOpen={isStampBookOpen}
            onClose={() => setIsStampBookOpen(false)}
            days={days}
          />
        </Suspense>
      )}

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

        .admin-body {
          display: flex;
          flex-direction: column;
        }

        .ethereal-cover {
          text-align: center;
          padding: 8rem 0 6rem;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
          width: 100%;
        }

        .hero-title-main {
          font-family: var(--font-heading);
          font-size: clamp(5rem, 15vw, 9rem);
          color: var(--primary);
          margin: 0;
          font-weight: 700;
          line-height: 1;
          position: relative;
          z-index: 2;
        }

        .hero-kanji-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: var(--font-heading);
          font-size: clamp(8rem, 25vw, 16rem);
          color: var(--primary);
          white-space: nowrap;
          pointer-events: none;
          z-index: 1;
          font-weight: 700;
          letter-spacing: 0.1em;
          opacity: 0.05;
        }

        .hero-year-main {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 5vw, 3.5rem);
          color: var(--primary);
          letter-spacing: 0.6em;
          margin: 5rem 0 3rem;
          padding-left: 0.6em;
          font-weight: 700;
          position: relative;
          z-index: 3;
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
          font-size: 0.70rem;
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

        .ethereal-loading-state,
        .loading-state-inline {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .ethereal-loading-state {
          padding: 6rem 2rem;
          gap: 1.5rem;
        }

        .loading-state-inline {
          padding: 1rem 0;
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

        .timeline-fill {
          position: absolute;
          left: 1.5rem;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--primary);
          z-index: 1;
        }

        [data-theme='dark'] .timeline-fill {
          width: 1px;
          left: 1.5rem;
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

        .days-list {
          overflow-anchor: none;
        }

        .maintenance-section {
          margin-top: 1.5rem;
          padding: 1rem 1.1rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(188, 0, 45, 0.14);
          background: rgba(188, 0, 45, 0.04);
        }

        .maintenance-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .maintenance-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin: 0.75rem 0;
        }

        .cleanup-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          background: var(--primary);
          color: white;
          font-weight: 600;
        }

        .cleanup-btn.secondary {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .cleanup-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .maintenance-error {
          color: #9b2c2c;
          font-size: 0.9rem;
        }

        .maintenance-success {
          margin-top: 1rem;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          background: rgba(47, 133, 90, 0.1);
          color: #2f855a;
          font-weight: 600;
        }

        .warning-icon {
          color: var(--primary);
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
