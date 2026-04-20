import React from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, X } from 'lucide-react';
import { useComments } from '../hooks/useComments';
import type { Media } from '../types';
import { isImageUrlReady, preloadImageUrl, warmPhotoMedia } from '../utils/imagePreload';
import { getContainedMediaRect, type ContainedMediaRect } from '../utils/mediaLayout';
import {
  getCommentsSheetAction,
  getLightboxGestureAction,
  resolveGestureAxis,
  type CommentsSheetAction,
  type LightboxGestureAction,
  type LightboxGestureAxis,
} from '../utils/lightboxGestures';
import CommentSection from './CommentSection';

interface LightboxProps {
  item: Media;
  nextItem?: Media;
  prevItem?: Media;
  mediaIndex: number;
  mediaCount: number;
  userName: string;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

const LIGHTBOX_MOBILE_MEDIA_QUERY = '(max-width: 1024px)';

const MOBILE_HINT_STORAGE_KEY = 'japan-journey-lightbox-mobile-hint-dismissed';
type PhotoSlotRole = 'prev' | 'current' | 'next';
const MOBILE_CHROME_INSET = 10;
const MOBILE_LOADING_BAR_INSET = 14;

let lightboxScrollLockCount = 0;
let previousBodyOverflow = '';

const lockBodyScroll = () => {
  if (typeof document === 'undefined') {
    return;
  }

  if (lightboxScrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  lightboxScrollLockCount += 1;
};

const unlockBodyScroll = () => {
  if (typeof document === 'undefined' || lightboxScrollLockCount === 0) {
    return;
  }

  lightboxScrollLockCount -= 1;

  if (lightboxScrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
};

const useMobileLayout = () => {
  const [isMobileLayout, setIsMobileLayout] = React.useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia(LIGHTBOX_MOBILE_MEDIA_QUERY).matches;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(LIGHTBOX_MOBILE_MEDIA_QUERY);
    const updateLayout = (event?: MediaQueryListEvent) => {
      setIsMobileLayout(event?.matches ?? mediaQuery.matches);
    };

    updateLayout();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateLayout);

      return () => mediaQuery.removeEventListener('change', updateLayout);
    }

    mediaQuery.addListener(updateLayout);

    return () => mediaQuery.removeListener(updateLayout);
  }, []);

  return isMobileLayout;
};

const readHintDismissed = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.sessionStorage.getItem(MOBILE_HINT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const persistHintDismissed = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(MOBILE_HINT_STORAGE_KEY, '1');
  } catch {
    // ignore storage access issues
  }
};

const PhotoSlot: React.FC<{
  item: Media;
  role: PhotoSlotRole;
  isActive: boolean;
  isReady: boolean;
  activeDirection: 1 | -1 | 0;
  onReady: (id: string) => void;
}> = ({ item, role, isActive, isReady, activeDirection, onReady }) => {
  const photoThumbnailSrc = item.thumbnailUrl || item.url;
  const shouldShowPhotoLoader = isActive && !photoThumbnailSrc && !isReady;

  React.useEffect(() => {
    let isCancelled = false;

    if (!isReady) {
      preloadImageUrl(item.url)
        .then(() => {
          if (!isCancelled) {
            onReady(item.id);
          }
        })
        .catch(() => undefined);
    }

    return () => {
      isCancelled = true;
    };
  }, [isReady, item.id, item.url, onReady]);

  const slotClassName = [
    'lightbox-photo-slot',
    `role-${role}`,
    isActive ? 'is-active' : '',
    isActive && activeDirection === 1 ? 'enter-from-next' : '',
    isActive && activeDirection === -1 ? 'enter-from-prev' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={slotClassName}
      data-testid={`lightbox-photo-slot-${role}`}
      data-active={isActive}
      aria-hidden={!isActive}
    >
      {shouldShowPhotoLoader && (
        <div className="lightbox-photo-loading" data-testid="lightbox-photo-loading">
          <Loader2 className="spinner" size={28} />
        </div>
      )}

      {photoThumbnailSrc && (
        <img
          src={photoThumbnailSrc}
          alt=""
          aria-hidden="true"
          className={`lightbox-image lightbox-image-thumb ${isReady ? 'is-hidden' : ''}`}
          data-testid={isActive ? 'lightbox-photo-thumb' : undefined}
          loading="eager"
          decoding="async"
        />
      )}

      <img
        src={item.url}
        alt={item.fileName}
        className={`lightbox-image lightbox-image-full ${isReady ? 'is-visible' : ''}`}
        data-testid={isActive ? 'lightbox-photo-full' : undefined}
        data-loaded={isReady}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onLoad={() => onReady(item.id)}
      />
    </div>
  );
};

