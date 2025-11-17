import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { MeshGradient } from '@/components/animations/MeshGradient';
import { Button } from '@/components/ui/button';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { Shield, Lock, Cloud, ArrowRight, Database, Zap, Globe } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  
  // Reduce animation complexity on mobile
  const y = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : -30]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, shouldReduceMotion ? 1 : 0.7]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Simplified background for mobile performance */}
      {!shouldReduceMotion && (
        <MeshGradient colors={['#0EA5E9', '#8B5CF6', '#EC4899']} speed={0.15} />
      )}
      
      {/* Mobile-Optimized Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-50"
      >
        <div className="glass-effect border-b border-primary/10 backdrop-blur-xl">
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
            <motion.div
              className="flex items-center gap-2 sm:gap-3 group cursor-pointer"
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
            >
              <Cloud className="h-7 w-7 sm:h-10 sm:w-10 text-primary" />
              <span className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                WalBox
              </span>
            </motion.div>
            <div className="scale-90 sm:scale-100">
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile-First Hero Section */}
      <main className="relative z-10">
        <motion.div style={{ y, opacity }} className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-full glass-effect border border-primary/30"
            >
              <motion.div
                animate={shouldReduceMotion ? {} : {
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 sm:w-3 sm:h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(14,165,233,0.8)]"
              />
              <span className="text-xs sm:text-sm font-semibold tracking-wide">Next-Gen Decentralized Storage</span>
            </motion.div>

            {/* Fluid Typography Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3 sm:space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                <span className="block">Decentralized</span>
                <span className="block bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  File Storage
                </span>
                <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl mt-2 sm:mt-4 text-muted-foreground font-light">
                  Built for Web3
                </span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light px-2">
                Store, encrypt, and share your files securely on the blockchain with
                <span className="text-primary font-medium"> military-grade encryption</span>.
              </p>
            </motion.div>

            {/* Mobile-Optimized CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center pt-4 sm:pt-6 px-4 sm:px-0"
            >
              <Button
                size="lg"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto bg-gradient-primary hover:shadow-glow text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 font-semibold transition-all duration-300 active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto glass-effect border-primary/30 hover:border-primary/60 text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 font-medium transition-all duration-300 active:scale-95"
              >
                View Dashboard
              </Button>
            </motion.div>

            {/* Mobile-Optimized Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto pt-8 sm:pt-12"
            >
              {[
                { value: '256-bit', label: 'Encryption', icon: Lock },
                { value: '100%', label: 'Decentralized', icon: Globe },
                { value: 'Instant', label: 'Access', icon: Zap },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-center"
                >
                  <div className="glass-effect p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl border border-primary/10 hover:border-primary/30 transition-all duration-300">
                    <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-primary mx-auto mb-2 sm:mb-3" />
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Mobile-Optimized Features Section */}
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-8 sm:mb-12 md:mb-16"
          >
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Powerful Features
            </span>
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Shield,
                title: 'End-to-End Encryption',
                description: 'Military-grade AES-256-GCM encryption ensures your files are secure',
              },
              {
                icon: Database,
                title: 'Decentralized Storage',
                description: 'Files distributed across global nodes with Walrus protocol',
              },
              {
                icon: Cloud,
                title: 'Web3 Native',
                description: 'Seamless wallet integration with Sui blockchain',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileTap={{ scale: 0.98 }}
                className="glass-effect p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-primary/10 hover:border-primary/30 transition-all duration-300"
              >
                <div className="inline-flex p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-primary/10 mb-4 sm:mb-6">
                  <feature.icon className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile-Optimized CTA Section */}
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto glass-effect p-8 sm:p-12 md:p-16 rounded-2xl sm:rounded-3xl border border-primary/20 text-center"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 md:mb-6">
              Ready to secure your files?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8">
              Join the future of decentralized storage. Start uploading in seconds.
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto bg-gradient-primary hover:shadow-glow text-base sm:text-lg px-8 sm:px-12 py-6 sm:py-7 font-semibold active:scale-95 transition-all"
            >
              <span className="flex items-center justify-center gap-2">
                Launch Dashboard
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Home;
