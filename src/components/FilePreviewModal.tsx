import { useEffect, useState } from 'react';
import { X, Download, ExternalLink, Shield, Loader2, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { previewService } from '@/services/preview';
import { storageService } from '@/services/storage';
import { encryptionService } from '@/services/encryption';
import { sealStorageService } from '@/services/seal/sealStorage';
import { sealMetadataService } from '@/services/seal/sealMetadata';
import { sealErrorHandler } from '@/services/seal/sealErrorHandler';
import type { SealFileMetadata, DownloadProgress, RecoveryOption } from '@/services/seal/sealTypes';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileType?: string;
  walrusHash: Uint8Array;
  onDownload: () => void;
  fileId?: string;
  onDelete?: () => void;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  fileName,
  fileType,
  walrusHash,
  onDownload,
  fileId,
  onDelete,
}: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [decryptionProgress, setDecryptionProgress] = useState(0);
  const [decryptionStage, setDecryptionStage] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [recoveryOptions, setRecoveryOptions] = useState<RecoveryOption[]>([]);
  const [errorDetails, setErrorDetails] = useState<string>('');

  const previewType = previewService.getPreviewType(fileName, fileType);

  useEffect(() => {
    if (!isOpen || !fileId) {
      // Cleanup preview URL when modal closes
      if (previewUrl) {
        previewService.revokePreviewURL(previewUrl);
        setPreviewUrl(null);
      }
      setTextContent(null);
      setError(null);
      setDecryptionProgress(0);
      setDecryptionStage('');
      setIsVerifying(false);
      setVerificationFailed(false);
      setRecoveryOptions([]);
      setErrorDetails('');
      return;
    }

    loadPreview();
  }, [isOpen, fileName, fileId]);

  const loadPreview = async () => {
    if (!fileId) {
      setError('File ID is missing');
      setIsLoading(false);
      return;
    }

    if (!previewService.canPreview(fileName, fileType)) {
      setError('Preview not available for this file type');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorDetails('');
    setDecryptionProgress(0);
    setDecryptionStage('');
    setVerificationFailed(false);
    setRecoveryOptions([]);

    try {
      console.log('Loading preview for file:', fileId);
      
      // Check if file is encrypted with Seal
      const sealKey = localStorage.getItem(`seal_key_${fileId}`);
      setIsEncrypted(!!sealKey);

      let blob: Blob;

      if (sealKey) {
        console.log('File is encrypted, loading with Seal');
        
        // Step 1: Load Seal metadata using sealMetadata service
        setDecryptionStage('Loading file metadata...');
        const sealMetadata = await sealMetadataService.getSealMetadata(fileId);
        
        if (!sealMetadata) {
          console.error('Seal metadata not found');
          const errorType = sealErrorHandler.categorizeDownloadError(new Error('Metadata not found'));
          const options = sealErrorHandler.generateRecoveryOptions(errorType);
          setError('File metadata not found. This file cannot be previewed.');
          setErrorDetails('The encryption metadata for this file is missing from local storage.');
          setRecoveryOptions(options);
          setIsLoading(false);
          return;
        }

        console.log('Seal metadata loaded:', sealMetadata);

        // Step 2: Validate metadata
        setDecryptionStage('Validating metadata...');
        const isValid = sealMetadataService.validateSealMetadata(sealMetadata);
        
        if (!isValid) {
          console.error('Seal metadata validation failed');
          const errorType = sealErrorHandler.categorizeDownloadError(new Error('Metadata corrupted'));
          const options = sealErrorHandler.generateRecoveryOptions(errorType);
          setError('File metadata is corrupted. This file cannot be previewed.');
          setErrorDetails('The encryption metadata for this file is incomplete or invalid.');
          setRecoveryOptions(options);
          setIsLoading(false);
          return;
        }

        // Step 3: Verify blobs exist on Walrus (optional but recommended)
        setIsVerifying(true);
        setDecryptionStage('Verifying file availability...');
        
        try {
          const verificationResult = await sealMetadataService.verifyBlobsExist(sealMetadata);
          
          if (!verificationResult.allBlobsExist) {
            console.error('Blob verification failed:', verificationResult);
            setVerificationFailed(true);
            
            const blobNotFoundError = sealErrorHandler.createBlobNotFoundError(
              verificationResult.missingBlobs[0] || sealMetadata.blobId,
              fileId,
              fileName
            );
            
            setError(sealErrorHandler.getUserMessage(blobNotFoundError));
            setErrorDetails(
              `${verificationResult.missingBlobs.length} of ${verificationResult.verifiedBlobs.length + verificationResult.missingBlobs.length} file chunks are missing from the storage network.`
            );
            setRecoveryOptions(blobNotFoundError.recoveryOptions || []);
            setIsLoading(false);
            setIsVerifying(false);
            return;
          }
          
          console.log('All blobs verified successfully');
        } catch (verifyError) {
          console.warn('Blob verification failed, attempting download anyway:', verifyError);
          // Continue with download even if verification fails
        } finally {
          setIsVerifying(false);
        }

        // Step 4: Download and decrypt file
        setDecryptionStage('Downloading encrypted file...');
        
        try {
          blob = await sealStorageService.downloadFile(
            sealMetadata,
            {
              decrypt: true,
              encryptionKey: sealKey,
              verifyIntegrity: true,
              onProgress: (progress: DownloadProgress) => {
                setDecryptionProgress(progress.percentage);
                if (progress.stage === 'downloading') {
                  setDecryptionStage(`Downloading chunk ${progress.currentChunk || 0}/${progress.totalChunks || 1}...`);
                } else if (progress.stage === 'decrypting') {
                  setDecryptionStage('Decrypting file...');
                } else if (progress.stage === 'reassembling') {
                  setDecryptionStage('Reassembling chunks...');
                }
              }
            }
          );
          console.log('File decrypted successfully, size:', blob.size);
        } catch (decryptError) {
          console.error('Seal decryption failed:', decryptError);
          
          const errorDetails = sealErrorHandler.getErrorDetails(decryptError);
          const options = sealErrorHandler.generateRecoveryOptions(errorDetails.type);
          
          setError(sealErrorHandler.getUserMessage(decryptError));
          setErrorDetails(errorDetails.message);
          setRecoveryOptions(options);
          setIsLoading(false);
          return;
        }
      } else {
        console.log('File is unencrypted, loading from storage');
        // Unencrypted file - try IndexedDB first, then Walrus
        setDecryptionStage('Loading file...');
        
        blob = await storageService.getBlob(fileId);
        
        if (!blob) {
          console.log('Not in IndexedDB, trying Walrus');
          // Try to get blob metadata and download from Walrus
          const blobMetadata = storageService.getBlobMetadata(fileId);
          if (blobMetadata && blobMetadata.blobId) {
            console.log('Downloading from Walrus:', blobMetadata.blobId);
            const walrusHash = new TextEncoder().encode(blobMetadata.blobId);
            blob = await storageService.downloadFromWalrus(walrusHash);
          }
        }
        
        if (!blob) {
          console.error('Blob not found in any storage');
          setError('File not found. It may have been deleted or not uploaded properly.');
          setErrorDetails('The file data could not be located in local or network storage.');
          setRecoveryOptions([
            {
              action: 'delete',
              label: 'Remove File',
              description: 'Remove this file from your list',
              primary: true
            }
          ]);
          setIsLoading(false);
          return;
        }
        
        console.log('File loaded successfully, size:', blob.size);
      }

      setDecryptionStage('Generating preview...');

      // Generate preview based on type
      if (previewType === 'image') {
        const url = previewService.generateImagePreview(blob);
        setPreviewUrl(url);
        console.log('Image preview generated');
      } else if (previewType === 'pdf') {
        const url = previewService.generatePDFPreview(blob);
        setPreviewUrl(url);
        console.log('PDF preview generated');
      } else if (previewType === 'text' || previewType === 'code') {
        const text = await previewService.readTextContent(blob);
        setTextContent(text);
        console.log('Text preview generated');
      }
    } catch (err) {
      console.error('Preview error:', err);
      
      const errorDetails = sealErrorHandler.getErrorDetails(err);
      const options = sealErrorHandler.generateRecoveryOptions(errorDetails.type);
      
      setError(sealErrorHandler.getUserMessage(err));
      setErrorDetails(errorDetails.message);
      setRecoveryOptions(options);
    } finally {
      setIsLoading(false);
      setDecryptionProgress(0);
      setDecryptionStage('');
      setIsVerifying(false);
    }
  };

  const handleRecoveryAction = (action: string) => {
    switch (action) {
      case 'retry':
        loadPreview();
        break;
      case 'delete':
        if (onDelete) {
          onDelete();
          onClose();
        }
        break;
      case 'report':
        // TODO: Implement error reporting
        console.log('Report issue for file:', fileId);
        break;
      case 'dismiss':
        onClose();
        break;
      default:
        console.warn('Unknown recovery action:', action);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] glass-effect border-primary/20">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold truncate">
                {fileName}
              </DialogTitle>
              {isEncrypted && (
                <Badge variant="outline" className="gap-1 text-xs border-primary/30 bg-primary/10 shrink-0">
                  <Shield className="h-3 w-3 text-primary" />
                  Encrypted
                </Badge>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={onDownload}
                className="hover:bg-primary/10"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 overflow-auto max-h-[calc(90vh-120px)]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                {isEncrypted && (
                  <Shield className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              {decryptionStage && (
                <div className="w-full max-w-md space-y-2">
                  <p className="text-sm text-center text-muted-foreground">{decryptionStage}</p>
                  {decryptionProgress > 0 && (
                    <Progress value={decryptionProgress} className="h-2" />
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Alert variant="destructive" className="max-w-2xl mb-6">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="text-lg font-semibold">Preview Failed</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="text-sm">{error}</p>
                  {errorDetails && (
                    <p className="text-xs text-muted-foreground mt-2">{errorDetails}</p>
                  )}
                  {verificationFailed && (
                    <p className="text-xs text-muted-foreground mt-2">
                      The file data could not be found on the storage network. It may have expired or been removed.
                    </p>
                  )}
                </AlertDescription>
              </Alert>

              {recoveryOptions.length > 0 && (
                <div className="space-y-3 w-full max-w-md">
                  <p className="text-sm font-medium text-center mb-3">What would you like to do?</p>
                  <div className="flex flex-col gap-2">
                    {recoveryOptions.map((option, index) => {
                      const Icon = 
                        option.action === 'retry' ? RefreshCw :
                        option.action === 'delete' ? Trash2 :
                        AlertTriangle;

                      return (
                        <Button
                          key={index}
                          variant={option.primary ? 'default' : 'outline'}
                          onClick={() => handleRecoveryAction(option.action)}
                          className="w-full justify-start"
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{option.label}</span>
                            {option.description && (
                              <span className="text-xs opacity-80">{option.description}</span>
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {recoveryOptions.length === 0 && (
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => loadPreview()} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                  {onDelete && (
                    <Button onClick={() => { onDelete(); onClose(); }} variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove File
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && previewType === 'image' && previewUrl && (
            <div className="flex items-center justify-center bg-black/5 rounded-lg p-4">
              <img
                src={previewUrl}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          )}

          {!isLoading && !error && previewType === 'pdf' && previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] rounded-lg border border-primary/20"
              title={fileName}
            />
          )}

          {!isLoading && !error && (previewType === 'text' || previewType === 'code') && textContent && (
            <pre className="bg-black/5 p-4 rounded-lg overflow-auto text-sm font-mono max-h-[70vh]">
              <code>{textContent}</code>
            </pre>
          )}

          {!isLoading && !error && previewType === 'none' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Preview not available for this file type
              </p>
              <Button onClick={onDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
