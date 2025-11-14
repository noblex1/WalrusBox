import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Raycast-inspired interactive grid
 * Responds to mouse movement with smooth animations
 */
export const InteractiveGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 150 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    const unsubscribeX = mouseXSpring.on('change', (v) => {
      currentMouseX = v;
    });

    const unsubscribeY = mouseYSpring.on('change', (v) => {
      currentMouseY = v;
    });

    const drawGrid = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const gridSize = 50;
      const dotSize = 2;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.3)';

      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          const distance = Math.sqrt(
            Math.pow(x - currentMouseX, 2) + Math.pow(y - currentMouseY, 2)
          );
          
          const maxDistance = 200;
          const opacity = Math.max(0, 1 - distance / maxDistance);
          const size = dotSize + opacity * 3;

          if (opacity > 0) {
            ctx.globalAlpha = opacity * 0.6;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(drawGrid);
    };

    drawGrid();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      unsubscribeX();
      unsubscribeY();
    };
  }, [mouseX, mouseY, mouseXSpring, mouseYSpring]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
};

/**
 * Animated grid lines
 * Subtle background pattern
 */
export const AnimatedGridLines = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="grid"
            width="50"
            height="50"
            patternUnits="userSpaceOnUse"
          >
            <motion.path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="rgba(14, 165, 233, 0.1)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 2,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
};

/**
 * Perspective grid
 * 3D-like grid effect
 */
export const PerspectiveGrid = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(14, 165, 233, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transformOrigin: 'center center',
        }}
        animate={{
          rotateX: mousePosition.y,
          rotateY: mousePosition.x,
        }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
        }}
      />
    </motion.div>
  );
};
