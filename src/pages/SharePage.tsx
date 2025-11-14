import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { shareService } from '@/services/share';
import { localFilesService, LocalFileMetadata } from '@/services/localFiles';
import { storageService } from '@/services/storage';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, AlertCircle, Lock, FileIcon, ArrowLeft, Eye, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FileIcon as FileIconComponent } from '@/components/FileIcon';
import { MeshGradient } from '@/components/animations/MeshGradient';
import { FloatingElements } from '@/components/animations/FloatingElements';
import { ScaleFade } from '@/components/animations/TextReveal';

export default function SharePage() {
  const { token} = useParams<{ token: string }>();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<LocalFileMetadata | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [requiresWallet, setRequiresWallet] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    // Get share link details first to check if wallet is required
    const shareLink = shareService.getShareLinkByToken(token);
    if (!shareLink) {
      setError('Share link not found');
      setLoading(false);
      return;
    }

    // Check if wallet is required
    if (shareLink.requireWallet) {
      setRequiresWallet(true);
      
      // If wallet required but not connected, show error
      if (!account?.address) {
        setError('Wallet connection required');
        setLoading(false);
        return;
      }
    }

    // Validate share link with wallet address if available
    const validation = shareService.validateShareLink(token, account?.address);
    
    if (!validation.valid) {
      setError(validation.reason || 'Invalid share link');
      setLoading(false);
      return;
    }

    // Get file metadata
    const fileMetadata = localFilesService.getFile(shareLink.fileId);
    if (!fileMetadata) {
      setError('File not found');
      setLoading(false);
      return;
    }

    // Increment access count
    shareService.incrementAccessCount(token);

    setFile(fileMetadata);
    setLoading(false);
  }, [token, account?.address]);

  const handleDownload = async () => {
    if (!file) return;

    setDownloading(true);
    try {
      const blob = await storageService.getBlob(file.id);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: `Downloading ${file.name}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not download file',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        <MeshGradient colors={['#0EA5E9', '#8B5CF6']} speed={0.3} />
        <FloatingElements count={10} />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative z-10"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="inline-block"
          >
            <div className="rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          </motion.div>
          <p className="text-muted-foreground">Loading shared file...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
        <MeshGradient colors={['#0EA5E9', '#8B5CF6']} speed={0.3} />
        <FloatingElements count={10} />
        <ScaleFade>
          <div className="max-w-md w-full glass-effect p-8 rounded-2xl border border-destructive/20 text-center relative z-10">
          <div className="inline-flex p-4 rounded-full bg-destructive/10 mb-4">
            {requiresWallet && !account?.address ? (
              <Wallet className="h-12 w-12 text-primary" />
            ) : (
              <AlertCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {requiresWallet && !account?.address ? 'Wallet Required' : 'Access Denied'}
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          
          {requiresWallet && !account?.address ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This file requires wallet verification. Please connect your wallet to continue.
              </p>
              <WalletConnectButton />
            </div>
          ) : (
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
          )}
          </div>
        </ScaleFade>
      </div>
    );
  }

  if (!file) {
    return null;
  }

  const shareLink = shareService.getShareLinkByToken(token!);
  const stats = shareService.getShareLinkStats(token!);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MeshGradient colors={['#0EA5E9', '#8B5CF6', '#EC4899']} speed={0.3} />
      <FloatingElements count={15} />
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
              Shared File
            </h1>
            <p className="text-muted-foreground">
              Someone shared a file with you via WalrusBox
            </p>
          </div>

          {/* File Card */}
          <ScaleFade delay={0.2}>
            <div className="glass-effect rounded-2xl border border-primary/20 p-8 shadow-elevated">
            <div className="flex items-start gap-6 mb-6">
              <div className="p-4 rounded-xl bg-primary/10">
                <FileIconComponent fileName={file.name} fileType={file.type} className="h-12 w-12" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold mb-2 break-words">{file.name}</h2>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="gap-1">
                    <FileIcon className="h-3 w-3" />
                    {localFilesService.formatFileSize(file.size)}
                  </Badge>
                  
                  {file.visibility === 'private' && (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                  
                  {stats && (
                    <Badge variant="secondary" className="gap-1">
                      <Eye className="h-3 w-3" />
                      {stats.accessCount} view{stats.accessCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Uploaded: {file.uploadedAt.toLocaleDateString()}</p>
                  {shareLink && (
                    <p>
                      Link expires: {shareLink.expiresAt.toLocaleString()}
                    </p>
                  )}
                  {stats?.maxAccess && (
                    <p>
                      Remaining downloads: {stats.remainingAccess}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 bg-gradient-primary hover:shadow-glow"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                {downloading ? 'Downloading...' : 'Download File'}
              </Button>
              
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="lg"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Home
              </Button>
            </div>
            </div>
          </ScaleFade>

          {/* Info Box */}
          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>About WalrusBox:</strong> A decentralized file storage platform built on Sui blockchain and Walrus storage.
            </p>
            <p>
              This file is securely stored and shared. Download it before the link expires.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
