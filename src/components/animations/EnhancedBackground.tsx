import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Dense particle field with multiple layers
 * Creates depth and visual richness
 */
export const DenseParticleField = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    color: string;
  }>>([]);

  useEffect(() => {
    const colors = ['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];
    const newParticles = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Animated lines connecting particles
 * Creates network effect
 */
export const ConnectedLines = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full">
        {Array.from({ length: 20 }).map((_, i) => {
          const x1 = Math.random() * 100;
          const y1 = Math.random() * 100;
          const x2 = Math.random() * 100;
          const y2 = Math.random() * 100;
          
          return (
            <motion.line
              key={i}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="rgba(14, 165, 233, 0.2)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.5, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};

/**
 * Floating bubbles with glow effect
 */
export const GlowingBubbles = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => {
        const size = Math.random() * 100 + 50;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 15 + 10;
        
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              background: `radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }}
            animate={{
              y: [0, -200, 0],
              x: [0, Math.random() * 100 - 50, 0],
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * Rotating geometric shapes
 */
export const RotatingShapes = () => {
  const shapes = [
    { type: 'square', color: '#0EA5E9' },
    { type: 'circle', color: '#8B5CF6' },
    { type: 'triangle', color: '#EC4899' },
    { type: 'hexagon', color: '#F59E0B' },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 25 }).map((_, i) => {
        const shape = shapes[i % shapes.length];
        const size = Math.random() * 80 + 40;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: Math.random() * 20 + 15,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {shape.type === 'square' && (
              <div
                className="w-full h-full border-2"
                style={{ borderColor: shape.color, opacity: 0.3 }}
              />
            )}
            {shape.type === 'circle' && (
              <div
                className="w-full h-full rounded-full border-2"
                style={{ borderColor: shape.color, opacity: 0.3 }}
              />
            )}
            {shape.type === 'triangle' && (
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: `${size / 2}px solid transparent`,
                  borderRight: `${size / 2}px solid transparent`,
                  borderBottom: `${size}px solid ${shape.color}`,
                  opacity: 0.3,
                }}
              />
            )}
            {shape.type === 'hexagon' && (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <polygon
                  points="50 1 95 25 95 75 50 99 5 75 5 25"
                  fill="none"
                  stroke={shape.color}
                  strokeWidth="2"
                  opacity="0.3"
                />
              </svg>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

/**
 * Pulsing rings
 */
export const PulsingRings = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-primary"
          style={{
            width: 100 + i * 100,
            height: 100 + i * 100,
          }}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 0.8,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

/**
 * Shooting stars effect
 */
export const ShootingStars = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 10 }).map((_, i) => {
        const startX = Math.random() * 100;
        const startY = Math.random() * 50;
        
        return (
          <motion.div
            key={i}
            className="absolute w-1 h-20 bg-gradient-to-b from-primary to-transparent"
            style={{
              left: `${startX}%`,
              top: `${startY}%`,
              transform: 'rotate(45deg)',
            }}
            animate={{
              x: [0, 300],
              y: [0, 300],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 3,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * Complete enhanced background with all effects
 */
export const EnhancedBackground = () => {
  return (
    <>
      <DenseParticleField />
      <GlowingBubbles />
      <RotatingShapes />
      <ConnectedLines />
      <PulsingRings />
      <ShootingStars />
    </>
  );
};
