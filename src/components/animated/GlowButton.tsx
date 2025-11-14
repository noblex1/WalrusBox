import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  glowColor?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  pulse?: boolean;
}

/**
 * GlowButton - Futuristic button with glow effects
 * 
 * Features:
 * - Animated glow on hover
 * - Pulse effect option
 * - Icon support
 * - Multiple variants
 */
export const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  glowColor = '#0EA5E9',
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  pulse = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantStyles = {
    primary: {
      background: `linear-gradient(135deg, ${glowColor}, ${glowColor}dd)`,
      border: 'none',
      color: '#ffffff',
    },
    secondary: {
      background: 'rgba(30, 41, 59, 0.8)',
      border: `1px solid ${glowColor}66`,
      color: glowColor,
    },
    outline: {
      background: 'transparent',
      border: `2px solid ${glowColor}`,
      color: glowColor,
    },
    ghost: {
      background: 'transparent',
      border: 'none',
      color: glowColor,
    },
  };

  return (
    <motion.div
      className="relative inline-block"
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow effect layer */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 rounded-lg opacity-0 blur-xl"
          style={{
            background: glowColor,
          }}
          whileHover={{ opacity: 0.6 }}
          animate={pulse ? {
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          } : {}}
          transition={pulse ? {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          } : {}}
        />
      )}

      {/* Button */}
      <Button
        className={`relative z-10 font-semibold transition-all duration-300 ${sizeClasses[size]} ${className}`}
        style={variantStyles[variant]}
        disabled={disabled}
        {...props}
      >
        <span className="flex items-center gap-2">
          {icon && iconPosition === 'left' && (
            <motion.span
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {icon}
            </motion.span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <motion.span
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {icon}
            </motion.span>
          )}
        </span>

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 rounded-lg opacity-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          }}
          whileHover={{
            opacity: 1,
            x: ['-100%', '100%'],
          }}
          transition={{ duration: 0.6 }}
        />
      </Button>
    </motion.div>
  );
};

/**
 * NeonButton - Button with neon outline effect
 */
export const NeonButton: React.FC<GlowButtonProps> = ({
  children,
  glowColor = '#0EA5E9',
  className = '',
  disabled,
  ...props
}) => {
  return (
    <motion.button
      className={`relative px-8 py-4 font-bold text-lg overflow-hidden rounded-lg ${className}`}
      style={{
        background: 'transparent',
        border: `2px solid ${glowColor}`,
        color: glowColor,
      }}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      disabled={disabled}
      {...props}
    >
      {/* Neon glow layers */}
      <div
        className="absolute inset-0 rounded-lg opacity-50 blur-sm"
        style={{
          boxShadow: `0 0 10px ${glowColor}, inset 0 0 10px ${glowColor}`,
        }}
      />
      <div
        className="absolute inset-0 rounded-lg opacity-30 blur-md"
        style={{
          boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px ${glowColor}`,
        }}
      />

      {/* Content */}
      <span className="relative z-10">{children}</span>

      {/* Animated background on hover */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{ background: glowColor }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
};

/**
 * PulseButton - Button with continuous pulse animation
 */
export const PulseButton: React.FC<GlowButtonProps> = ({
  children,
  glowColor = '#0EA5E9',
  className = '',
  ...props
}) => {
  return (
    <div className="relative inline-block">
      {/* Pulse rings */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-lg border-2"
          style={{ borderColor: glowColor }}
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.6, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Button */}
      <GlowButton glowColor={glowColor} className={className} {...props}>
        {children}
      </GlowButton>
    </div>
  );
};
