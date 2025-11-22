import { useCurrentAccount, useDisconnectWallet, ConnectButton } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * WalletConnectButton component using @mysten/dapp-kit
 */
export const WalletConnectButton = () => {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

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

  // Not connected - show connect button
  return (
    <div className="[&>button]:bg-gradient-primary [&>button]:hover:shadow-glow [&>button]:transition-all [&>button]:duration-300 [&>button]:hover:scale-105 [&>button]:font-medium [&>button]:px-3 sm:[&>button]:px-4 [&>button]:py-2 [&>button]:rounded-md [&>button]:gap-2 [&>button]:flex [&>button]:items-center [&>button]:text-sm [&>button]:min-h-[44px] [&>button]:w-full sm:[&>button]:w-auto">
      <ConnectButton />
    </div>
  );
};
