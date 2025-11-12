import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { Shield, Lock, Cloud, ArrowRight } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background mesh */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-40 animate-pulse-slow" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(199_89%_48%_/_0.1),transparent_50%)]" />
      
      {/* Header */}
      <header className="relative glass-effect border-b border-white/5 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 group">
            <Cloud className="h-8 w-8 text-primary transition-transform group-hover:scale-110 group-hover:rotate-6 duration-300" />
            <span className="text-xl font-bold tracking-tight">WalrusBox</span>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20 relative">
        <div className="max-w-5xl mx-auto text-center space-y-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-primary/20 animate-fade-in">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium">Next-Gen Decentralized Storage</span>
          </div>

          {/* Main heading */}
          <div className="space-y-6 animate-slide-up">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold leading-tight tracking-tight">
              Decentralized File Storage
              <span className="block bg-gradient-primary bg-clip-text text-transparent mt-2 animate-glow">
                Built for Web3
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
              Store, encrypt, and share your files securely on the blockchain with
              <span className="text-primary font-medium"> military-grade encryption</span>.
              Your data, your control.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button
              size="lg"
              onClick={() => navigate('/dashboard')}
              className="group relative bg-gradient-primary hover:shadow-glow text-lg px-10 py-6 font-semibold overflow-hidden transition-all duration-300 hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="group glass-effect border-primary/30 hover:border-primary/60 text-lg px-10 py-6 font-medium transition-all duration-300 hover:scale-105"
            >
              View Dashboard
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto pt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">256-bit</div>
              <div className="text-sm text-muted-foreground mt-1">Encryption</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground mt-1">Decentralized</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">Instant</div>
              <div className="text-sm text-muted-foreground mt-1">Access</div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-24 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="group glass-effect p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-500 hover:shadow-elevated hover:-translate-y-2">
              <div className="mb-6 inline-flex p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                End-to-End Encryption
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Military-grade encryption ensures your files are secure before they even leave your device
              </p>
            </div>
            
            <div className="group glass-effect p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-500 hover:shadow-elevated hover:-translate-y-2" style={{ animationDelay: '0.1s' }}>
              <div className="mb-6 inline-flex p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                Decentralized Storage
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Files distributed across global nodes ensure maximum security and availability
              </p>
            </div>
            
            <div className="group glass-effect p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all duration-500 hover:shadow-elevated hover:-translate-y-2" style={{ animationDelay: '0.2s' }}>
              <div className="mb-6 inline-flex p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Cloud className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                Web3 Native
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seamless wallet integration lets you start storing files in seconds
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
