import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface GridBackgroundProps {
  color?: string;
  opacity?: number;
  gridSize?: number;
  animated?: boolean;
  perspective?: boolean;
}

/**
 * GridBackground - Futuristic grid background with perspective
 * Inspired by Tron and cyberpunk aesthetics
 */
export const GridBackground: React.FC<GridBackgroundProps> = ({
  color = '#0EA5E9',
  opacity = 0.2,
  gridSize = 50,
  animated = true,
  perspective = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationFrame: number;
    let offset = 0;

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set line style
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 1;

      if (perspective) {
        // Draw perspective grid (3D effect)
        const vanishingPointY = canvas.height * 0.3;
        const vanishingPointX = canvas.width / 2;

        // Horizontal lines (with perspective)
        for (let i = 0; i < 20; i++) {
          const y = vanishingPointY + (i * gridSize) + (animated ? offset : 0);
          if (y > canvas.height) continue;

          const scale = (y - vanishingPointY) / canvas.height;
          const leftX = vanishingPointX - (canvas.width * scale);
          const rightX = vanishingPointX + (canvas.width * scale);

          ctx.beginPath();
          ctx.moveTo(leftX, y);
          ctx.lineTo(rightX, y);
          ctx.stroke();
        }

        // Vertical lines (with perspective)
        for (let i = -10; i < 10; i++) {
          const x = vanishingPointX + (i * gridSize * 2);
          
          ctx.beginPath();
          ctx.moveTo(x, vanishingPointY);
          ctx.lineTo(vanishingPointX + (i * canvas.width * 0.5), canvas.height);
          ctx.stroke();
        }
      } else {
        // Draw flat grid
        // Vertical lines
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        // Horizontal lines
        for (let y = (animated ? offset % gridSize : 0); y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }

      // Animate
      if (animated) {
        offset += 0.5;
        if (offset > gridSize) offset = 0;
        animationFrame = requestAnimationFrame(drawGrid);
      }
    };

    drawGrid();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [color, opacity, gridSize, animated, perspective]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

/**
 * HexagonGrid - Hexagonal grid pattern
 */
export const HexagonGrid: React.FC<{
  color?: string;
  opacity?: number;
  size?: number;
}> = ({ color = '#0EA5E9', opacity = 0.1, size = 60 }) => {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(30deg, ${color}${Math.floor(opacity * 255).toString(16)} 12%, transparent 12.5%, transparent 87%, ${color}${Math.floor(opacity * 255).toString(16)} 87.5%, ${color}${Math.floor(opacity * 255).toString(16)}),
          linear-gradient(150deg, ${color}${Math.floor(opacity * 255).toString(16)} 12%, transparent 12.5%, transparent 87%, ${color}${Math.floor(opacity * 255).toString(16)} 87.5%, ${color}${Math.floor(opacity * 255).toString(16)}),
          linear-gradient(30deg, ${color}${Math.floor(opacity * 255).toString(16)} 12%, transparent 12.5%, transparent 87%, ${color}${Math.floor(opacity * 255).toString(16)} 87.5%, ${color}${Math.floor(opacity * 255).toString(16)}),
          linear-gradient(150deg, ${color}${Math.floor(opacity * 255).toString(16)} 12%, transparent 12.5%, transparent 87%, ${color}${Math.floor(opacity * 255).toString(16)} 87.5%, ${color}${Math.floor(opacity * 255).toString(16)})
        `,
        backgroundSize: `${size}px ${size * 1.732}px`,
        backgroundPosition: `0 0, 0 0, ${size / 2}px ${size * 0.866}px, ${size / 2}px ${size * 0.866}px`,
        zIndex: 0,
      }}
    />
  );
};

/**
 * DotGrid - Simple dot grid pattern
 */
export const DotGrid: React.FC<{
  color?: string;
  opacity?: number;
  spacing?: number;
  dotSize?: number;
}> = ({ color = '#0EA5E9', opacity = 0.3, spacing = 30, dotSize = 2 }) => {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, ${color}${Math.floor(opacity * 255).toString(16)} ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
        zIndex: 0,
      }}
    />
  );
};

/**
 * WaveGrid - Animated wave grid
 */
export const WaveGrid: React.FC<{ color?: string }> = ({ color = '#0EA5E9' }) => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}66, transparent)`,
            top: `${20 + i * 15}%`,
          }}
          animate={{
            x: ['-100%', '100%'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  );
};
