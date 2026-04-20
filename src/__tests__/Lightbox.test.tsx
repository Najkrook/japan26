import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Lightbox from '../components/Lightbox';
import {
  getCommentsSheetAction,
  getLightboxGestureAction,
} from '../utils/lightboxGestures';
import { getContainedMediaRect } from '../utils/mediaLayout';
import type { Comment, Media } from '../types';

const mockUseComments = vi.fn();
const mockIsImageUrlReady = vi.fn();
const mockPreloadImageUrl = vi.fn();
const mockWarmPhotoMedia = vi.fn();

vi.mock('../hooks/useComments', () => ({
  useComments: (...args: unknown[]) => mockUseComments(...args),
}));

vi.mock('../utils/imagePreload', () => ({
  isImageUrlReady: (...args: unknown[]) => mockIsImageUrlReady(...args),
  preloadImageUrl: (...args: unknown[]) => mockPreloadImageUrl(...args),
  warmPhotoMedia: (...args: unknown[]) => mockWarmPhotoMedia(...args),
}));

vi.mock('framer-motion', async () => {
  const ReactModule = await import('react');

  const stripMotionProps = <T extends Record<string, unknown>>(props: T) => {
    const {
      animate,
      custom,
      drag,
      dragConstraints,
      dragDirectionLock,
      dragElastic,
      dragMomentum,
      exit,
      initial,
      layout,
      mode,
      onPan,
      onPanEnd,
      onPanStart,
      onDirectionLock,
      transition,
      variants,
      whileTap,
      whileDrag,
      ...domProps
    } = props;

    void animate;
    void custom;
    void drag;
    void dragConstraints;
    void dragDirectionLock;
    void dragElastic;
    void dragMomentum;
    void exit;
    void initial;
    void layout;
    void mode;
    void onPan;
    void onPanEnd;
    void onPanStart;
    void onDirectionLock;
    void transition;
    void variants;
    void whileTap;
    void whileDrag;

    return domProps;
  };

  const MotionDiv = ReactModule.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...props }, ref) => (
      <div ref={ref} {...stripMotionProps(props)}>
        {children}
      </div>
    ),
  );

  const MotionButton = ReactModule.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >(({ children, ...props }, ref) => (
    <button ref={ref} {...stripMotionProps(props)}>
      {children}
    </button>
  ));

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      button: MotionButton,
      div: MotionDiv,
    },
  };
});

const mediaItem: Media = {
  id: 'media-1',
  dayId: 'day-1',
  type: 'photo',
  url: 'https://example.com/photo.jpg',
  thumbnailUrl: 'https://example.com/photo-thumb.jpg',
  storagePath: 'media/day-1/photo.jpg',
  fileName: 'tokyo.jpg',
  capturedAt: new Date('2026-04-15T12:00:00Z'),
  width: 1600,
  height: 900,
  caption: 'Shibuya crossing',
};

const nextPhoto: Media = {
  ...mediaItem,
  id: 'media-2',
  url: 'https://example.com/photo-2.jpg',
  thumbnailUrl: 'https://example.com/photo-2-thumb.jpg',
};

const prevPhoto: Media = {
  ...mediaItem,
  id: 'media-0',
  url: 'https://example.com/photo-0.jpg',
  thumbnailUrl: 'https://example.com/photo-0-thumb.jpg',
};

const videoItem: Media = {
  ...mediaItem,
  id: 'video-1',
  type: 'video',
  url: 'https://example.com/video.mp4',
  thumbnailUrl: 'https://example.com/video-poster.jpg',
  storagePath: 'media/day-1/video.mp4',
  fileName: 'tokyo.mp4',
};

const comments: Comment[] = [
  {
    id: 'comment-1',
    mediaId: 'media-1',
    dayId: 'day-1',
    author: 'Alice',
    text: 'Fantastisk bild',
    createdAt: new Date('2026-04-15T12:30:00Z'),
  },
  {
    id: 'comment-2',
    mediaId: 'media-1',
    dayId: 'day-1',
    author: 'Bob',
    text: 'Vilket ljus',
    createdAt: new Date('2026-04-15T13:30:00Z'),
  },
];

let isMobileLayout = false;
const defaultRect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  width: 360,
  height: 640,
  right: 360,
  bottom: 640,
  toJSON: () => undefined,
};

const installMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 1024px)' ? isMobileLayout : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const renderLightbox = (overrides: Partial<React.ComponentProps<typeof Lightbox>> = {}) =>
  render(
    <Lightbox
      item={mediaItem}
      nextItem={nextPhoto}
      prevItem={prevPhoto}
      mediaIndex={2}
      mediaCount={12}
      userName="Besokare"
      onClose={vi.fn()}
      onNext={vi.fn()}
      onPrev={vi.fn()}
      {...overrides}
    />,
  );

