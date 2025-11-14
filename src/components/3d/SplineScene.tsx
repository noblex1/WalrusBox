import { motion } from 'framer-motion';

interface SplineSceneProps {
  sceneUrl: string;
  className?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
}

/**
 * SplineScene - Wrapper for Spline 3D scenes
 * 
 * NOTE: This component requires @splinetool/react-spline to be installed.
 * Run: npm install @splinetool/react-spline
 * 
 * For now, use PlaceholderScene instead which provides a CSS-based 3D effect.
 * 
 * Usage:
 * <SplineScene 
 *   sceneUrl="https://prod.spline.design/YOUR_SCENE_ID/scene.splinecode"
 *   className="w-full h-screen"
 * />
 * 
 * To create your scene:
 * 1. Go to https://spline.design/
 * 2. Create your 3D scene
 * 3. Export as "React Component"
 * 4. Use the provided URL
 */
export const SplineScene: React.FC<SplineSceneProps> = ({
  sceneUrl,
  className = 'w-full h-full',
  fallback,
  onLoad,
}) => {
  // Fallback message when Spline is not installed
  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/20"
      >
        <div className="text-center space-y-4 p-8">
          <div className="text-4xl mb-4">🎨</div>
          <p className="text-sm text-muted-foreground max-w-md">
            Spline 3D scene placeholder. Install @splinetool/react-spline to use actual Spline scenes.
          </p>
          <p className="text-xs text-muted-foreground">
            Using PlaceholderScene component instead for now.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Placeholder 3D Scene (CSS-based fallback)
 * Use this when Spline is not available or for development
 */
export const PlaceholderScene: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative ${className}`}>
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      />

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 border-2 border-primary/30 rounded-2xl"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 180, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 5 + i,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
    </div>
  );
};
