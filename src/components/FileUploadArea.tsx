import { useState, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { encryptionService } from '@/services/encryption';
import { storageService } from '@/services/storage';
import { filesService } from '@/services/files';
import { localFilesService } from '@/services/localFiles';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const FileUploadArea = () => {
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransactionBlock } = useSignAndExecuteTransactionBlock();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
    setUploadProgress(10);

    try {
      // Step 1: Encrypt file client-side using Seal
      const encryptedBlob = await encryptionService.encrypt(selectedFile);
      setUploadProgress(30);

      // Step 2: Upload encrypted blob to Walrus
      const walrusHash = await storageService.uploadToWalrus(
        encryptedBlob,
        selectedFile.name
      );
      setUploadProgress(60);

      // Step 3: Generate file ID and create FileObject on Sui blockchain
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a signer function that uses dApp Kit's signAndExecuteTransactionBlock
      const signerFunction = (tx: any, options?: any): Promise<string> => {
        return new Promise((resolve, reject) => {
          signAndExecuteTransactionBlock(
            {
              transactionBlock: tx,
              account: account,
              options: options || {
                showEffects: true,
                showEvents: true,
              },
            } as any,
            {
              onSuccess: (result: any) => resolve(result.digest || result.transactionDigest || ''),
              onError: reject,
            }
          );
        });
      };

      // Create file on-chain
      await filesService.createFile(signerFunction, fileId, walrusHash);
      setUploadProgress(90);

      // Step 4: Store encryption key metadata (client-side only)
      const keyId = encryptionService.generateKeyId();
      encryptionService.storeKeyMetadata(keyId, {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });
      
      // Store keyId mapping (in production, use a more secure storage mechanism)
      localStorage.setItem(`key_${fileId}`, keyId);

      // Step 5: Store local file metadata for sharing
      localFilesService.saveFile({
        id: fileId,
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
        description: `${selectedFile.name} has been encrypted and stored on-chain.`,
      });

      setTimeout(() => {
        navigate('/dashboard');
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

          {isUploading && (
            <div className="mb-6 space-y-3">
              <Progress value={uploadProgress} className="h-2" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-primary">
                  {uploadProgress < 30 && '🔐 Encrypting with Seal...'}
                  {uploadProgress >= 30 && uploadProgress < 60 && '☁️ Uploading to Walrus...'}
                  {uploadProgress >= 60 && uploadProgress < 90 && '⛓️ Creating on-chain record...'}
                  {uploadProgress >= 90 && uploadProgress < 100 && '💾 Finalizing...'}
                  {uploadProgress === 100 && '✅ Complete!'}
                </p>
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
              'Upload & Encrypt File'
            )}
          </Button>
        </Card>
      )}
    </div>
  );
};
