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

  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleDelete = async (file: FileMetadata) => {
    try {
      await storageService.deleteBlob(file.id);
      localFilesService.deleteFile(file.id);
      onRefresh();
      toast({
        title: "File Deleted",
        description: "File has been removed.",
      });
    } catch (error) {
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

  const handleDownload = async (file: FileMetadata) => {
    try {
      if (!file.id) {
        toast({
          title: "Cannot Download",
          description: "File ID is missing. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      const localFile = localFilesService.getFile(file.id);
      if (!localFile) {
        toast({
          title: "File Not Found",
          description: "File metadata not found. The file may not have been uploaded properly.",
          variant: "destructive",
        });
        return;
      }

      console.log('Downloading file:', file.id, 'Name:', localFile.name);

      // Check if file is encrypted with Seal
      const sealKey = localStorage.getItem(`seal_key_${file.id}`);
      
      let blob: Blob;
      
      if (sealKey) {
        console.log('Downloading encrypted file with Seal');
        const sealMetadataStr = localStorage.getItem(`seal_metadata_${file.id}`);
        
        if (!sealMetadataStr) {
          toast({
            title: "Cannot Download",
            description: "Encryption metadata not found. Please re-upload the file.",
            variant: "destructive",
          });
          return;
        }

        const sealMetadata = JSON.parse(sealMetadataStr);
        console.log('Seal metadata:', sealMetadata);
        
        blob = await sealStorageService.downloadFile(sealMetadata, {
          decrypt: true,
          encryptionKey: sealKey,
          verifyIntegrity: true,
        });
        
        console.log('File decrypted, size:', blob.size);
      } else {
        console.log('Downloading unencrypted file');
        // Try IndexedDB first
        let blobFromStorage = await storageService.getBlob(file.id);
        
        if (!blobFromStorage) {
          console.log('Not in IndexedDB, trying Walrus');
          // Try to download from Walrus using the walrus hash
          if (file.walrus_object_hash && file.walrus_object_hash.length > 0) {
            blobFromStorage = await storageService.downloadFromWalrus(file.walrus_object_hash);
          } else {
            // Try using blob metadata
            const blobMetadata = storageService.getBlobMetadata(file.id);
            if (blobMetadata && blobMetadata.blobId) {
              const walrusHash = new TextEncoder().encode(blobMetadata.blobId);
              blobFromStorage = await storageService.downloadFromWalrus(walrusHash);
            }
          }
        }
        
        if (!blobFromStorage) {
          toast({
            title: "File Not Found",
            description: "Could not find file data. It may have been deleted or expired.",
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
      a.download = localFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `Downloading ${localFile.name}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Could not download file",
        variant: "destructive",
      });
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
          action: {
            label: "Re-upload",
            onClick: () => handleReuploadCorrupted(file)
          }
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
    let successCount = 0;
    let failCount = 0;

    for (const file of encryptedFiles) {
      const sealMetadataKey = `seal_metadata_${file.id}`;
      const sealMetadataStr = localStorage.getItem(sealMetadataKey);
      
      if (!sealMetadataStr) continue;

      try {
        const sealMetadata: SealFileMetadata = JSON.parse(sealMetadataStr);
        const result = await sealStorageService.verifyFile(sealMetadata, false);
        
        setVerificationResults(prev => new Map(prev).set(file.id, result));
        
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
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
              
              return (
                <TableRow 
                  key={file.id} 
                  className={`hover:bg-primary/5 transition-colors duration-200 border-white/5 animate-fade-in ${
                    corrupted ? 'bg-destructive/5' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TableCell className="font-medium">
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
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {localFilesService.getFile(file.id)?.size 
                      ? localFilesService.formatFileSize(localFilesService.getFile(file.id)!.size)
                      : 'Unknown'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {file.uploadedAt.toLocaleDateString()}
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
                    {encrypted ? (
                      <div className="flex items-center gap-2">
                        {isVerifying ? (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Verifying...
                          </Badge>
                        ) : verificationResult ? (
                          <>
                            <Badge 
                              variant={verificationResult.success ? "default" : "destructive"}
                              className="gap-1 text-xs"
                            >
                              {verificationResult.success ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Verified
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  Failed
                                </>
                              )}
                            </Badge>
                            {verificationResult.verifiedAt && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(verificationResult.verifiedAt).toLocaleTimeString()}
                              </span>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            Not Verified
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {encrypted && !corrupted && (
                        <Button
                          key={`verify-${file.id}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVerifyFile(file)}
                          disabled={isVerifying}
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
          fileType={localFilesService.getFile(previewFile.id)?.type}
          walrusHash={new Uint8Array()} // Not used anymore
          fileId={previewFile.id}
          onDownload={() => handleDownload(previewFile)}
        />
      )}
    </>
  );
};
