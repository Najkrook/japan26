import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollAnchor } from '../hooks/useScrollAnchor';

type ResizeEntryTarget = Element & { dataset: DOMStringMap };

const positions = new Map<string, number>();
const observerInstances: MockResizeObserver[] = [];
let rafQueue: FrameRequestCallback[] = [];

class MockResizeObserver {
  public observed = new Set<Element>();
  public callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    observerInstances.push(this);
  }

  observe = vi.fn((target: Element) => {
    this.observed.add(target);
  });

  unobserve = vi.fn((target: Element) => {
    this.observed.delete(target);
  });

  disconnect = vi.fn(() => {
    this.observed.clear();
  });

  trigger(targets: ResizeEntryTarget[]) {
    this.callback(
      targets.map((target) => ({ target } as unknown as ResizeObserverEntry)),
      this as unknown as ResizeObserver
    );
  }
}

const flushRaf = () => {
  const queue = [...rafQueue];
  rafQueue = [];
  queue.forEach((callback) => callback(0));
};

const setDayTop = (dayId: string, top: number) => {
  positions.set(dayId, top);
};

const ScrollAnchorHarness = ({
  activeDayId,
  observedDayIds,
}: {
  activeDayId: string | null;
  observedDayIds: string[];
}) => {
  const { registerSectionRef } = useScrollAnchor({
    activeDayId,
    observedDayIds: new Set(observedDayIds),
  });

  return (
    <div>
      {['day-1', 'day-2', 'day-3'].map((dayId) => (
        <div
          key={dayId}
          data-testid={dayId}
          ref={(node) => {
            if (node) {
              Object.defineProperty(node, 'getBoundingClientRect', {
                configurable: true,
                value: () => {
                  const top = positions.get(dayId) ?? 0;
                  return {
                    top,
                    bottom: top + 200,
                    left: 0,
                    right: 300,
                    width: 300,
                    height: 200,
                    x: 0,
                    y: top,
                    toJSON: () => undefined,
                  };
                },
              });
            }

            registerSectionRef(dayId, node);
          }}
        />
      ))}
    </div>
  );
};

describe('useScrollAnchor', () => {
  beforeEach(() => {
    positions.clear();
    observerInstances.length = 0;
    rafQueue = [];

    setDayTop('day-1', 120);
    setDayTop('day-2', 360);
    setDayTop('day-3', 760);

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafQueue[id - 1] = () => undefined;
    });
    vi.stubGlobal('scrollBy', vi.fn());
    vi.stubGlobal('ResizeObserver', MockResizeObserver);

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 900,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('observes the active day together with the adjacent days', () => {
    render(<ScrollAnchorHarness activeDayId="day-2" observedDayIds={['day-1', 'day-3']} />);

    expect(observerInstances).toHaveLength(1);
    const observedTargets = Array.from(observerInstances[0].observed).map(
      (target) => (target as HTMLElement).dataset.testid
    );

    expect(observedTargets).toEqual(expect.arrayContaining(['day-1', 'day-2', 'day-3']));
  });

  it('compensates scroll when a section above the anchor grows', () => {
    render(<ScrollAnchorHarness activeDayId="day-2" observedDayIds={['day-1', 'day-3']} />);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    setDayTop('day-2', 470);

    act(() => {
      observerInstances[0].trigger([screen.getByTestId('day-1') as ResizeEntryTarget]);
      flushRaf();
    });

    expect(window.scrollBy).toHaveBeenCalledWith(0, 110);
  });

  it('ignores height changes that are too small to matter', () => {
    render(<ScrollAnchorHarness activeDayId="day-2" observedDayIds={['day-1', 'day-3']} />);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    setDayTop('day-2', 360.5);

    act(() => {
      observerInstances[0].trigger([screen.getByTestId('day-1') as ResizeEntryTarget]);
      flushRaf();
    });

    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('ignores height changes below the anchor', () => {
    render(<ScrollAnchorHarness activeDayId="day-2" observedDayIds={['day-1', 'day-3']} />);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    setDayTop('day-2', 520);

    act(() => {
      observerInstances[0].trigger([screen.getByTestId('day-3') as ResizeEntryTarget]);
      flushRaf();
    });

    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('batches multiple resize events in the same frame into one scroll adjustment', () => {
    render(<ScrollAnchorHarness activeDayId="day-2" observedDayIds={['day-1', 'day-3']} />);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    setDayTop('day-2', 440);

    act(() => {
      observerInstances[0].trigger([screen.getByTestId('day-1') as ResizeEntryTarget]);
      observerInstances[0].trigger([screen.getByTestId('day-1') as ResizeEntryTarget]);
      flushRaf();
    });

    expect(window.scrollBy).toHaveBeenCalledTimes(1);
    expect(window.scrollBy).toHaveBeenCalledWith(0, 80);
  });

  it('pauses compensation during active interaction and applies it afterwards', () => {
    render(<ScrollAnchorHarness activeDayId="day-2" observedDayIds={['day-1', 'day-3']} />);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('pointerdown'));
    });

    setDayTop('day-2', 430);

    act(() => {
      observerInstances[0].trigger([screen.getByTestId('day-1') as ResizeEntryTarget]);
      flushRaf();
    });

    expect(window.scrollBy).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event('pointerup'));
      flushRaf();
    });

    expect(window.scrollBy).toHaveBeenCalledWith(0, 70);
  });
});
