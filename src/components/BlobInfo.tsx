import { motion } from 'framer-motion';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface BlobInfoProps {
  blobId: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  className?: string;
}

/**
 * BlobInfo - Display Walrus blob information with links to Walrus Scan
 */
export const BlobInfo: React.FC<BlobInfoProps> = ({
  blobId,
  fileName,
  fileSize,
  uploadedAt,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const walrusUrl = `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`;
  const scanUrl = `https://walrus-testnet-explorer.walrus.space/blob/${blobId}`;

  const copyBlobId = async () => {
    try {
      await navigator.clipboard.writeText(blobId);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Blob ID copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
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

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-effect border border-primary/20 rounded-lg p-4 space-y-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-primary">Walrus Blob Info</h4>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyBlobId}
            className="h-8 px-2"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <a
            href={scanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1"
            >
              <span className="text-xs">Scan</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
        </div>
      </div>

      {/* Blob ID */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Blob ID</p>
        <code className="block text-xs bg-background/50 p-2 rounded border border-primary/10 break-all font-mono">
          {blobId}
        </code>
      </div>

      {/* File Info */}
      {(fileName || fileSize || uploadedAt) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {fileName && (
            <div>
              <p className="text-muted-foreground">File Name</p>
              <p className="font-medium truncate">{fileName}</p>
            </div>
          )}
          {fileSize && (
            <div>
              <p className="text-muted-foreground">Size</p>
              <p className="font-medium">{formatFileSize(fileSize)}</p>
            </div>
          )}
          {uploadedAt && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Uploaded</p>
              <p className="font-medium">{formatDate(uploadedAt)}</p>
            </div>
          )}
        </div>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/10">
        <a
          href={walrusUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View on Walrus
          <ExternalLink className="h-3 w-3" />
        </a>
        <span className="text-xs text-muted-foreground">•</span>
        <a
          href={scanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Walrus Scan
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </motion.div>
  );
};

export default BlobInfo;
