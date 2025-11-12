import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { walletService } from '@/services/wallet';
import { toast } from '@/hooks/use-toast';

export const WalletConnectButton = () => {
  const [walletState, setWalletState] = useState(walletService.getState());
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    setWalletState(walletService.getState());
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const address = await walletService.connect();
      setWalletState({ connected: true, address });
      toast({
        title: "Wallet Connected",
        description: `Connected to ${walletService.formatAddress(address)}`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    walletService.disconnect();
    setWalletState({ connected: false, address: null });
    toast({
      title: "Wallet Disconnected",
    });
  };

  if (walletState.connected && walletState.address) {
    return (
      <Button 
        variant="outline" 
        onClick={handleDisconnect}
        className="gap-2 glass-effect border-primary/30 hover:border-primary/60 hover:shadow-glow-sm transition-all duration-300"
      >
        <Wallet className="h-4 w-4" />
        <span className="font-medium">{walletService.formatAddress(walletState.address)}</span>
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleConnect}
      disabled={isConnecting}
      className="group relative gap-2 bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-105 font-medium overflow-hidden"
    >
      <span className="relative z-10 flex items-center gap-2">
        <Wallet className="h-4 w-4 transition-transform group-hover:rotate-12" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Button>
  );
};
