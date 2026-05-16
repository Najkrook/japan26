import { useCallback, useEffect, useMemo, useRef } from 'react';

interface UseScrollAnchorOptions {
  activeDayId: string | null;
  observedDayIds: Set<string>;
}

const MIN_SCROLL_DELTA = 1;

export const useScrollAnchor = ({
  activeDayId,
  observedDayIds,
}: UseScrollAnchorOptions) => {
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const observedIdsRef = useRef<Set<string>>(new Set());
  const anchorTopRef = useRef<number | null>(null);
  const pendingAnchorTopRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isInteractingRef = useRef(false);
  const activeDayIdRef = useRef<string | null>(activeDayId);

  const trackedDayIds = useMemo(() => {
    const ids = new Set(observedDayIds);
    if (activeDayId) {
      ids.add(activeDayId);
    }

    return ids;
  }, [activeDayId, observedDayIds]);

  const resolveAnchorNode = useCallback(() => {
    const activeNode = activeDayIdRef.current
      ? sectionRefs.current.get(activeDayIdRef.current) ?? null
      : null;

    if (activeNode) {
      return activeNode;
    }

    const visibleNodes = Array.from(sectionRefs.current.values())
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      })
      .sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top);

    return visibleNodes[0] ?? sectionRefs.current.values().next().value ?? null;
  }, []);

  const updateAnchorTop = useCallback(() => {
    const anchorNode = resolveAnchorNode();
    anchorTopRef.current = anchorNode ? anchorNode.getBoundingClientRect().top : null;
  }, [resolveAnchorNode]);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current !== null) {
      return;
    }

    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;

      if (isInteractingRef.current) {
        return;
      }

      const baselineTop = pendingAnchorTopRef.current;
      const anchorNode = resolveAnchorNode();
      pendingAnchorTopRef.current = null;

      if (baselineTop === null || !anchorNode) {
        updateAnchorTop();
        return;
      }

      const newTop = anchorNode.getBoundingClientRect().top;
      const diff = newTop - baselineTop;

      if (Math.abs(diff) > MIN_SCROLL_DELTA) {
        window.scrollBy(0, diff);
      }

      window.requestAnimationFrame(() => {
        updateAnchorTop();
      });
    });
  }, [resolveAnchorNode, updateAnchorTop]);

  const queueCompensation = useCallback(
    (baselineTop: number | null) => {
      if (baselineTop === null) {
        return;
      }

      if (pendingAnchorTopRef.current === null) {
        pendingAnchorTopRef.current = baselineTop;
      }

      scheduleFlush();
    },
    [scheduleFlush]
  );

  const shouldAffectAnchor = useCallback(
    (target: Element, anchorNode: HTMLDivElement) =>
      target === anchorNode ||
      Boolean(target.compareDocumentPosition(anchorNode) & Node.DOCUMENT_POSITION_FOLLOWING),
    []
  );

  const registerSectionRef = useCallback(
    (dayId: string, node: HTMLDivElement | null) => {
      const currentNode = sectionRefs.current.get(dayId) ?? null;

      if (currentNode && currentNode !== node) {
        resizeObserverRef.current?.unobserve(currentNode);
        sectionRefs.current.delete(dayId);
      }

      if (!node) {
        sectionRefs.current.delete(dayId);
        updateAnchorTop();
        return;
      }

      sectionRefs.current.set(dayId, node);

      if (resizeObserverRef.current && observedIdsRef.current.has(dayId)) {
        resizeObserverRef.current.observe(node);
      }

      updateAnchorTop();
    },
    [updateAnchorTop]
  );

  useEffect(() => {
    activeDayIdRef.current = activeDayId;
    updateAnchorTop();
  }, [activeDayId, updateAnchorTop]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const anchorNode = resolveAnchorNode();
      const baselineTop = anchorTopRef.current ?? anchorNode?.getBoundingClientRect().top ?? null;

      if (!anchorNode || baselineTop === null) {
        updateAnchorTop();
        return;
      }

      const relevantEntries = entries.filter((entry) => shouldAffectAnchor(entry.target, anchorNode));

      if (relevantEntries.length === 0) {
        return;
      }

      queueCompensation(baselineTop);
    });

    resizeObserverRef.current = observer;

    Array.from(sectionRefs.current.entries()).forEach(([dayId, node]) => {
      if (trackedDayIds.has(dayId)) {
        observer.observe(node);
      }
    });

    return () => {
      observer.disconnect();
      resizeObserverRef.current = null;
    };
  }, [queueCompensation, resolveAnchorNode, shouldAffectAnchor, trackedDayIds, updateAnchorTop]);

  useEffect(() => {
    observedIdsRef.current = trackedDayIds;

    if (!resizeObserverRef.current) {
      return;
    }

    resizeObserverRef.current.disconnect();

    Array.from(sectionRefs.current.entries()).forEach(([dayId, node]) => {
      if (trackedDayIds.has(dayId)) {
        resizeObserverRef.current?.observe(node);
      }
    });

    updateAnchorTop();
  }, [trackedDayIds, updateAnchorTop]);

  useEffect(() => {
    const handleScroll = () => {
      updateAnchorTop();
    };

    const startInteraction = () => {
      isInteractingRef.current = true;
    };

    const endInteraction = () => {
      isInteractingRef.current = false;

      if (pendingAnchorTopRef.current !== null) {
        scheduleFlush();
      } else {
        updateAnchorTop();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', startInteraction, { passive: true });
    window.addEventListener('touchend', endInteraction, { passive: true });
    window.addEventListener('touchcancel', endInteraction, { passive: true });
    window.addEventListener('pointerdown', startInteraction, { passive: true });
    window.addEventListener('pointerup', endInteraction, { passive: true });
    window.addEventListener('pointercancel', endInteraction, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', startInteraction);
      window.removeEventListener('touchend', endInteraction);
      window.removeEventListener('touchcancel', endInteraction);
      window.removeEventListener('pointerdown', startInteraction);
      window.removeEventListener('pointerup', endInteraction);
      window.removeEventListener('pointercancel', endInteraction);

      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [scheduleFlush, updateAnchorTop]);

  return {
    registerSectionRef,
  };
};
