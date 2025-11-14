import { motion, useInView } from 'framer-motion';
import { useRef, ReactNode } from 'react';

interface TextRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Superlist-inspired text reveal animation
 * Smooth, professional text appearance
 */
export const TextReveal = ({ children, delay = 0, className = '' }: TextRevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Word-by-word reveal animation
 * Creates engaging text entrance
 */
export const WordReveal = ({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) => {
  const words = text.split(' ');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.1,
            ease: [0.21, 0.47, 0.32, 0.98],
          }}
          className="inline-block mr-2"
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
};

/**
 * Character-by-character reveal
 * For dramatic effect on headlines
 */
export const CharReveal = ({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) => {
  const chars = text.split('');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className={className}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{
            duration: 0.3,
            delay: delay + i * 0.03,
            ease: 'easeOut',
          }}
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
};

/**
 * Fade-in with blur effect
 * Smooth, modern entrance
 */
export const FadeInBlur = ({ children, delay = 0, className = '' }: TextRevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={isInView ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
      transition={{
        duration: 1,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Scale and fade entrance
 * For cards and containers
 */
export const ScaleFade = ({ children, delay = 0, className = '' }: TextRevealProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
