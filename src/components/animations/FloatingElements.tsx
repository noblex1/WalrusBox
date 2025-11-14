import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface FloatingShape {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  shape: 'circle' | 'square' | 'triangle';
  opacity: number;
}

/**
 * Spline-inspired floating geometric shapes
 * Creates depth and visual interest
 */
export const FloatingElements = ({ count = 15 }: { count?: number }) => {
  const [shapes, setShapes] = useState<FloatingShape[]>([]);

  useEffect(() => {
    const newShapes: FloatingShape[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 100 + 50,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
      shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as any,
      opacity: Math.random() * 0.1 + 0.05,
    }));
    setShapes(newShapes);
  }, [count]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className="absolute"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            rotate: shape.shape === 'square' ? [0, 90, 0] : [0, 360, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: shape.delay,
          }}
        >
          {shape.shape === 'circle' && (
            <div
              className="w-full h-full rounded-full border-2 border-primary"
              style={{ opacity: shape.opacity }}
            />
          )}
          {shape.shape === 'square' && (
            <div
              className="w-full h-full border-2 border-accent"
              style={{ opacity: shape.opacity }}
            />
          )}
          {shape.shape === 'triangle' && (
            <div
              className="w-0 h-0 border-l-[50px] border-r-[50px] border-b-[86px] border-l-transparent border-r-transparent border-b-secondary"
              style={{ opacity: shape.opacity }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
};

/**
 * Sui Overflow-inspired flowing particles
 * Creates dynamic, flowing visual effects
 */
export const FlowingParticles = ({ count = 50 }: { count?: number }) => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const delay = Math.random() * 10;
        const duration = Math.random() * 15 + 10;
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;

        return (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full"
            style={{
              left: `${startX}%`,
              top: `${startY}%`,
              boxShadow: '0 0 10px rgba(14,165,233,0.5)',
            }}
            animate={{
              x: [0, Math.random() * 200 - 100],
              y: [0, Math.random() * 200 - 100],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
            }}
          />
        );
      })}
    </div>
  );
};
