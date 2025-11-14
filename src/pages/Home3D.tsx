import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { GlowButton, PulseButton } from '@/components/animated/GlowButton';
import { AnimatedCard, HolographicCard } from '@/components/animated/AnimatedCard';
import { ParticleField, SimpleParticles } from '@/components/3d/ParticleField';
import { GridBackground } from '@/components/effects/GridBackground';
import { PlaceholderScene } from '@/components/3d/SplineScene';
import { Shield, Lock, Cloud, ArrowRight, Zap, Globe, Database } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

const Home3D = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  
  // Parallax effects
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Intersection observers for scroll animations
  const [heroRef, heroInView] = useInView({ threshold: 0.3, triggerOnce: true });
  const [featuresRef, featuresInView] = useInView({ threshold: 0.2, triggerOnce: true });
  const [statsRef, statsInView] = useInView({ threshold: 0.3, triggerOnce: true });

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      {!prefersReducedMotion && (
        <>
          <ParticleField particleCount={40} interactive color="#0EA5E9" />
          <GridBackground perspective animated color="#0EA5E9" opacity={0.15} />
        </>
      )}
      {prefersReducedMotion && <SimpleParticles count={10} />}
      
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
          x: [0, -50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 3D Scene Background */}
      <div className="fixed inset-0 opacity-30">
        <PlaceholderScene className="w-full h-full" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-50"
      >
        <div className="glass-effect border-b border-primary/20 backdrop-blur-2xl">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <motion.div
              className="flex items-center gap-3 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/')}
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Cloud className="h-10 w-10 text-primary drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
              </motion.div>
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                WalrusBox
              </span>
            </motion.div>
            <WalletConnectButton />
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center">
        <motion.div style={{ y: y1, opacity }} className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto text-center space-y-12">
            {/* Badge */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={heroInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-effect border border-primary/30"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(14,165,233,0.8)]"
              />
              <span className="text-sm font-semibold tracking-wide">Next-Gen Decentralized Storage</span>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={heroInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-8"
            >
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold leading-tight tracking-tight">
                <span className="block">Decentralized</span>
                <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(14,165,233,0.5)]">
                  File Storage
                </span>
                <span className="block text-5xl md:text-6xl lg:text-7xl mt-4 text-muted-foreground">
                  Built for Web3
                </span>
              </h1>
              
              <motion.p
                initial={{ y: 30, opacity: 0 }}
                animate={heroInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light"
              >
                Store, encrypt, and share your files securely on the blockchain with
                <span className="text-primary font-medium"> military-grade encryption</span>.
                Your data, your control.
              </motion.p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={heroInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8"
            >
              <PulseButton
                glowColor="#0EA5E9"
                size="lg"
                onClick={() => navigate('/dashboard')}
                icon={<ArrowRight className="h-6 w-6" />}
                iconPosition="right"
              >
                Get Started
              </PulseButton>
              
              <GlowButton
                variant="outline"
                size="lg"
                glowColor="#06B6D4"
                onClick={() => navigate('/dashboard')}
              >
                View Dashboard
              </GlowButton>
            </motion.div>

            {/* Stats */}
            <motion.div
              ref={statsRef}
              initial={{ y: 50, opacity: 0 }}
              animate={statsInView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 1 }}
              className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-16"
            >
              {[
                { value: '256-bit', label: 'Encryption', icon: Lock },
                { value: '100%', label: 'Decentralized', icon: Globe },
                { value: 'Instant', label: 'Access', icon: Zap },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={statsInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.5, delay: 1.2 + i * 0.1 }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  className="text-center group"
                >
                  <HolographicCard className="p-6">
                    <stat.icon className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </HolographicCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-primary/50 rounded-full flex justify-center pt-2"
          >
            <motion.div
              animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1 h-2 bg-primary rounded-full"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="relative py-32">
        <motion.div style={{ y: y2 }} className="container mx-auto px-4">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={featuresInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need for secure, decentralized file storage
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              {
                icon: Shield,
                title: 'End-to-End Encryption',
                description: 'Military-grade AES-256-GCM encryption ensures your files are secure before they even leave your device',
                color: '#0EA5E9',
              },
              {
                icon: Database,
                title: 'Decentralized Storage',
                description: 'Files distributed across global nodes ensure maximum security and availability with Walrus protocol',
                color: '#06B6D4',
              },
              {
                icon: Cloud,
                title: 'Web3 Native',
                description: 'Seamless wallet integration with Sui blockchain lets you start storing files in seconds',
                color: '#8B5CF6',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ y: 50, opacity: 0 }}
                animate={featuresInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.6, delay: i * 0.2 }}
              >
                <AnimatedCard
                  glowColor={feature.color}
                  intensity="medium"
                  className="h-full"
                >
                  <div className="p-8 space-y-6">
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className="inline-flex p-4 rounded-2xl bg-primary/10"
                    >
                      <feature.icon className="h-12 w-12 text-primary" />
                    </motion.div>
                    <h3 className="text-2xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="container mx-auto px-4">
          <HolographicCard className="max-w-4xl mx-auto">
            <div className="p-16 text-center space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold">
                Ready to secure your files?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join the future of decentralized storage. Start uploading in seconds.
              </p>
              <PulseButton
                glowColor="#0EA5E9"
                size="lg"
                onClick={() => navigate('/dashboard')}
                icon={<ArrowRight className="h-6 w-6" />}
                iconPosition="right"
              >
                Launch Dashboard
              </PulseButton>
            </div>
          </HolographicCard>
        </div>
      </section>
    </div>
  );
};

export default Home3D;
