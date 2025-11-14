import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MeshGradient, GradientOrbs } from '@/components/animations/MeshGradient';
import { FloatingElements, FlowingParticles } from '@/components/animations/FloatingElements';
import { TextReveal, FadeInBlur, ScaleFade } from '@/components/animations/TextReveal';
import { InteractiveGrid } from '@/components/animations/InteractiveGrid';
import { EnhancedBackground } from '@/components/animations/EnhancedBackground';
import { Button } from '@/components/ui/button';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { Shield, Lock, Cloud, ArrowRight, Database, Zap, Globe } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Enhanced Background Animations - Maximum Visual Impact */}
      <MeshGradient colors={['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B']} speed={0.3} />
      <GradientOrbs />
      <FloatingElements count={20} />
      <FlowingParticles count={60} />
      <InteractiveGrid />
      <EnhancedBackground />
      
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="relative z-50"
      >
        <div className="glass-effect border-b border-primary/10 backdrop-blur-2xl">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <motion.div
              className="flex items-center gap-3 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/')}
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear',
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
      <main className="relative z-10">
        <motion.div style={{ y, opacity }} className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-6xl mx-auto text-center space-y-12">
            {/* Badge - Superlist-inspired reveal */}
            <TextReveal delay={0.2}>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-effect border border-primary/30">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(14,165,233,0.8)]"
                />
                <span className="text-sm font-semibold tracking-wide">Next-Gen Decentralized Storage</span>
              </div>
            </TextReveal>

            {/* Main Heading - Superlist-style text reveal */}
            <div className="space-y-6">
              <FadeInBlur delay={0.4}>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight">
                  <span className="block">Decentralized</span>
                  <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                    File Storage
                  </span>
                  <span className="block text-4xl md:text-5xl lg:text-6xl mt-4 text-muted-foreground font-light">
                    Built for Web3
                  </span>
                </h1>
              </FadeInBlur>
              
              <TextReveal delay={0.6}>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light">
                  Store, encrypt, and share your files securely on the blockchain with
                  <span className="text-primary font-medium"> military-grade encryption</span>.
                  Your data, your control.
                </p>
              </TextReveal>
            </div>

            {/* CTA Buttons */}
            <TextReveal delay={0.8}>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    onClick={() => navigate('/dashboard')}
                    className="group relative bg-gradient-primary hover:shadow-glow text-lg px-12 py-7 font-semibold overflow-hidden transition-all duration-300"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Get Started
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    className="glass-effect border-primary/30 hover:border-primary/60 text-lg px-12 py-7 font-medium transition-all duration-300"
                  >
                    View Dashboard
                  </Button>
                </motion.div>
              </div>
            </TextReveal>

            {/* Stats - Sui Overflow-inspired */}
            <ScaleFade delay={1}>
              <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-16">
                {[
                  { value: '256-bit', label: 'Encryption', icon: Lock },
                  { value: '100%', label: 'Decentralized', icon: Globe },
                  { value: 'Instant', label: 'Access', icon: Zap },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.2 + i * 0.1 }}
                    whileHover={{ scale: 1.1, y: -5 }}
                    className="text-center group"
                  >
                    <div className="glass-effect p-6 rounded-2xl border border-primary/10 hover:border-primary/30 transition-all duration-300">
                      <stat.icon className="h-8 w-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScaleFade>
          </div>
        </motion.div>

        {/* Features Section */}
        <div className="container mx-auto px-4 py-20">
          <TextReveal delay={0.2}>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
          </TextReveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: 'End-to-End Encryption',
                description: 'Military-grade AES-256-GCM encryption ensures your files are secure before they even leave your device',
                delay: 0.3,
              },
              {
                icon: Database,
                title: 'Decentralized Storage',
                description: 'Files distributed across global nodes ensure maximum security and availability with Walrus protocol',
                delay: 0.4,
              },
              {
                icon: Cloud,
                title: 'Web3 Native',
                description: 'Seamless wallet integration with Sui blockchain lets you start storing files in seconds',
                delay: 0.5,
              },
            ].map((feature, i) => (
              <ScaleFade key={i} delay={feature.delay}>
                <motion.div
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="glass-effect p-8 rounded-2xl border border-primary/10 hover:border-primary/30 transition-all duration-500 hover:shadow-elevated h-full"
                >
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6"
                  >
                    <feature.icon className="h-12 w-12 text-primary" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              </ScaleFade>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 py-20">
          <ScaleFade delay={0.2}>
            <div className="max-w-4xl mx-auto glass-effect p-16 rounded-3xl border border-primary/20 text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to secure your files?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Join the future of decentralized storage. Start uploading in seconds.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                  className="bg-gradient-primary hover:shadow-glow text-lg px-12 py-7 font-semibold"
                >
                  <span className="flex items-center gap-2">
                    Launch Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Button>
              </motion.div>
            </div>
          </ScaleFade>
        </div>
      </main>
    </div>
  );
};

export default Home;
