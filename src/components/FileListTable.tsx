import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileMetadata, filesService } from '@/services/files';
import { localFilesService, LocalFileMetadata } from '@/services/localFiles';
import { storageService } from '@/services/storage';
import { sealStorageService } from '@/services/seal/sealStorage';
import type { SealFileMetadata, FileVerificationResult } from '@/services/seal/sealTypes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Eye, 
  Share2, 
  Trash2, 
  Lock, 
  Unlock, 
  FolderOpen, 
  Shield, 
  ShieldOff, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { ShareModal } from './ShareModal';
import { FilePreviewModal } from './FilePreviewModal';
import { VirtualFileList } from './VirtualFileList';
import { BlobVerificationStatus } from './BlobVerificationStatus';
import { BatchVerificationProgress } from './BatchVerificationProgress';
import { toast } from '@/hooks/use-toast';

interface FileListTableProps {
  files: FileMetadata[];
  onRefresh: () => void;
}

// Use virtual scrolling for large file lists
const VIRTUAL_SCROLL_THRESHOLD = 100;

// Helper function to check if a file is encrypted
const isFileEncrypted = (fileId: string): boolean => {
  // Check if Seal encryption key exists
  const sealKey = localStorage.getItem(`seal_key_${fileId}`);
  return !!sealKey;
};

