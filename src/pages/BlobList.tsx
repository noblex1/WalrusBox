import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/animated/AnimatedCard';
import WalrusBlob from '@/services/WalrusBlob';
import { toast } from '@/hooks/use-toast';

const BlobList = () => {
  const navigate = useNavigate();
  const [blobs, setBlobs] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Load all blob metadata
      const allBlobs = WalrusBlob.getAllBlobMetadata();
      setBlobs(allBlobs);
      console.log('📊 All Blobs:', allBlobs);
    } catch (error) {
      console.error('Error loading blobs:', error);
      setBlobs([]);
    }
  }, []);

  const copyBlobId = async (blobId: string) => {
    try {
      await navigator.clipboard.writeText(blobId);
      setCopiedId(blobId);
      toast({
        title: 'Copied!',
        description: 'Blob ID copied to clipboard',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy blob ID',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 animate-pulse-slow" />

      {/* Header */}
      <header className="relative z-50 glass-effect border-b border-primary/20 backdrop-blur-2xl">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="hover:bg-primary/10 hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Walrus Blob List</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Info Card */}
          <GlassCard>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-2">Your Uploaded Blobs</h2>
              <p className="text-muted-foreground">
                Total blobs stored: <span className="text-primary font-semibold">{blobs.length}</span>
              </p>
            </div>
          </GlassCard>

          {/* Blob List */}
          {blobs.length === 0 ? (
            <GlassCard>
              <div className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No blobs found</p>
                <p className="text-sm text-muted-foreground">
                  Upload a file to see blob IDs here
                </p>
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="mt-4"
                >
                  Go to Dashboard
                </Button>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {blobs.map((blob, index) => (
                <motion.div
                  key={blob.blobId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <GlassCard>
                    <div className="p-6 space-y-4">
                      {/* File Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg mb-1">{blob.fileName}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatFileSize(blob.fileSize)}</span>
                            <span>•</span>
                            <span>{new Date(blob.uploadedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Blob ID */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-primary">Blob ID</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyBlobId(blob.blobId)}
                            className="h-8 px-2"
                          >
                            {copiedId === blob.blobId ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <code className="block text-xs bg-background/50 p-3 rounded border border-primary/10 break-all font-mono">
                          {blob.blobId}
                        </code>
                      </div>

                      {/* Links */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/10">
                        <a
                          href={blob.walrusUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View on Walrus
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="text-muted-foreground">•</span>
                        <a
                          href={blob.scanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Walrus Scan
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BlobList;
