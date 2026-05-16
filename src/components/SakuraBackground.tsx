import React from 'react';

interface Petal {
  id: number;
  x: number;
  driftA: number;
  driftB: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  blur: number;
}

interface SakuraBackgroundProps {
  isDarkMode?: boolean;
}

const getViewportPreferences = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return {
      isMobile: false,
      prefersReducedMotion: false,
    };
  }

  return {
    isMobile: window.matchMedia('(pointer: coarse)').matches,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
};

const buildPetals = (count: number, isDarkMode: boolean, allowBlur: boolean): Petal[] =>
  Array.from({ length: count }).map((_, index) => ({
    id: index,
    x: Math.random() * 100,
    driftA: (Math.random() * 16) - 8,
    driftB: (Math.random() * 28) - 14,
    delay: Math.random() * 12,
    duration: 18 + Math.random() * 25,
    size: isDarkMode ? 4 + Math.random() * 8 : 8 + Math.random() * 18,
    rotation: Math.random() * 360,
    blur: allowBlur && Math.random() > 0.7 ? Math.random() * 3 : 0,
  }));

const SakuraBackground: React.FC<SakuraBackgroundProps> = ({ isDarkMode = false }) => {
  const [{ isMobile, prefersReducedMotion }, setPreferences] = React.useState(getViewportPreferences);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreferences = () => {
      setPreferences({
        isMobile: coarsePointer.matches,
        prefersReducedMotion: reducedMotion.matches,
      });
    };

    updatePreferences();

    if (typeof coarsePointer.addEventListener === 'function') {
      coarsePointer.addEventListener('change', updatePreferences);
      reducedMotion.addEventListener('change', updatePreferences);

      return () => {
        coarsePointer.removeEventListener('change', updatePreferences);
        reducedMotion.removeEventListener('change', updatePreferences);
      };
    }

    coarsePointer.addListener(updatePreferences);
    reducedMotion.addListener(updatePreferences);

    return () => {
      coarsePointer.removeListener(updatePreferences);
      reducedMotion.removeListener(updatePreferences);
    };
  }, []);

  const petals = React.useMemo(() => {
    if (prefersReducedMotion) {
      return [];
    }

    return buildPetals(isMobile ? 12 : 24, isDarkMode, !isMobile);
  }, [isDarkMode, isMobile, prefersReducedMotion]);

  if (prefersReducedMotion || petals.length === 0) {
    return null;
  }

  return (
    <div className={`sakura-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="sakura-particle"
          style={{
            width: petal.size,
            height: isDarkMode ? petal.size : petal.size * 0.85,
            left: `${petal.x}%`,
            animationDelay: `${petal.delay}s`,
            animationDuration: `${petal.duration}s`,
            filter: `blur(${petal.blur}px)`,
            transform: `translate3d(0, -10vh, 0) rotate(${petal.rotation}deg)`,
            ['--petal-drift-a' as string]: `${petal.driftA}vw`,
            ['--petal-drift-b' as string]: `${petal.driftB}vw`,
            ['--petal-rotation-end' as string]: `${petal.rotation + 900}deg`,
            ['--star-color' as string]: petal.id % 2 === 0 ? 'var(--primary)' : 'var(--secondary)',
          }}
        />
      ))}
      <style>{`
        .sakura-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
          background: transparent;
          transition: background 0.8s ease;
        }

        .sakura-particle {
          position: absolute;
          top: -12%;
          background: linear-gradient(135deg, #FFD1DC 0%, #FDE2E4 100%);
          border-radius: 100% 0% 100% 30% / 100% 30% 100% 0%;
          box-shadow: 0 4px 8px rgba(188, 0, 45, 0.05);
          animation: sakura-fall linear infinite;
          will-change: transform, opacity;
        }

        .dark-mode .sakura-particle {
          background: var(--star-color);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--star-color), 0 0 20px var(--star-color);
        }

        @keyframes sakura-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, -10vh, 0) rotate(0deg);
          }

          15% {
            opacity: 0.7;
          }

          65% {
            opacity: 0.7;
            transform: translate3d(var(--petal-drift-a), 55vh, 0) rotate(calc(var(--petal-rotation-end) * 0.55));
          }

          100% {
            opacity: 0;
            transform: translate3d(var(--petal-drift-b), 120vh, 0) rotate(var(--petal-rotation-end));
          }
        }
      `}</style>
    </div>
  );
};

export default SakuraBackground;
