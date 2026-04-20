export interface RectLike {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ContainedMediaRect extends RectLike {
  right: number;
  bottom: number;
}

export const getContainedMediaRect = (
  container: RectLike,
  mediaWidth: number,
  mediaHeight: number,
): ContainedMediaRect => {
  if (
    container.width <= 0 ||
    container.height <= 0 ||
    mediaWidth <= 0 ||
    mediaHeight <= 0
  ) {
    return {
      top: container.top,
      left: container.left,
      width: container.width,
      height: container.height,
      right: container.left + container.width,
      bottom: container.top + container.height,
    };
  }

  const scale = Math.min(container.width / mediaWidth, container.height / mediaHeight);
  const width = mediaWidth * scale;
  const height = mediaHeight * scale;
  const left = container.left + (container.width - width) / 2;
  const top = container.top + (container.height - height) / 2;

  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
};
