import { describe, expect, it } from 'vitest';
import { getContainedMediaRect } from '../utils/mediaLayout';

describe('getContainedMediaRect', () => {
  it('fits wide media inside a taller container', () => {
    expect(
      getContainedMediaRect(
        {
          top: 0,
          left: 0,
          width: 360,
          height: 640,
        },
        1600,
        900,
      ),
    ).toEqual({
      top: 218.75,
      left: 0,
      width: 360,
      height: 202.5,
      right: 360,
      bottom: 421.25,
    });
  });

  it('falls back to the container rect when dimensions are missing', () => {
    expect(
      getContainedMediaRect(
        {
          top: 12,
          left: 8,
          width: 320,
          height: 540,
        },
        0,
        0,
      ),
    ).toEqual({
      top: 12,
      left: 8,
      width: 320,
      height: 540,
      right: 328,
      bottom: 552,
    });
  });
});
