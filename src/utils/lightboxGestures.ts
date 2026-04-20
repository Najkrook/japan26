import type { Media } from '../types';

export type LightboxGestureAction = 'next' | 'prev' | 'close' | 'none';
export type CommentsSheetAction = 'open' | 'close' | 'none';
export type LightboxGestureAxis = 'x' | 'y' | null;

export const MOBILE_GESTURE_AXIS_THRESHOLD = 14;
export const PHOTO_SWIPE_DISTANCE = 120;
export const PHOTO_SWIPE_VELOCITY = 700;
export const VIDEO_SWIPE_DISTANCE = 160;
export const VIDEO_SWIPE_VELOCITY = 900;
export const MOBILE_CLOSE_DISTANCE = 140;
export const MOBILE_CLOSE_VELOCITY = 950;
export const COMMENTS_SHEET_OPEN_DISTANCE = 48;
export const COMMENTS_SHEET_OPEN_VELOCITY = 700;
export const COMMENTS_SHEET_CLOSE_DISTANCE = 88;
export const COMMENTS_SHEET_CLOSE_VELOCITY = 850;

export const resolveGestureAxis = (
  offsetX: number,
  offsetY: number,
  threshold = MOBILE_GESTURE_AXIS_THRESHOLD,
): LightboxGestureAxis => {
  const absX = Math.abs(offsetX);
  const absY = Math.abs(offsetY);

  if (absX < threshold && absY < threshold) {
    return null;
  }

  return absX >= absY ? 'x' : 'y';
};

export const getLightboxGestureAction = ({
  axis,
  offsetX,
  offsetY,
  velocityX,
  velocityY,
  mediaType,
  commentsOpen,
}: {
  axis?: LightboxGestureAxis;
  offsetX: number;
  offsetY: number;
  velocityX: number;
  velocityY: number;
  mediaType: Media['type'];
  commentsOpen: boolean;
}): LightboxGestureAction => {
  const resolvedAxis = axis ?? resolveGestureAxis(offsetX, offsetY);

  if (!resolvedAxis) {
    return 'none';
  }

  if (resolvedAxis === 'x') {
    const swipeDistance = mediaType === 'video' ? VIDEO_SWIPE_DISTANCE : PHOTO_SWIPE_DISTANCE;
    const swipeVelocity = mediaType === 'video' ? VIDEO_SWIPE_VELOCITY : PHOTO_SWIPE_VELOCITY;
    const passedDistance = Math.abs(offsetX) >= swipeDistance;
    const passedVelocity = Math.abs(velocityX) >= swipeVelocity;

    if (!passedDistance && !passedVelocity) {
      return 'none';
    }

    if (offsetX < 0 || velocityX < 0) {
      return 'next';
    }

    return 'prev';
  }

  if (commentsOpen) {
    return 'none';
  }

  if (offsetY >= MOBILE_CLOSE_DISTANCE || velocityY >= MOBILE_CLOSE_VELOCITY) {
    return 'close';
  }

  return 'none';
};

export const getCommentsSheetAction = ({
  isOpen,
  offsetY,
  velocityY,
}: {
  isOpen: boolean;
  offsetY: number;
  velocityY: number;
}): CommentsSheetAction => {
  if (isOpen) {
    if (offsetY >= COMMENTS_SHEET_CLOSE_DISTANCE || velocityY >= COMMENTS_SHEET_CLOSE_VELOCITY) {
      return 'close';
    }

    return 'none';
  }

  if (offsetY <= -COMMENTS_SHEET_OPEN_DISTANCE || velocityY <= -COMMENTS_SHEET_OPEN_VELOCITY) {
    return 'open';
  }

  return 'none';
};
