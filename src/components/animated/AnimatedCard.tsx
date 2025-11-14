import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ReactNode, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
  tiltEnabled?: boolean;
}

/**
 * AnimatedCard - Interactive 3D card with tilt effect and glow
 * 
 * Features:
 * - 3D tilt on mouse move
 * - Dynamic glow effect
 * - Smooth spring animations
 * - Hover state management
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  glowColor = '#0EA5E9',
  intensity = 'medium',
  tiltEnabled = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring configuration for smooth animations
  const springConfig = { stiffness: 150, damping: 15 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);

  // Glow intensity based on prop
  const glowIntensity = {
    low: '0 0 20px',
    medium: '0 0 40px',
    high: '0 0 60px',
  }[intensity];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltEnabled || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = (e.clientX - centerX) / (rect.width / 2);
    const y = (e.clientY - centerY) / (rect.height / 2);

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: tiltEnabled ? rotateX : 0,
        rotateY: tiltEnabled ? rotateY : 0,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: `${glowIntensity} ${glowColor}66`,
      }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="glass-effect border-primary/20 relative overflow-hidden h-full">
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}22, transparent 50%)`,
          }}
        />
        
        {/* Content */}
        <div className="relative z-10" style={{ transform: 'translateZ(20px)' }}>
          {children}
        </div>

        {/* Border glow effect */}
        <motion.div
          className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${glowColor}33, transparent)`,
            filter: 'blur(10px)',
          }}
        />
      </Card>
    </motion.div>
  );
};

/**
 * HolographicCard - Card with holographic shimmer effect
 */
export const HolographicCard: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-effect border-primary/20 relative overflow-hidden">
        {/* Holographic shimmer */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, rgba(14, 165, 233, 0.3) 50%, transparent 100%)',
            backgroundSize: '200% 200%',
          }}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </Card>
    </motion.div>
  );
};

/**
 * GlassCard - Enhanced glass morphism card
 */
export const GlassCard: React.FC<{
  children: ReactNode;
  className?: string;
  blur?: number;
}> = ({ children, className = '', blur = 20 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card
        className="relative overflow-hidden border border-white/10"
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: `blur(${blur}px) saturate(180%)`,
        }}
      >
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
          }}
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </Card>
    </motion.div>
  );
};