export const FileListTable = ({ files, onRefresh }: FileListTableProps) => {
  const navigate = useNavigate();
  const [shareModalFile, setShareModalFile] = useState<LocalFileMetadata | null>(null);
  const [encryptionFilter, setEncryptionFilter] = useState<'all' | 'encrypted' | 'unencrypted'>('all');
  const [verifyingFiles, setVerifyingFiles] = useState<Set<string>>(new Set());
  const [verificationResults, setVerificationResults] = useState<Map<string, FileVerificationResult>>(new Map());
  const [batchVerifying, setBatchVerifying] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    verified: number;
    failed: number;
    current: number;
  }>({ total: 0, verified: 0, failed: 0, current: 0 });

  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleDelete = async (file: FileMetadata) => {
    try {
      console.log('🗑️ Deleting file:', file.id);
      
      // Delete from storage (IndexedDB/Walrus)
      await storageService.deleteBlob(file.id);
      
      // Delete local file metadata
      localFilesService.deleteFile(file.id);
      
      // Clean up all related data
      localStorage.removeItem(`seal_key_${file.id}`);
      localStorage.removeItem(`seal_metadata_${file.id}`);
      localStorage.removeItem(`key_${file.id}`);
      localStorage.removeItem(`walrus_blob_${file.id}`);
      localStorage.removeItem(`file_corrupted_${file.id}`);
      
      // Mark file as deleted (so it doesn't come back from blockchain)
      const deletedFiles = JSON.parse(localStorage.getItem('deleted_files') || '[]');
      if (!deletedFiles.includes(file.id)) {
        deletedFiles.push(file.id);
        localStorage.setItem('deleted_files', JSON.stringify(deletedFiles));
      }
      
      console.log('✅ File deleted, refreshing list...');
      
      // Refresh the file list
      onRefresh();
      
      toast({
        title: "File Deleted",
        description: "File has been removed from your dashboard.",
      });
    } catch (error) {
      console.error('❌ Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete file",
        variant: "destructive",
      });
    }
  };

  const handlePreview = (file: FileMetadata) => {
    console.log('Opening preview for file:', file.id);
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Map<string, { percentage: number; message: string }>>(new Map());

  const handleDownload = async (file: FileMetadata) => {
    try {
      console.log('🔽 handleDownload called with file:', file);
      
      if (!file.id) {
        console.error('❌ File ID is missing');
        toast({
          title: "Cannot Download",
          description: "File ID is missing. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('📂 Looking for local file with ID:', file.id);
      const localFile = localFilesService.getFile(file.id);
      console.log('📂 Local file found:', localFile);
      
      const fileName = localFile?.name || file.file_id || 'download';
      console.log('📝 Downloading file:', file.id, 'Name:', fileName);

      // Check if file is encrypted with Seal
      const sealKey = localStorage.getItem(`seal_key_${file.id}`);
      
      let blob: Blob;
      
      if (sealKey) {
        console.log('Downloading encrypted file with Seal');
        
        // Mark file as downloading
        setDownloadingFiles(prev => new Set(prev).add(file.id));
        
        try {
          // Use the new downloadEncryptedFile service
          blob = await filesService.downloadEncryptedFile(file.id, {
            verifyBeforeDownload: true,
            encryptionKey: sealKey,
            timeout: 60000, // 60 second timeout
            verifyIntegrity: true,
            onProgress: (progress) => {
              console.log(`Download progress: ${progress.percentage}% - ${progress.message}`);
              
              // Update progress state
              setDownloadProgress(prev => new Map(prev).set(file.id, {
                percentage: progress.percentage,
                message: progress.message
              }));
              
              // Show toast for key stages
              if (progress.stage === 'verifying') {
                toast({
                  title: "Verifying File",
                  description: "Checking file availability...",
                });
              } else if (progress.stage === 'downloading' && progress.currentChunk === 1) {
                toast({
                  title: "Downloading",
                  description: progress.totalChunks && progress.totalChunks > 1
                    ? `Downloading ${progress.totalChunks} chunks...`
                    : "Downloading file...",
                });
              }
            }
          });
          
          console.log('File downloaded and decrypted, size:', blob.size);
        } finally {
          // Clear downloading state
          setDownloadingFiles(prev => {
            const next = new Set(prev);
            next.delete(file.id);
            return next;
          });
          setDownloadProgress(prev => {
            const next = new Map(prev);
            next.delete(file.id);
            return next;
          });
        }
      } else {
        console.log('Downloading unencrypted file');
        // Try IndexedDB first
        let blobFromStorage = await storageService.getBlob(file.id);
        
        if (!blobFromStorage) {
          console.log('Not in IndexedDB, trying Walrus');
          
          // The walrus_object_hash from blockchain is the actual blob ID (as bytes)
          // We need to convert it to a string
          if (file.walrus_object_hash && file.walrus_object_hash.length > 0) {
            // Convert Uint8Array to string (it's stored as UTF-8 encoded blob ID)
            const blobId = new TextDecoder().decode(file.walrus_object_hash);
            console.log('Decoded blob ID from blockchain:', blobId);
            
            // Now encode it back to bytes for the download function
            const blobIdBytes = new TextEncoder().encode(blobId);
            blobFromStorage = await storageService.downloadFromWalrus(blobIdBytes);
          } else {
            // Try using blob metadata as fallback
            const blobMetadata = storageService.getBlobMetadata(file.id);
            if (blobMetadata && blobMetadata.blobId) {
              console.log('Using blob metadata, blob ID:', blobMetadata.blobId);
              const walrusHash = new TextEncoder().encode(blobMetadata.blobId);
              blobFromStorage = await storageService.downloadFromWalrus(walrusHash);
            }
          }
        }
        
        if (!blobFromStorage) {
          toast({
            title: "File Not Found",
            description: "Could not find file data. It may have been deleted or expired from Walrus.",
            variant: "destructive",
          });
          return;
        }
        
        blob = blobFromStorage;
        console.log('File retrieved, size:', blob.size);
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Download initiated successfully');

      toast({
        title: "Download Complete",
        description: `Successfully downloaded ${fileName}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      
      // Import error handler and ToastAction dynamically
      const { sealErrorHandler } = await import('@/services/seal/sealErrorHandler');
      const { ToastAction } = await import('@/components/ui/toast');
      
      // Get user-friendly error message and recovery options
      const errorDetails = sealErrorHandler.getErrorDetails(error);
      const recoveryOptions = sealErrorHandler.generateRecoveryOptions(errorDetails.type);
      
      // Show error toast with recovery options
      const primaryOption = recoveryOptions.find(opt => opt.primary);
      
      toast({
        title: "Download Failed",
        description: errorDetails.userMessage,
        variant: "destructive",
        action: primaryOption ? (
          <ToastAction 
            altText={primaryOption.label}
            onClick={() => handleRecoveryAction(primaryOption.action, file)}
          >
            {primaryOption.label}
          </ToastAction>
        ) : undefined
      });
      
      // Log detailed error for debugging
      console.error('Detailed error:', errorDetails);
    }
  };

  const handleRecoveryAction = async (action: string, file: FileMetadata) => {
    switch (action) {
      case 'retry':
        console.log('Retrying download for file:', file.id);
        await handleDownload(file);
        break;
        
      case 'delete':
        console.log('Deleting file after failed download:', file.id);
        await handleDelete(file);
        break;
        
      case 'report':
        console.log('Reporting issue for file:', file.id);
        toast({
          title: "Report Issue",
          description: "Please contact support with the file ID: " + file.id,
        });
        break;
        
      case 'dismiss':
      default:
        // Do nothing
        break;
    }
  };

  const handleShare = (file: FileMetadata) => {
    // Get local metadata for sharing
    const localFile = localFilesService.getFile(file.id);
    if (localFile) {
      setShareModalFile(localFile);
    } else {
      // Create local metadata if it doesn't exist
      const newLocalFile: LocalFileMetadata = {
        id: file.id,
        name: file.file_id || 'Unknown',
        size: 0,
        type: 'application/octet-stream',
        uploadedAt: file.uploadedAt,
        visibility: file.visibility,
        allowedWallets: file.allowedWallets,
      };
      localFilesService.saveFile(newLocalFile);
      setShareModalFile(newLocalFile);
    }
  };

  const handleVerifyFile = async (file: FileMetadata) => {
    // Check if file is encrypted (has Seal metadata)
    const sealMetadataKey = `seal_metadata_${file.id}`;
    const sealMetadataStr = localStorage.getItem(sealMetadataKey);
    
    if (!sealMetadataStr) {
      toast({
        title: "Verification Not Available",
        description: "This file doesn't have Seal encryption metadata",
        variant: "destructive",
      });
      return;
    }

    try {
      const sealMetadata: SealFileMetadata = JSON.parse(sealMetadataStr);
      
      setVerifyingFiles(prev => new Set(prev).add(file.id));

      const result = await sealStorageService.verifyFile(sealMetadata, false);
      
      setVerificationResults(prev => new Map(prev).set(file.id, result));
      
      if (result.success) {
        toast({
          title: "✅ Verification Successful",
          description: `All ${result.chunkVerifications.length} chunk(s) verified successfully`,
        });
      } else {
        // Mark file as corrupted in local storage
        const corruptedKey = `file_corrupted_${file.id}`;
        localStorage.setItem(corruptedKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          error: result.error,
          chunkFailures: result.chunkVerifications.filter(c => !c.verified)
        }));
        
        // Show detailed error information
        const failedChunks = result.chunkVerifications.filter(c => !c.verified);
        toast({
          title: "❌ Verification Failed",
          description: `${failedChunks.length} chunk(s) failed verification. File may be corrupted.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setVerifyingFiles(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  const handleReuploadCorrupted = (file: FileMetadata) => {
    // Clear corrupted flag
    const corruptedKey = `file_corrupted_${file.id}`;
    localStorage.removeItem(corruptedKey);
    
    // Navigate to upload page or show upload dialog
    toast({
      title: "Re-upload Required",
      description: "Please upload the file again to replace the corrupted version",
    });
    
    // Optionally delete the corrupted file
    handleDelete(file);
  };

  const isFileCorrupted = (fileId: string): boolean => {
    const corruptedKey = `file_corrupted_${fileId}`;
    return !!localStorage.getItem(corruptedKey);
  };

  const handleBatchVerify = async () => {
    const encryptedFiles = filteredFiles.filter(file => isFileEncrypted(file.id));
    
    if (encryptedFiles.length === 0) {
      toast({
        title: "No Encrypted Files",
        description: "No encrypted files to verify",
      });
      return;
    }

    setBatchVerifying(true);
    setBatchProgress({
      total: encryptedFiles.length,
      verified: 0,
      failed: 0,
      current: 0,
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < encryptedFiles.length; i++) {
      const file = encryptedFiles[i];
      const sealMetadataKey = `seal_metadata_${file.id}`;
      const sealMetadataStr = localStorage.getItem(sealMetadataKey);
      
      // Update current progress
      setBatchProgress(prev => ({
        ...prev,
        current: i + 1,
      }));
      
      if (!sealMetadataStr) {
        failCount++;
        setBatchProgress(prev => ({
          ...prev,
          failed: prev.failed + 1,
        }));
        continue;
      }

      try {
        const sealMetadata: SealFileMetadata = JSON.parse(sealMetadataStr);
        const result = await sealStorageService.verifyFile(sealMetadata, false);
        
        setVerificationResults(prev => new Map(prev).set(file.id, result));
        
        if (result.success) {
          successCount++;
          setBatchProgress(prev => ({
            ...prev,
            verified: prev.verified + 1,
          }));
        } else {
          failCount++;
          setBatchProgress(prev => ({
            ...prev,
            failed: prev.failed + 1,
          }));
        }
      } catch (error) {
        failCount++;
        setBatchProgress(prev => ({
          ...prev,
          failed: prev.failed + 1,
        }));
      }
    }

    setBatchVerifying(false);

    toast({
      title: "Batch Verification Complete",
      description: `${successCount} verified, ${failCount} failed out of ${encryptedFiles.length} files`,
    });
  };

  // Filter files by encryption status
  const filteredFiles = files.filter(file => {
    if (encryptionFilter === 'all') return true;
    const encrypted = isFileEncrypted(file.id);
    return encryptionFilter === 'encrypted' ? encrypted : !encrypted;
  });

  // Use virtual scrolling for large lists
  if (filteredFiles.length > VIRTUAL_SCROLL_THRESHOLD) {
    return <VirtualFileList files={filteredFiles} onRefresh={onRefresh} />;
  }

  if (files.length === 0) {
    return (
      <div className="glass-effect p-16 rounded-2xl text-center border border-white/5">
        <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
          <FolderOpen className="h-12 w-12 text-primary" />
        </div>
        <p className="text-muted-foreground text-lg">No files uploaded yet</p>
        <p className="text-sm text-muted-foreground mt-2">Upload your first file to get started</p>
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <div className="glass-effect p-16 rounded-2xl text-center border border-white/5">
        <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
          {encryptionFilter === 'encrypted' ? (
            <Shield className="h-12 w-12 text-primary" />
          ) : (
            <ShieldOff className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <p className="text-muted-foreground text-lg">
          No {encryptionFilter} files found
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Try changing the encryption filter
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Batch Verification Progress */}
      {batchVerifying && (
        <div className="mb-4 animate-fade-in">
          <BatchVerificationProgress
            total={batchProgress.total}
            verified={batchProgress.verified}
            failed={batchProgress.failed}
            current={batchProgress.current}
            isComplete={false}
          />
        </div>
      )}

      {/* Encryption Filter and Batch Actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by encryption:</span>
          <Select value={encryptionFilter} onValueChange={(value: any) => setEncryptionFilter(value)}>
            <SelectTrigger className="w-[180px] glass-effect">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="encrypted">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Encrypted Only
                </div>
              </SelectItem>
              <SelectItem value="unencrypted">
                <div className="flex items-center gap-2">
                  <ShieldOff className="h-4 w-4" />
                  Unencrypted Only
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {filteredFiles.some(f => isFileEncrypted(f.id)) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchVerify}
              disabled={batchVerifying}
              className="gap-2"
            >
              {batchVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Verify All
                </>
              )}
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredFiles.length} of {files.length} files
        </div>
      </div>

      <div className="rounded-xl glass-effect border border-white/10 overflow-hidden shadow-elevated animate-fade-in">
        <Table>
          <TableHeader>
            <TableRow className="bg-card/50 hover:bg-card/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Size</TableHead>
              <TableHead className="font-semibold">Uploaded</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Verification</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.map((file, index) => {
              const encrypted = isFileEncrypted(file.id);
              const isVerifying = verifyingFiles.has(file.id);
              const verificationResult = verificationResults.get(file.id);
              const corrupted = isFileCorrupted(file.id);
              const isDownloading = downloadingFiles.has(file.id);
              const progress = downloadProgress.get(file.id);
              
              return (
                <TableRow 
                  key={file.id} 
                  className={`hover:bg-primary/5 transition-colors duration-200 border-white/5 animate-fade-in ${
                    corrupted ? 'bg-destructive/5' : ''
                  } ${isDownloading ? 'bg-primary/5' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {file.file_id || 'Unknown'}
                        {encrypted && (
                          <Badge variant="outline" className="gap-1 text-xs border-primary/30 bg-primary/10">
                            <Shield className="h-3 w-3 text-primary" />
                            Encrypted
                          </Badge>
                        )}
                        {corrupted && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <XCircle className="h-3 w-3" />
                            Corrupted
                          </Badge>
                        )}
                        {isDownloading && (
                          <Badge variant="outline" className="gap-1 text-xs border-primary/30 bg-primary/10">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            Downloading
                          </Badge>
                        )}
                      </div>
                      {isDownloading && progress && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progress.percentage}%</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{progress.message}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {localFilesService.getFile(file.id)?.size 
                      ? localFilesService.formatFileSize(localFilesService.getFile(file.id)!.size)
                      : 'Unknown'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col">
                      <span className="text-sm">{file.uploadedAt.toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground/70">{file.uploadedAt.toLocaleTimeString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={file.visibility === 'public' ? 'default' : 'secondary'}
                        className="gap-1.5 font-medium"
                      >
                        {file.visibility === 'public' ? (
                          <Unlock className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {file.visibility}
                      </Badge>
                      {encrypted && (
                        <Badge variant="secondary" className="gap-1 text-xs bg-primary/20 text-primary">
                          <Shield className="h-3 w-3" />
                          AES-256
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <BlobVerificationStatus
                      isEncrypted={encrypted}
                      isVerifying={isVerifying}
                      verificationResult={verificationResult}
                      onVerify={() => handleVerifyFile(file)}
                      showButton={false}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {encrypted && !corrupted && (
                        <Button
                          key={`verify-${file.id}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVerifyFile(file)}
                          disabled={isVerifying || isDownloading}
                          className="hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                          title="Verify file integrity"
                        >
                          {isVerifying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {!corrupted && (
                        <Button
                          key={`view-${file.id}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(file)}
                          disabled={isDownloading}
                          className="hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                          title="Preview file"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {!corrupted && (
                        <Button
                          key={`share-${file.id}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShare(file)}
                          disabled={isDownloading}
                          className="hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                          title="Share file"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        key={`delete-${file.id}`}
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(file)}
                        disabled={isDownloading}
                        className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:scale-110"
                        title={corrupted ? "Delete corrupted file" : "Delete file"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {shareModalFile && (
        <ShareModal
          file={shareModalFile}
          onClose={() => setShareModalFile(null)}
          onUpdate={onRefresh}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewFile(null);
          }}
          fileName={localFilesService.getFile(previewFile.id)?.name || previewFile.file_id || 'Unknown'}
          fileType={localFilesService.getFile(previewFile.id)?.type || 'application/octet-stream'}
          walrusHash={new Uint8Array()} // Not used anymore
          fileId={previewFile.id}
          onDownload={() => {
            console.log('Download button clicked for file:', previewFile.id);
            handleDownload(previewFile);
          }}
        />
      )}
    </>
  );
};
