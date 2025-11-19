import { useState, useRef } from 'react';
import { Upload, File, X, Lock, Unlock, Info } from 'lucide-react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { encryptionService } from '@/services/encryption';
import { storageService } from '@/services/storage';
import { filesService } from '@/services/files';
import { localFilesService } from '@/services/localFiles';
import { sealStorageService } from '@/services/seal/sealStorage';
import type { UploadProgress as SealUploadProgress } from '@/services/seal/sealTypes';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const FileUploadArea = () => {
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransactionBlock } = useSignAndExecuteTransactionBlock();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useEncryption, setUseEncryption] = useState(true);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [currentChunk, setCurrentChunk] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Check wallet connection
    if (!account?.address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Sui wallet to upload files",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage('');
    setCurrentChunk(0);
    setTotalChunks(0);

    try {
      if (useEncryption) {
        // Use Seal for encrypted upload with chunking
        const result = await sealStorageService.uploadFile(selectedFile, {
          encrypt: true,
          userAddress: account.address,
          epochs: 5,
          onProgress: (progress: SealUploadProgress) => {
            setUploadProgress(progress.percentage);
            setUploadStage(progress.stage);
            setCurrentChunk(progress.currentChunk || 0);
            setTotalChunks(progress.totalChunks || 0);
          }
        });

        setUploadProgress(75);
        setUploadStage('Creating on-chain record...');

        // Create on-chain Sui FileObject (triggers wallet popup)
        let createdObjectId: string | null = null;
        const signerFunction = (tx: any, options?: any): Promise<string> => {
          return new Promise((resolve, reject) => {
            signAndExecuteTransactionBlock(
              {
                transactionBlock: tx,
                account: account,
                options: options || {
                  showEffects: true,
                  showEvents: true,
                  showObjectChanges: true,
                },
              } as any,
              {
                onSuccess: (result: any) => {
                  console.log('Transaction result:', result);
                  // Extract created object ID from transaction result
                  if (result.effects?.created && result.effects.created.length > 0) {
                    createdObjectId = result.effects.created[0].reference.objectId;
                  } else if (result.objectChanges) {
                    const created = result.objectChanges.find((change: any) => change.type === 'created');
                    if (created) {
                      createdObjectId = created.objectId;
                    }
                  }
                  resolve(result.digest || result.transactionDigest || '');
                },
                onError: reject,
              }
            );
          });
        };

        // Convert blobId string to Uint8Array for on-chain storage
        const blobIdBytes = new TextEncoder().encode(result.blobIds[0]);
        await filesService.createFile(signerFunction, result.metadata.fileId, blobIdBytes);
        setUploadProgress(90);

        // Use the created object ID or fall back to the file ID
        const objectId = createdObjectId || result.metadata.fileId;
        console.log('File created with object ID:', objectId);

        // Store encryption key securely using the object ID
        if (result.encryptionKey) {
          localStorage.setItem(`seal_key_${objectId}`, result.encryptionKey);
        }

        // Store Seal metadata for download/verification using the object ID
        const updatedMetadata = { ...result.metadata, fileId: objectId };
        localStorage.setItem(`seal_metadata_${objectId}`, JSON.stringify(updatedMetadata));

        // Store local file metadata using the object ID
        localFilesService.saveFile({
          id: objectId,
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          uploadedAt: new Date(),
          visibility: 'private',
          allowedWallets: [],
        });

        setUploadProgress(100);

        toast({
          title: "File Uploaded Successfully",
          description: `${selectedFile.name} has been encrypted and stored securely.`,
        });

        // Clear selected file and reset state
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Navigate to files tab and trigger refresh
        setTimeout(() => {
          navigate('/dashboard', { state: { refresh: true, tab: 'files' } });
        }, 500);
      } else {
        // Use legacy unencrypted upload
        setUploadStage('uploading');
        setUploadProgress(10);

        const encryptedBlob = await encryptionService.encrypt(selectedFile);
        setUploadProgress(30);

        const walrusHash = await storageService.uploadToWalrus(
          encryptedBlob,
          selectedFile.name
        );
        setUploadProgress(60);

        const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        let createdObjectIdLegacy: string | null = null;
        const signerFunction = (tx: any, options?: any): Promise<string> => {
          return new Promise((resolve, reject) => {
            signAndExecuteTransactionBlock(
              {
                transactionBlock: tx,
                account: account,
                options: options || {
                  showEffects: true,
                  showEvents: true,
                  showObjectChanges: true,
                },
              } as any,
              {
                onSuccess: (result: any) => {
                  console.log('Transaction result:', result);
                  // Extract created object ID from transaction result
                  if (result.effects?.created && result.effects.created.length > 0) {
                    createdObjectIdLegacy = result.effects.created[0].reference.objectId;
                  } else if (result.objectChanges) {
                    const created = result.objectChanges.find((change: any) => change.type === 'created');
                    if (created) {
                      createdObjectIdLegacy = created.objectId;
                    }
                  }
                  resolve(result.digest || result.transactionDigest || '');
                },
                onError: reject,
              }
            );
          });
        };

        await filesService.createFile(signerFunction, fileId, walrusHash);
        setUploadProgress(90);

        // Use the created object ID or fall back to the file ID
        const objectId = createdObjectIdLegacy || fileId;
        console.log('File created with object ID:', objectId);

        const keyId = encryptionService.generateKeyId();
        encryptionService.storeKeyMetadata(keyId, {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        });
        
        localStorage.setItem(`key_${objectId}`, keyId);

        localFilesService.saveFile({
          id: objectId,
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          uploadedAt: new Date(),
          visibility: 'private',
          allowedWallets: [],
        });

        setUploadProgress(100);

        toast({
          title: "File Uploaded Successfully",
          description: `${selectedFile.name} has been stored on-chain.`,
        });
      }

      // Clear selected file and reset state
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Navigate to files tab and trigger refresh
      setTimeout(() => {
        navigate('/dashboard', { state: { refresh: true, tab: 'files' } });
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      setCurrentChunk(0);
      setTotalChunks(0);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card
        className={`glass-effect border-2 border-dashed transition-all duration-300 ${
          isDragging 
            ? 'border-primary bg-primary/10 scale-[1.02] shadow-glow' 
            : 'border-white/10 hover:border-primary/40 hover:shadow-soft'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-16 text-center">
          <div className={`inline-flex p-4 rounded-2xl bg-primary/10 mb-6 transition-all duration-300 ${isDragging ? 'scale-110 rotate-6' : ''}`}>
            <Upload className={`h-12 w-12 text-primary transition-all duration-300 ${isDragging ? 'animate-bounce' : ''}`} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Drop your file here</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Drag and drop your file or click to browse from your computer.
            Your file will be encrypted before upload.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="glass-effect border-primary/30 hover:border-primary/60 hover:shadow-glow-sm transition-all duration-300 px-8"
          >
            <Upload className="h-4 w-4 mr-2" />
            Select File
          </Button>
        </div>
      </Card>

      {selectedFile && (
        <Card className="glass-effect p-6 border-primary/20 shadow-elevated animate-scale-in">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <File className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {filesService.formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={isUploading}
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Encryption Toggle */}
          <div className="mb-6 p-4 rounded-lg bg-card/50 border border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${useEncryption ? 'bg-primary/20' : 'bg-muted/50'}`}>
                  {useEncryption ? (
                    <Lock className="h-5 w-5 text-primary" />
                  ) : (
                    <Unlock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Label htmlFor="encryption-toggle" className="text-base font-medium cursor-pointer">
                    Client-Side Encryption
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {useEncryption ? 'File will be encrypted before upload' : 'File will be uploaded without encryption'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        {useEncryption 
                          ? 'Your file will be encrypted using AES-256-GCM encryption, split into chunks, and stored securely on Walrus. Only you can decrypt it.'
                          : 'Your file will be stored without encryption. Anyone with the blob ID can access it.'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Switch
                  id="encryption-toggle"
                  checked={useEncryption}
                  onCheckedChange={setUseEncryption}
                  disabled={isUploading}
                />
              </div>
            </div>
          </div>

          {isUploading && (
            <div className="mb-6 space-y-3">
              <Progress value={uploadProgress} className="h-2" />
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-primary">
                    {uploadStage === 'encrypting' && '🔐 Encrypting file...'}
                    {uploadStage === 'chunking' && '✂️ Splitting into chunks...'}
                    {uploadStage === 'uploading' && totalChunks > 1 && `☁️ Uploading chunk ${currentChunk}/${totalChunks}...`}
                    {uploadStage === 'uploading' && totalChunks <= 1 && '☁️ Uploading to Walrus...'}
                    {uploadStage === 'complete' && '✅ Complete!'}
                    {uploadStage === 'error' && '❌ Upload failed'}
                    {!uploadStage && uploadProgress < 30 && '🔐 Encrypting...'}
                    {!uploadStage && uploadProgress >= 30 && uploadProgress < 60 && '☁️ Uploading...'}
                    {!uploadStage && uploadProgress >= 60 && uploadProgress < 90 && '⛓️ Creating on-chain record...'}
                    {!uploadStage && uploadProgress >= 90 && uploadProgress < 100 && '💾 Finalizing...'}
                    {!uploadStage && uploadProgress === 100 && '✅ Complete!'}
                  </p>
                  {useEncryption && totalChunks > 1 && uploadStage === 'uploading' && (
                    <p className="text-xs text-muted-foreground">
                      Encrypted file split into {totalChunks} chunks for distributed storage
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-primary">{uploadProgress}%</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-[1.02] font-semibold text-base py-6"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </span>
            ) : (
              <>
                {useEncryption ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Upload with Encryption
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </>
                )}
              </>
            )}
          </Button>
        </Card>
      )}
    </div>
  );
};
