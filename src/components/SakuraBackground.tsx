import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PETAL_COUNT = 30; // Slightly more for density

interface Petal {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  blur: number; // New: Depth of field effect
}

interface SakuraBackgroundProps {
  isDarkMode?: boolean;
}

const SakuraBackground: React.FC<SakuraBackgroundProps> = ({ isDarkMode = false }) => {
  const [petals] = useState<Petal[]>(() =>
    Array.from({ length: PETAL_COUNT }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 12,
      duration: 18 + Math.random() * 25,
      size: isDarkMode ? 4 + Math.random() * 8 : 8 + Math.random() * 18,
      rotation: Math.random() * 360,
      blur: Math.random() > 0.7 ? Math.random() * 3 : 0, 
    })),
  );

  return (
    <div className={`sakura-container ${isDarkMode ? 'dark-mode' : ''}`}>
      <AnimatePresence>
        {petals.map((petal) => (
          <motion.div
            key={petal.id}
            className="sakura-particle"
            initial={{ 
              top: '-10%', 
              left: `${petal.x}%`, 
              opacity: 0,
              rotate: petal.rotation,
              filter: `blur(${petal.blur}px)`
            }}
            animate={{ 
              top: '110%',
              left: [
                `${petal.x}%`, 
                `${petal.x + (Math.sin(petal.id) * 10)}%`, 
                `${petal.x + (Math.cos(petal.id) * 20)}%`
              ],
              opacity: isDarkMode ? [0, 0.8, 0.8, 0] : [0, 0.7, 0.7, 0],
              rotate: petal.rotation + 900
            }}
            transition={{
              duration: petal.duration,
              repeat: Infinity,
              delay: petal.delay,
              ease: "linear"
            }}
            style={{
              width: petal.size,
              height: isDarkMode ? petal.size : petal.size * 0.85,
              // Alternative colors for neon stars
              '--star-color': petal.id % 2 === 0 ? 'var(--primary)' : 'var(--secondary)',
            } as React.CSSProperties}
          />
        ))}
      </AnimatePresence>
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
          background: linear-gradient(135deg, #FFD1DC 0%, #FDE2E4 100%);
          border-radius: 100% 0% 100% 30% / 100% 30% 100% 0%;
          box-shadow: 0 4px 8px rgba(188, 0, 45, 0.05);
          transition: border-radius 0.5s ease;
        }

        .dark-mode .sakura-particle {
          background: var(--star-color);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--star-color), 0 0 20px var(--star-color);
        }
      `}</style>
    </div>
  );
};

export default SakuraBackground;
