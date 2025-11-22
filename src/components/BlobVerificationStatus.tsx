import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import type { FileVerificationResult } from '@/services/seal/sealTypes';

interface BlobVerificationStatusProps {
  isEncrypted: boolean;
  isVerifying: boolean;
  verificationResult?: FileVerificationResult;
  onVerify?: () => void;
  showButton?: boolean;
  compact?: boolean;
  cacheExpiry?: Date; // When the cached result expires
}

/**
 * Blob Verification Status Component
 * 
 * Displays verification status for encrypted files with optional manual verification trigger.
 * Shows real-time verification progress, cached results, and provides manual re-verification.
 * 
 * Features:
 * - Real-time verification status (verifying, verified, failed, not verified)
 * - Detailed tooltips with chunk-level information
 * - Cache expiry warnings
 * - Manual verification trigger button
 * - Compact mode for space-constrained layouts
 * 
 * @param isEncrypted - Whether the file is encrypted (non-encrypted files show N/A)
 * @param isVerifying - Whether verification is currently in progress
 * @param verificationResult - Result of the last verification (if any)
 * @param onVerify - Callback function to trigger manual verification
 * @param showButton - Whether to show the manual verification button (default: true)
 * @param compact - Whether to use compact mode with minimal text (default: false)
 * @param cacheExpiry - When the cached verification result expires (for cache warnings)
 * 
 * @example
 * ```tsx
 * <BlobVerificationStatus
 *   isEncrypted={true}
 *   isVerifying={false}
 *   verificationResult={result}
 *   onVerify={() => handleVerify(fileId)}
 *   showButton={true}
 * />
 * ```
 */
export const BlobVerificationStatus = ({
  isEncrypted,
  isVerifying,
  verificationResult,
  onVerify,
  showButton = true,
  compact = false,
  cacheExpiry,
}: BlobVerificationStatusProps) => {
  // Non-encrypted files don't need verification
  if (!isEncrypted) {
    return compact ? null : (
      <span className="text-xs text-muted-foreground">N/A</span>
    );
  }

  // Format verification time
  const formatVerificationTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Verifying state
  if (isVerifying) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          {!compact && 'Verifying...'}
        </Badge>
      </div>
    );
  }

  // Verified state
  if (verificationResult) {
    const { success, chunkVerifications, verifiedAt } = verificationResult;
    const failedChunks = chunkVerifications.filter(c => !c.verified);
    
    // Check if cache is about to expire (within 1 minute)
    const isCacheExpiringSoon = cacheExpiry && (cacheExpiry.getTime() - Date.now()) < 60000;
    
    return (
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Badge 
                  variant={success ? "default" : "destructive"}
                  className="gap-1 text-xs cursor-help"
                >
                {success ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    {!compact && 'Verified'}
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    {!compact && 'Failed'}
                  </>
                )}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                {success ? (
                  <>
                    <p className="font-semibold">✅ All chunks verified</p>
                    <p>{chunkVerifications.length} chunk(s) checked</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">❌ Verification failed</p>
                    <p>{failedChunks.length} of {chunkVerifications.length} chunk(s) failed</p>
                    {failedChunks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="font-semibold">Failed chunks:</p>
                        {failedChunks.slice(0, 3).map(chunk => (
                          <p key={chunk.index}>
                            Chunk {chunk.index}: {chunk.error || 'Unknown error'}
                          </p>
                        ))}
                        {failedChunks.length > 3 && (
                          <p>...and {failedChunks.length - 3} more</p>
                        )}
                      </div>
                    )}
                  </>
                )}
                {verifiedAt && (
                  <p className="text-muted-foreground mt-2">
                    Last verified: {formatVerificationTime(verifiedAt)}
                  </p>
                )}
                {cacheExpiry && (
                  <p className="text-muted-foreground mt-1">
                    Cache expires: {formatVerificationTime(cacheExpiry)}
                  </p>
                )}
                {isCacheExpiringSoon && (
                  <p className="text-yellow-500 mt-1">
                    ⚠️ Cache expiring soon - consider re-verifying
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {!compact && verifiedAt && (
          <span className="text-xs text-muted-foreground">
            {formatVerificationTime(verifiedAt)}
          </span>
        )}
        
        {showButton && onVerify && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onVerify}
                  className={`h-6 w-6 hover:bg-primary/10 hover:text-primary ${
                    isCacheExpiringSoon ? 'text-yellow-500' : ''
                  }`}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {isCacheExpiringSoon ? 'Cache expiring - re-verify now' : 'Re-verify file'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // Not verified state
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground cursor-help">
              <AlertCircle className="h-3 w-3" />
              {!compact && 'Not Verified'}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">File integrity has not been verified</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click verify button to check blob availability
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showButton && onVerify && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onVerify}
                className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
              >
                <CheckCircle2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Verify file integrity</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
