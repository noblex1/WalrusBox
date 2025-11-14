import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface MeshGradientProps {
  colors?: string[];
  speed?: number;
  className?: string;
}

/**
 * Spline-inspired mesh gradient background
 * Creates smooth, flowing gradient animations
 */
export const MeshGradient = ({ 
  colors = ['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B'],
  speed = 0.5,
  className = ''
}: MeshGradientProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const drawGradient = () => {
      const { width, height } = canvas;
      
      // Create multiple gradient layers
      ctx.clearRect(0, 0, width, height);

      // Layer 1 - Main gradient
      const gradient1 = ctx.createRadialGradient(
        width * 0.3 + Math.sin(time * speed) * 100,
        height * 0.3 + Math.cos(time * speed) * 100,
        0,
        width * 0.3,
        height * 0.3,
        width * 0.8
      );
      gradient1.addColorStop(0, colors[0] + '40');
      gradient1.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, width, height);

      // Layer 2 - Secondary gradient
      const gradient2 = ctx.createRadialGradient(
        width * 0.7 + Math.cos(time * speed * 0.8) * 150,
        height * 0.6 + Math.sin(time * speed * 0.8) * 150,
        0,
        width * 0.7,
        height * 0.6,
        width * 0.7
      );
      gradient2.addColorStop(0, colors[1] + '30');
      gradient2.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);

      // Layer 3 - Accent gradient
      const gradient3 = ctx.createRadialGradient(
        width * 0.5 + Math.sin(time * speed * 1.2) * 80,
        height * 0.8 + Math.cos(time * speed * 1.2) * 80,
        0,
        width * 0.5,
        height * 0.8,
        width * 0.5
      );
      gradient3.addColorStop(0, colors[2] + '25');
      gradient3.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, width, height);

      time += 0.01;
      animationFrameId = requestAnimationFrame(drawGradient);
    };

    drawGradient();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colors, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ filter: 'blur(60px)' }}
    />
  );
};

/**
 * Raycast-inspired gradient orbs
 * Floating, pulsing gradient spheres
 */
export const GradientOrbs = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Orb 1 - Top Left */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: ['-10%', '10%', '-10%'],
          y: ['-10%', '5%', '-10%'],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        initial={{ x: '-10%', y: '-10%' }}
      />

      {/* Orb 2 - Top Right */}
      <motion.div
        className="absolute right-0 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{
          x: ['10%', '-5%', '10%'],
          y: ['-5%', '10%', '-5%'],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        initial={{ x: '10%', y: '-5%' }}
      />

      {/* Orb 3 - Bottom Center */}
      <motion.div
        className="absolute bottom-0 left-1/2 w-[700px] h-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
          transform: 'translateX(-50%)',
        }}
        animate={{
          y: ['10%', '-5%', '10%'],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        initial={{ y: '10%' }}
      />
    </div>
  );
};
