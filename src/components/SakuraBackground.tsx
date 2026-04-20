import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PETAL_COUNT = 24;

interface Petal {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

const SakuraBackground: React.FC = () => {
  const [petals] = useState<Petal[]>(() =>
    Array.from({ length: PETAL_COUNT }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 20,
      size: 10 + Math.random() * 15,
      rotation: Math.random() * 360,
    })),
  );

  return (
    <div className="sakura-container">
      <AnimatePresence>
        {petals.map((petal) => (
          <motion.div
            key={petal.id}
            className="sakura-petal"
            initial={{ 
              top: '-5%', 
              left: `${petal.x}%`, 
              opacity: 0,
              rotate: petal.rotation 
            }}
            animate={{ 
              top: '105%',
              left: `${petal.x + (Math.sin(petal.id) * 15)}%`,
              opacity: [0, 0.8, 0.8, 0],
              rotate: petal.rotation + 720
            }}
            transition={{
              duration: petal.duration,
              repeat: Infinity,
              delay: petal.delay,
              ease: "linear"
            }}
            style={{
              width: petal.size,
              height: petal.size * 0.8,
            }}
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
        }

        .sakura-petal {
          position: absolute;
          background: linear-gradient(135deg, var(--secondary) 0%, var(--tertiary) 100%);
          border-radius: 100% 0% 100% 30% / 100% 30% 100% 0%;
          filter: blur(1px);
          box-shadow: 0 4px 10px rgba(235, 196, 208, 0.4);
        }
      `}</style>
    </div>
  );
};

export default SakuraBackground;
