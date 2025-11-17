import { useCurrentAccount, useDisconnectWallet, ConnectButton } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, ChevronDown, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { logWalletDebugInfo, getAllDetectedWallets } from '@/services/slushHelper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

/**
 * WalletConnectButton component using @mysten/dapp-kit
 * Enhanced with Slush Wallet detection debugging
 */
export const WalletConnectButton = () => {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [walletsDetected, setWalletsDetected] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Check for wallets on component mount
    const checkWallets = (isInitial = false) => {
      const { detected } = getAllDetectedWallets();
      setWalletsDetected(detected);
      
      // Only log once after final check
      if (!isInitial && detected.length === 0) {
        console.warn('[WalletConnectButton] No Sui wallet detected. Install Slush, Sui Wallet, or Nautilus extension.');
      } else if (!isInitial && detected.length > 0) {
        console.log('[WalletConnectButton] ✓ Wallets found:', detected);
      }
    };

    // Check immediately (silent)
    checkWallets(true);
    
    // Final check after wallet extensions have time to load
    const timer = setTimeout(() => checkWallets(false), 2000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet Disconnected",
    });
  };

  // If connected, show connected address with disconnect option - Mobile Optimized
  if (account?.address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="gap-1 sm:gap-2 glass-effect border-primary/30 hover:border-primary/60 hover:shadow-glow-sm transition-all duration-300 text-xs sm:text-sm px-2 sm:px-4 min-h-[44px]"
          >
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="font-medium max-w-[80px] sm:max-w-none truncate">
              {formatAddress(account.address)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-effect border-primary/20 w-48">
          <DropdownMenuItem 
            onClick={handleDisconnect} 
            className="cursor-pointer gap-2 text-red-500 hover:text-red-600 min-h-[44px]"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Not connected - show warning if no wallets detected - Mobile Optimized
  return (
    <div className="flex flex-col items-end gap-2 max-w-[280px] sm:max-w-xs">
      {walletsDetected.length === 0 && (
        <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 mb-2 w-full hidden sm:block">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-xs">
            No wallet detected. Install Slush, Sui Wallet, or Nautilus.
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className="block mt-1 text-yellow-700 dark:text-yellow-300 underline hover:text-yellow-900 dark:hover:text-yellow-100 text-xs min-h-[24px]"
            >
              {showDebug ? 'Hide' : 'Show'} debug info
            </button>
          </AlertDescription>
        </Alert>
      )}
      
      {showDebug && (
        <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded w-full mb-2 max-h-40 overflow-auto border border-gray-300 dark:border-gray-700">
          <p className="font-bold mb-1">Detected Wallets:</p>
          <p className="break-words">{walletsDetected.length > 0 ? walletsDetected.join(', ') : 'None'}</p>
          <button 
            onClick={() => {
              logWalletDebugInfo();
              console.log('Debug info logged to console - open DevTools (F12) to see');
              toast({
                title: "Debug Info Logged",
                description: "Check browser console (F12) for details",
              });
            }}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline min-h-[24px]"
          >
            Log to Console
          </button>
        </div>
      )}

      <div className="[&>button]:bg-gradient-primary [&>button]:hover:shadow-glow [&>button]:transition-all [&>button]:duration-300 [&>button]:hover:scale-105 [&>button]:font-medium [&>button]:px-3 sm:[&>button]:px-4 [&>button]:py-2 [&>button]:rounded-md [&>button]:gap-2 [&>button]:flex [&>button]:items-center [&>button]:text-sm [&>button]:min-h-[44px] [&>button]:w-full sm:[&>button]:w-auto">
        <ConnectButton />
      </div>
    </div>
  );
};