const Lightbox: React.FC<LightboxProps> = ({
  item,
  nextItem,
  prevItem,
  mediaIndex,
  mediaCount,
  userName,
  onClose,
  onNext,
  onPrev,
}) => {
  const isMobileLayout = useMobileLayout();
  const { comments, loading, addComment } = useComments(item.id);

  const [draftComment, setDraftComment] = React.useState('');
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = React.useState(false);
  const [photoReadyById, setPhotoReadyById] = React.useState<Record<string, boolean>>({});
  const [navigationDirection, setNavigationDirection] = React.useState<1 | -1 | 0>(0);
  const [controlsDimmed, setControlsDimmed] = React.useState(false);
  const [controlsPulse, setControlsPulse] = React.useState(0);
  const [showGestureHint, setShowGestureHint] = React.useState(() => !readHintDismissed());
  const [activeMediaRect, setActiveMediaRect] = React.useState<ContainedMediaRect | null>(null);

  const gestureAxisRef = React.useRef<LightboxGestureAxis>(null);
  const lightboxContentRef = React.useRef<HTMLDivElement | null>(null);
  const mediaCardRef = React.useRef<HTMLDivElement | null>(null);
  const canUseMobileGestures = isMobileLayout && !isCommentsOpen;
  const topRailClassName = `lightbox-mobile-rail ${controlsDimmed ? 'dimmed' : ''}`;
  const photoWindowItems = React.useMemo(
    () =>
      [
        prevItem?.type === 'photo' ? { role: 'prev' as const, item: prevItem } : null,
        item.type === 'photo' ? { role: 'current' as const, item } : null,
        nextItem?.type === 'photo' ? { role: 'next' as const, item: nextItem } : null,
      ].filter((slot): slot is { role: PhotoSlotRole; item: Media } => slot !== null),
    [item, nextItem, prevItem],
  );

  const markPhotoReady = React.useCallback((id: string) => {
    setPhotoReadyById((current) => {
      if (current[id]) {
        return current;
      }

      return {
        ...current,
        [id]: true,
      };
    });
  }, []);

  const dismissGestureHint = React.useCallback(() => {
    setShowGestureHint(false);
    persistHintDismissed();
  }, []);

  const updateActiveMediaRect = React.useCallback(() => {
    const contentRect = lightboxContentRef.current?.getBoundingClientRect();
    const mediaRect = mediaCardRef.current?.getBoundingClientRect();

    if (!contentRect || !mediaRect || mediaRect.width <= 0 || mediaRect.height <= 0) {
      setActiveMediaRect(null);
      return;
    }

    const containedRect = getContainedMediaRect(
      {
        top: mediaRect.top - contentRect.top,
        left: mediaRect.left - contentRect.left,
        width: mediaRect.width,
        height: mediaRect.height,
      },
      item.width,
      item.height,
    );

    setActiveMediaRect((current) => {
      if (
        current &&
        current.top === containedRect.top &&
        current.left === containedRect.left &&
        current.width === containedRect.width &&
        current.height === containedRect.height
      ) {
        return current;
      }

      return containedRect;
    });
  }, [item.height, item.width]);

  const registerMobileInteraction = React.useCallback(() => {
    setControlsDimmed(false);
    setControlsPulse((current) => current + 1);
    dismissGestureHint();
  }, [dismissGestureHint]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight' && onNext) {
        onNext();
      } else if (event.key === 'ArrowLeft' && onPrev) {
        onPrev();
      }
    };

    lockBodyScroll();
    window.addEventListener('keydown', onKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, onNext, onPrev]);

  React.useEffect(() => {
    if (!isMobileLayout) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setControlsDimmed(true);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [isMobileLayout, controlsPulse, isCommentsOpen]);

  React.useEffect(() => {
    if (!isMobileLayout || !showGestureHint) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShowGestureHint(false);
    }, 2400);

    return () => window.clearTimeout(timeoutId);
  }, [isMobileLayout, showGestureHint]);

  React.useLayoutEffect(() => {
    if (!isMobileLayout) {
      return undefined;
    }

    updateActiveMediaRect();

    const handleResize = () => updateActiveMediaRect();
    window.addEventListener('resize', handleResize);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            updateActiveMediaRect();
          })
        : null;

    if (resizeObserver && mediaCardRef.current) {
      resizeObserver.observe(mediaCardRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [isMobileLayout, item.id, item.height, item.width, updateActiveMediaRect]);

  React.useEffect(() => {
    if (item.type === 'photo') {
      warmPhotoMedia(item);
    }
    warmPhotoMedia(nextItem);
    warmPhotoMedia(prevItem);

    return undefined;
  }, [item, nextItem, prevItem]);

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!draftComment.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await addComment(userName, draftComment, item.dayId);
      setDraftComment('');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Kunde inte skicka kommentaren.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentsAction = React.useCallback(
    (action: CommentsSheetAction) => {
      if (action === 'open') {
        registerMobileInteraction();
        setIsCommentsOpen(true);
      } else if (action === 'close') {
        registerMobileInteraction();
        setIsCommentsOpen(false);
      }
    },
    [registerMobileInteraction],
  );

  const handleLightboxAction = React.useCallback(
    (action: LightboxGestureAction) => {
      if (action === 'next') {
        registerMobileInteraction();
        setNavigationDirection(1);
        onNext?.();
      } else if (action === 'prev') {
        registerMobileInteraction();
        setNavigationDirection(-1);
        onPrev?.();
      } else if (action === 'close') {
        registerMobileInteraction();
        onClose();
      }
    },
    [onClose, onNext, onPrev, registerMobileInteraction],
  );

  const handleMediaDragStart = () => {
    gestureAxisRef.current = null;
    registerMobileInteraction();
  };

  const handleMediaDirectionLock = (axis: 'x' | 'y') => {
    gestureAxisRef.current = axis;
  };

  const handleMediaPan = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!gestureAxisRef.current) {
      gestureAxisRef.current = resolveGestureAxis(info.offset.x, info.offset.y);
    }
  };

  const handleMediaPanEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const action = getLightboxGestureAction({
      axis: gestureAxisRef.current,
      offsetX: info.offset.x,
      offsetY: info.offset.y,
      velocityX: info.velocity.x,
      velocityY: info.velocity.y,
      mediaType: item.type,
      commentsOpen: isCommentsOpen,
    });

    gestureAxisRef.current = null;
    handleLightboxAction(action);
  };

  const handleSheetPeekDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const action = getCommentsSheetAction({
      isOpen: false,
      offsetY: info.offset.y,
      velocityY: info.velocity.y,
    });

    handleCommentsAction(action);
  };

  const handleSheetDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const action = getCommentsSheetAction({
      isOpen: true,
      offsetY: info.offset.y,
      velocityY: info.velocity.y,
    });

    handleCommentsAction(action);
  };

  const handleGoToNext = React.useCallback(() => {
    if (!onNext) {
      return;
    }

    registerMobileInteraction();
    setNavigationDirection(1);
    onNext();
  }, [onNext, registerMobileInteraction]);

  const handleGoToPrev = React.useCallback(() => {
    if (!onPrev) {
      return;
    }

    registerMobileInteraction();
    setNavigationDirection(-1);
    onPrev();
  }, [onPrev, registerMobileInteraction]);

  const isCurrentPhotoReady =
    item.type !== 'photo' || Boolean(photoReadyById[item.id] || isImageUrlReady(item.url));
  const activeChromeTop = activeMediaRect
    ? Math.max(activeMediaRect.top + MOBILE_CHROME_INSET, MOBILE_CHROME_INSET)
    : MOBILE_CHROME_INSET;
  const mobileCloseStyle: React.CSSProperties | undefined = activeMediaRect
    ? {
        top: `${activeChromeTop}px`,
        left: `${Math.max(activeMediaRect.left + MOBILE_CHROME_INSET, MOBILE_CHROME_INSET)}px`,
      }
    : undefined;
  const mobileCounterStyle: React.CSSProperties | undefined = activeMediaRect
    ? {
        top: `${activeChromeTop}px`,
        left: `${Math.max(activeMediaRect.right - MOBILE_CHROME_INSET, MOBILE_CHROME_INSET)}px`,
        right: 'auto',
        transform: 'translateX(-100%)',
      }
    : undefined;
  const mobileLoadingBarStyle: React.CSSProperties | undefined =
    activeMediaRect && item.type === 'photo' && !isCurrentPhotoReady
      ? {
          left: `${activeMediaRect.left + MOBILE_LOADING_BAR_INSET}px`,
          top: `${activeMediaRect.bottom - 8}px`,
          width: `${Math.max(activeMediaRect.width - MOBILE_LOADING_BAR_INSET * 2, 64)}px`,
        }
      : undefined;

  const mediaContent = (
    <>
      {item.type === 'video' ? (
        <video
          src={item.url}
          controls
          autoPlay
          playsInline
          poster={item.thumbnailUrl}
          className="lightbox-video"
          data-testid="lightbox-video"
        />
      ) : (
        <div className="lightbox-photo-frame-stack" data-testid="lightbox-photo-frame">
          {photoWindowItems.map(({ role, item: slotItem }) => (
            <PhotoSlot
              key={slotItem.id}
              item={slotItem}
              role={role}
              isActive={slotItem.id === item.id}
              isReady={Boolean(photoReadyById[slotItem.id] || isImageUrlReady(slotItem.url))}
              activeDirection={slotItem.id === item.id ? navigationDirection : 0}
              onReady={markPhotoReady}
            />
          ))}
        </div>
      )}
    </>
  );

  const metadata = (
    <>
      <div className="sidebar-header">
        {item.caption && <p className="caption">{item.caption}</p>}
      </div>

      <div className="sidebar-comments">
        <CommentSection
          comments={comments}
          loading={loading}
          error={submitError}
          draft={draftComment}
          isSubmitting={isSubmitting}
          onDraftChange={setDraftComment}
          onSubmit={handleSubmitComment}
        />
      </div>
    </>
  );

  return (
    <motion.div
      className="lightbox-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      {!isMobileLayout && (
        <button className="lightbox-close" onClick={onClose} title={'St\u00e4ng'} type="button">
          <X size={32} />
        </button>
      )}

      <div className="lightbox-content" data-mobile-layout={isMobileLayout} ref={lightboxContentRef}>
        {isMobileLayout && (
          <div className={topRailClassName} data-testid="lightbox-mobile-status-rail">
            <button
              type="button"
              className="lightbox-rail-close"
              style={mobileCloseStyle}
              onClick={() => {
                registerMobileInteraction();
                onClose();
              }}
              aria-label={'St\u00e4ng lightbox'}
            >
              <X size={18} />
            </button>
            <div
              className="lightbox-rail-counter"
              data-testid="lightbox-mobile-counter"
              style={mobileCounterStyle}
            >
              {`${mediaIndex + 1} / ${mediaCount}`}
            </div>
          </div>
        )}

        <div
          className={`lightbox-media-container ${isMobileLayout ? 'mobile' : 'desktop'}`}
          onClick={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            className={`lightbox-media-stage ${canUseMobileGestures ? 'is-draggable' : ''}`}
            data-testid="lightbox-media-stage"
            whileTap={canUseMobileGestures ? { scale: 0.996 } : undefined}
            onPanStart={canUseMobileGestures ? handleMediaDragStart : undefined}
            onDirectionLock={canUseMobileGestures ? handleMediaDirectionLock : undefined}
            onPan={canUseMobileGestures ? handleMediaPan : undefined}
            onPanEnd={canUseMobileGestures ? handleMediaPanEnd : undefined}
          >
            <div className="lightbox-media-card" data-testid="lightbox-media-card" ref={mediaCardRef}>
              {mediaContent}
            </div>
          </motion.div>

          {isMobileLayout && item.type === 'photo' && !isCurrentPhotoReady && mobileLoadingBarStyle && (
            <div
              className="lightbox-photo-progress"
              data-testid="lightbox-photo-progress"
              style={mobileLoadingBarStyle}
            >
              <span className="lightbox-photo-progress-bar" />
            </div>
          )}

          {!isMobileLayout && onPrev && (
            <button className="nav-btn prev" onClick={handleGoToPrev} type="button">
              <ChevronLeft size={32} />
            </button>
          )}
          {!isMobileLayout && onNext && (
            <button className="nav-btn next" onClick={handleGoToNext} type="button">
              <ChevronRight size={32} />
            </button>
          )}

          {isMobileLayout && !isCommentsOpen && (
            <>
              {onPrev && (
                <button
                  type="button"
                  className="lightbox-tap-zone left"
                  data-testid="lightbox-tap-zone-left"
                  aria-label={'F\u00f6reg\u00e5ende media'}
                  onClick={handleGoToPrev}
                />
              )}
              {onNext && (
                <button
                  type="button"
                  className="lightbox-tap-zone right"
                  data-testid="lightbox-tap-zone-right"
                  aria-label={'N\u00e4sta media'}
                  onClick={handleGoToNext}
                />
              )}
            </>
          )}

          {isMobileLayout && showGestureHint && (
            <div className="lightbox-gesture-hint" data-testid="lightbox-mobile-hint">
              {'Svep f\u00f6r att byta \u2022 dra ned f\u00f6r att st\u00e4nga'}
            </div>
          )}

          {isMobileLayout && !isCommentsOpen && (
            <motion.button
              type="button"
              className="lightbox-sheet-peek"
              data-testid="lightbox-mobile-comments-peek"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.14}
              onDragStart={registerMobileInteraction}
              onDragEnd={handleSheetPeekDragEnd}
              onClick={() => handleCommentsAction('open')}
            >
              <span className="sheet-peek-handle" />
              <span className="sheet-peek-label">
                <MessageCircle size={16} />
                {'Kommentarer'}
              </span>
              <strong>{comments.length}</strong>
            </motion.button>
          )}
        </div>

        {!isMobileLayout && (
          <div className="lightbox-sidebar" data-testid="lightbox-desktop-sidebar">
            {metadata}
          </div>
        )}

        <AnimatePresence>
          {isMobileLayout && isCommentsOpen && (
            <motion.div
              className="lightbox-mobile-sheet"
              data-testid="lightbox-mobile-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.12}
              onDragStart={registerMobileInteraction}
              onDragEnd={handleSheetDragEnd}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="mobile-sheet-handle"
                data-testid="lightbox-mobile-sheet-handle"
                onClick={() => handleCommentsAction('close')}
                aria-label={'St\u00e4ng kommentarer'}
              />
              {metadata}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(249, 246, 241, 0.74);
          backdrop-filter: blur(15px);
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-close {
          position: absolute;
          top: 2rem;
          right: 2rem;
          color: var(--primary);
          opacity: 0.7;
          transition: all 0.2s;
          z-index: 30;
        }

        .lightbox-close:hover {
          opacity: 1;
          transform: scale(1.1) rotate(90deg);
        }

        .lightbox-content {
          position: relative;
          display: flex;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        .lightbox-mobile-rail {
          position: absolute;
          inset: 0;
          z-index: 35;
          pointer-events: none;
          transition: opacity 0.24s ease, transform 0.24s ease;
        }

        .lightbox-mobile-rail.dimmed {
          opacity: 0.58;
        }

        .lightbox-rail-close,
        .lightbox-rail-counter {
          position: absolute;
          pointer-events: auto;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          color: var(--primary);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.1);
        }

        .lightbox-rail-close {
          top: 0.75rem;
          left: 0.75rem;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-rail-counter {
          top: 0.75rem;
          right: 0.75rem;
          min-width: 4.5rem;
          text-align: center;
          border-radius: 999px;
          padding: 0.55rem 0.9rem;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .lightbox-media-container {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
        }

        .lightbox-media-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          overflow: hidden;
          touch-action: pan-y pinch-zoom;
          z-index: 1;
        }

        .lightbox-media-stage.is-draggable {
          cursor: grab;
        }

        .lightbox-media-stage.is-draggable:active {
          cursor: grabbing;
        }

        .lightbox-photo-frame {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-photo-frame-stack {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .lightbox-image,
        .lightbox-video {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          border-radius: 4px;
        }

        .lightbox-media-card {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-photo-slot {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s ease;
        }

        .lightbox-photo-slot.is-active {
          opacity: 1;
          z-index: 2;
        }

        .lightbox-photo-slot.enter-from-next {
          animation: lightboxPhotoEnterFromNext 0.22s ease;
        }

        .lightbox-photo-slot.enter-from-prev {
          animation: lightboxPhotoEnterFromPrev 0.22s ease;
        }

        @keyframes lightboxPhotoEnterFromNext {
          from {
            opacity: 0.82;
            transform: translateX(2.25%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes lightboxPhotoEnterFromPrev {
          from {
            opacity: 0.82;
            transform: translateX(-2.25%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .lightbox-photo-frame .lightbox-image,
        .lightbox-photo-slot .lightbox-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transition: opacity 0.24s ease, filter 0.24s ease, transform 0.24s ease;
        }

        .lightbox-image-thumb {
          opacity: 1;
          filter: blur(0px);
          transform: scale(1);
        }

        .lightbox-image-thumb.is-hidden {
          opacity: 0;
        }

        .lightbox-image-full {
          opacity: 0;
          transform: scale(1.01);
        }

        .lightbox-image-full.is-visible {
          opacity: 1;
          transform: scale(1);
        }

        .lightbox-photo-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(0, 0, 0, 0.08));
          border-radius: 4px;
          z-index: 1;
        }

        .lightbox-photo-progress {
          position: absolute;
          height: 3px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.32);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
          z-index: 12;
          pointer-events: none;
        }

        .lightbox-photo-progress-bar {
          display: block;
          width: 42%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(188, 0, 45, 0.35), rgba(188, 0, 45, 0.92));
          animation: lightboxProgressSlide 1s ease-in-out infinite;
        }

        @keyframes lightboxProgressSlide {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(260%);
          }
        }

        .spinner {
          animation: spin 1s linear infinite;
          color: rgba(255, 255, 255, 0.9);
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          color: var(--primary);
          opacity: 0.5;
          transition: all 0.3s;
          padding: 1rem;
          border-radius: 50%;
        }

        .nav-btn:hover {
          opacity: 1;
          background: rgba(188, 0, 45, 0.05);
          transform: translateY(-50%) scale(1.1);
        }

        .nav-btn.prev {
          left: 1rem;
        }

        .nav-btn.next {
          right: 1rem;
        }

        .lightbox-sidebar,
        .lightbox-mobile-sheet {
          background: var(--surface-color);
          box-shadow: -10px 0 30px rgba(188, 0, 45, 0.03);
        }

        .lightbox-sidebar {
          width: 400px;
          height: 100%;
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--border-color);
          animation: slideLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideLeft {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .sidebar-header {
          padding: 2rem;
          border-bottom: 1px solid var(--border-color);
        }

        .sidebar-header h3 {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .captured-date {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .caption {
          margin-top: 0.75rem;
          color: var(--text-dim);
          line-height: 1.5;
        }

        .sidebar-comments {
          flex: 1;
          overflow-y: auto;
          padding: 0 2rem 2rem;
        }

        .lightbox-tap-zone {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 20%;
          z-index: 5;
          background: transparent;
        }

        .lightbox-tap-zone.left {
          left: 0;
        }

        .lightbox-tap-zone.right {
          right: 0;
        }

        .lightbox-gesture-hint {
          position: absolute;
          left: 50%;
          bottom: 6.25rem;
          transform: translateX(-50%);
          z-index: 28;
          background: rgba(255, 255, 255, 0.92);
          color: var(--text-main);
          border-radius: 999px;
          padding: 0.7rem 1rem;
          font-size: 0.82rem;
          font-weight: 600;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
          white-space: nowrap;
        }

        .lightbox-sheet-peek {
          position: absolute;
          left: 50%;
          bottom: 0.8rem;
          transform: translateX(-50%);
          z-index: 28;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.8rem 1rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.94);
          color: var(--primary);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(12px);
          min-width: 11rem;
          justify-content: center;
        }

        .sheet-peek-handle {
          position: absolute;
          top: 0.45rem;
          left: 50%;
          transform: translateX(-50%);
          width: 2.75rem;
          height: 0.25rem;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.12);
        }

        .sheet-peek-label {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.15rem;
        }

        .lightbox-sheet-peek strong {
          min-width: 1.4rem;
          height: 1.4rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: var(--primary);
          color: white;
          font-size: 0.78rem;
        }

        .lightbox-mobile-sheet {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 30;
          max-height: min(72vh, calc(100vh - 5rem));
          border-radius: 1.75rem 1.75rem 0 0;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mobile-sheet-handle {
          width: 3.5rem;
          height: 0.35rem;
          border-radius: 999px;
          background: var(--border-color);
          margin: 0.75rem auto 0;
          flex-shrink: 0;
        }

        @media (max-width: 1024px) {
          .lightbox-overlay {
            background: rgba(249, 246, 241, 0.56);
          }

          .lightbox-media-container.mobile {
            padding: 1rem;
            align-items: stretch;
            background: transparent;
          }

          .lightbox-media-container.mobile .lightbox-media-stage {
            height: calc(100vh - 2rem);
            padding: 0 0.9rem;
          }

          .lightbox-image,
          .lightbox-video {
            max-width: 100%;
            max-height: 100%;
            width: auto;
          }

          .lightbox-media-card {
            border-radius: 28px;
          }

          .lightbox-photo-frame,
          .lightbox-video {
            border-radius: 28px;
          }

          .lightbox-rail-close,
          .lightbox-rail-counter,
          .lightbox-sheet-peek {
            background: rgba(255, 255, 255, 0.72);
          }

          .sidebar-header {
            padding: 1.25rem 1.25rem 0.75rem;
          }

          .sidebar-comments {
            padding: 0 1.25rem 1.25rem;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default Lightbox;
