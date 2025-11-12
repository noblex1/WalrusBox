import { useState } from 'react';
import { FileMetadata, filesService } from '@/services/files';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ShareModalProps {
  file: FileMetadata;
  onClose: () => void;
  onUpdate: () => void;
}

export const ShareModal = ({ file, onClose, onUpdate }: ShareModalProps) => {
  const [isPublic, setIsPublic] = useState(file.visibility === 'public');
  const [allowedWallets, setAllowedWallets] = useState<string[]>(file.allowedWallets);
  const [newWallet, setNewWallet] = useState('');

  const handleSave = () => {
    filesService.updateFile(file.id, {
      visibility: isPublic ? 'public' : 'private',
      allowedWallets,
    });
    
    onUpdate();
    toast({
      title: "Share Settings Updated",
      description: "File visibility has been updated.",
    });
    onClose();
  };

  const handleAddWallet = () => {
    if (newWallet && !allowedWallets.includes(newWallet)) {
      setAllowedWallets([...allowedWallets, newWallet]);
      setNewWallet('');
    }
  };

  const handleRemoveWallet = (wallet: string) => {
    setAllowedWallets(allowedWallets.filter(w => w !== wallet));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Settings</DialogTitle>
          <DialogDescription>
            Configure who can access {file.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl glass-effect border border-white/5">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Public Access</Label>
              <p className="text-sm text-muted-foreground">
                Anyone with the link can view this file
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Wallet Whitelist */}
          {!isPublic && (
            <div className="space-y-3">
              <Label>Allowed Wallets</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter wallet address"
                  value={newWallet}
                  onChange={(e) => setNewWallet(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWallet()}
                />
                <Button onClick={handleAddWallet} variant="secondary">
                  Add
                </Button>
              </div>
              
              {allowedWallets.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {allowedWallets.map((wallet) => (
                    <Badge key={wallet} variant="secondary" className="gap-1">
                      {wallet.length > 12 
                        ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` 
                        : wallet}
                      <button
                        onClick={() => handleRemoveWallet(wallet)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            className="flex-1 bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold"
          >
            Save Changes
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1 glass-effect">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