beforeEach(() => {
  isMobileLayout = false;
  installMatchMedia();
  window.sessionStorage.clear();
  document.body.style.overflow = '';
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => defaultRect);
  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: class ResizeObserver {
      constructor() {}

      observe() {}

      unobserve() {}

      disconnect() {}
    },
  });
  mockUseComments.mockReturnValue({
    comments,
    loading: false,
    addComment: vi.fn(),
  });
  mockIsImageUrlReady.mockReturnValue(false);
  mockPreloadImageUrl.mockReturnValue(new Promise(() => undefined));
  mockWarmPhotoMedia.mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mockUseComments.mockReset();
  mockIsImageUrlReady.mockReset();
  mockPreloadImageUrl.mockReset();
  mockWarmPhotoMedia.mockReset();
});

describe('Lightbox gesture helpers', () => {
  it('returns next and prev for horizontal swipe gestures', () => {
    expect(
      getLightboxGestureAction({
        offsetX: -160,
        offsetY: 12,
        velocityX: -100,
        velocityY: 0,
        mediaType: 'photo',
        commentsOpen: false,
      }),
    ).toBe('next');

    expect(
      getLightboxGestureAction({
        offsetX: 170,
        offsetY: 8,
        velocityX: 140,
        velocityY: 0,
        mediaType: 'photo',
        commentsOpen: false,
      }),
    ).toBe('prev');
  });

  it('closes on vertical drag only when comments are closed', () => {
    expect(
      getLightboxGestureAction({
        offsetX: 10,
        offsetY: 180,
        velocityX: 0,
        velocityY: 320,
        mediaType: 'photo',
        commentsOpen: false,
      }),
    ).toBe('close');

    expect(
      getLightboxGestureAction({
        offsetX: 10,
        offsetY: 180,
        velocityX: 0,
        velocityY: 320,
        mediaType: 'photo',
        commentsOpen: true,
      }),
    ).toBe('none');
  });

  it('opens and closes the comments sheet with vertical swipes', () => {
    expect(
      getCommentsSheetAction({
        isOpen: false,
        offsetY: -64,
        velocityY: -200,
      }),
    ).toBe('open');

    expect(
      getCommentsSheetAction({
        isOpen: true,
        offsetY: 104,
        velocityY: 220,
      }),
    ).toBe('close');
  });
});

describe('Lightbox', () => {
  it('shows desktop sidebar above 1024px and hides the mobile chrome', () => {
    renderLightbox();

    expect(screen.queryByTestId('lightbox-desktop-sidebar')).not.toBeNull();
    expect(screen.queryByTestId('lightbox-mobile-status-rail')).toBeNull();
    expect(screen.queryByTestId('lightbox-mobile-comments-peek')).toBeNull();
  });

  it('shows status rail and current media index on mobile', () => {
    isMobileLayout = true;
    installMatchMedia();

    renderLightbox();

    expect(screen.getByTestId('lightbox-mobile-status-rail')).not.toBeNull();
    expect(screen.getByTestId('lightbox-mobile-counter').textContent).toBe('3 / 12');
  });

  it('anchors the mobile chrome to the rendered image bounds', () => {
    isMobileLayout = true;
    installMatchMedia();

    renderLightbox();

    const containedRect = getContainedMediaRect(defaultRect, mediaItem.width, mediaItem.height);
    const closeButton = screen.getByLabelText('St\u00e4ng lightbox');
    const counter = screen.getByTestId('lightbox-mobile-counter');

    expect(closeButton.getAttribute('style')).toContain(`top: ${containedRect.top + 10}px`);
    expect(closeButton.getAttribute('style')).toContain(`left: ${containedRect.left + 10}px`);
    expect(counter.getAttribute('style')).toContain(`top: ${containedRect.top + 10}px`);
    expect(counter.getAttribute('style')).toContain(`left: ${containedRect.right - 10}px`);
  });

  it('uses the same comment data for the mobile count and the comment list', () => {
    isMobileLayout = true;
    installMatchMedia();

    renderLightbox();

    const commentsPeek = screen.getByTestId('lightbox-mobile-comments-peek');
    expect(commentsPeek.textContent).toContain('2');

    fireEvent.click(commentsPeek);

    expect(screen.queryByTestId('lightbox-desktop-sidebar')).toBeNull();
    expect(screen.queryByTestId('lightbox-mobile-sheet')).not.toBeNull();
    expect(screen.getByTestId('lightbox-comment-count').textContent).toContain('(2)');
    expect(screen.getByText('Alice')).not.toBeNull();
    expect(screen.getByText('Bob')).not.toBeNull();
  });

  it('shows the thumbnail immediately and fades in the full photo after load', () => {
    isMobileLayout = true;
    installMatchMedia();
    renderLightbox();

    const thumb = screen.getByTestId('lightbox-photo-thumb');
    const full = screen.getByTestId('lightbox-photo-full');

    expect(thumb).not.toBeNull();
    expect(full.getAttribute('data-loaded')).toBe('false');
    expect(mockPreloadImageUrl).toHaveBeenCalledWith(mediaItem.url);
    expect(screen.getByTestId('lightbox-photo-progress')).not.toBeNull();

    fireEvent.load(full);

    expect(screen.getByTestId('lightbox-photo-full').getAttribute('data-loaded')).toBe('true');
    expect(screen.queryByTestId('lightbox-photo-progress')).toBeNull();
  });

  it('preloads adjacent photos when the active photo is shown', () => {
    renderLightbox();

    expect(mockWarmPhotoMedia).toHaveBeenCalledWith(nextPhoto);
    expect(mockWarmPhotoMedia).toHaveBeenCalledWith(prevPhoto);
  });

  it('keeps the existing video poster flow', () => {
    renderLightbox({
      item: videoItem,
      nextItem: undefined,
      prevItem: undefined,
    });

    const video = screen.getByTestId('lightbox-video');

    expect(video.getAttribute('poster')).toBe(videoItem.thumbnailUrl);
    expect(mockPreloadImageUrl).not.toHaveBeenCalled();
  });

  it('uses the left and right tap zones as navigation backups on mobile', () => {
    isMobileLayout = true;
    installMatchMedia();
    const onNext = vi.fn();
    const onPrev = vi.fn();

    renderLightbox({ onNext, onPrev });

    fireEvent.click(screen.getByTestId('lightbox-tap-zone-left'));
    fireEvent.click(screen.getByTestId('lightbox-tap-zone-right'));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does not render the old mobile preview layer in static snap mode', () => {
    isMobileLayout = true;
    installMatchMedia();

    renderLightbox();

    expect(screen.queryByTestId('lightbox-mobile-preview-prev')).toBeNull();
    expect(screen.queryByTestId('lightbox-mobile-preview-next')).toBeNull();
    expect(screen.getByTestId('lightbox-photo-slot-prev').getAttribute('data-active')).toBe('false');
    expect(screen.getByTestId('lightbox-photo-slot-current').getAttribute('data-active')).toBe('true');
    expect(screen.getByTestId('lightbox-photo-slot-next').getAttribute('data-active')).toBe('false');
  });

  it('shows the mobile hint once and dismisses it after interaction', () => {
    isMobileLayout = true;
    installMatchMedia();
    const onNext = vi.fn();

    renderLightbox({ onNext });

    expect(screen.queryByTestId('lightbox-mobile-hint')).not.toBeNull();

    fireEvent.click(screen.getByTestId('lightbox-tap-zone-right'));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('lightbox-mobile-hint')).toBeNull();
  });

  it('keeps a previously visited photo ready when navigating back to it', () => {
    mockIsImageUrlReady.mockReturnValue(false);
    const view = renderLightbox();

    fireEvent.load(screen.getByTestId('lightbox-photo-full'));
    expect(screen.getByTestId('lightbox-photo-full').getAttribute('data-loaded')).toBe('true');

    view.rerender(
      <Lightbox
        item={nextPhoto}
        nextItem={undefined}
        prevItem={mediaItem}
        mediaIndex={3}
        mediaCount={12}
        userName="Besokare"
        onClose={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />,
    );

    expect(screen.getByTestId('lightbox-photo-full').getAttribute('src')).toBe(nextPhoto.url);
    expect(screen.getByTestId('lightbox-photo-full').getAttribute('data-loaded')).toBe('false');

    view.rerender(
      <Lightbox
        item={mediaItem}
        nextItem={nextPhoto}
        prevItem={prevPhoto}
        mediaIndex={2}
        mediaCount={12}
        userName="Besokare"
        onClose={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />,
    );

    expect(screen.getByTestId('lightbox-photo-full').getAttribute('src')).toBe(mediaItem.url);
    expect(screen.getByTestId('lightbox-photo-full').getAttribute('data-loaded')).toBe('true');
  });

  it('restores body scrolling after the lightbox remounts between images', () => {
    const firstRender = renderLightbox();
    expect(document.body.style.overflow).toBe('hidden');

    firstRender.unmount();
    renderLightbox({
      item: nextPhoto,
      nextItem: undefined,
      prevItem: mediaItem,
    });

    expect(document.body.style.overflow).toBe('hidden');

    cleanup();

    expect(document.body.style.overflow).toBe('');
  });
});
