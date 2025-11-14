import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, Sparkles, Shield, Zap } from 'lucide-react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StorageModeBanner } from '@/components/StorageModeBanner';
import { encryptionService } from '@/services/encryption';
import { storageService } from '@/services/storage';
import { filesService } from '@/services/files';
import { localFilesService } from '@/services/localFiles';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AnimatedCard, GlassCard } from '@/components/animated/AnimatedCard';
import { GlowButton } from '@/components/animated/GlowButton';

export const FileUploadArea3D = () => {
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
      const encryptedBlob = await encryptionService.encrypt(selectedFile);
      setUploadProgress(30);

      const walrusHash = await storageService.uploadToWalrus(
        encryptedBlob,
        selectedFile.name
      );
      setUploadProgress(60);

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
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

      await filesService.createFile(signerFunction, fileId, walrusHash);
      setUploadProgress(90);

      const keyId = encryptionService.generateKeyId();
      encryptionService.storeKeyMetadata(keyId, {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });
      
      localStorage.setItem(`key_${fileId}`, keyId);

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
      <StorageModeBanner />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatedCard
          glowColor={isDragging ? "#00FFF0" : "#0EA5E9"}
          intensity={isDragging ? "high" : "medium"}
          tiltEnabled={!isDragging}
        >
          <motion.div
            className={`relative overflow-hidden transition-all duration-300 ${
              isDragging ? 'scale-[1.02]' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            animate={{
              borderColor: isDragging ? 'rgba(0, 255, 240, 0.5)' : 'rgba(14, 165, 233, 0.2)',
            }}
          >
            <div className="p-16 text-center relative">
              {/* Animated background effect */}
              <AnimatePresence>
                {isDragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20"
                  />
                )}
              </AnimatePresence>

              {/* Upload Icon */}
              <motion.div
                className="inline-flex p-6 rounded-3xl bg-primary/10 mb-6 relative"
                animate={{
                  scale: isDragging ? 1.2 : 1,
                  rotate: isDragging ? [0, 10, -10, 0] : 0,
                }}
                transition={{ duration: 0.3 }}
              >
                <Upload className="h-16 w-16 text-primary" />
                {isDragging && (
                  <motion.div
                    className="absolute inset-0 rounded-3xl border-2 border-primary"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0, 1],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                    }}
                  />
                )}
              </motion.div>

              {/* Text Content */}
              <motion.div
                animate={{
                  y: isDragging ? -5 : 0,
                }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-2xl font-bold mb-3">
                  {isDragging ? 'Drop your file here' : 'Upload your file'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {isDragging
                    ? 'Release to select this file'
                    : 'Drag and drop your file or click to browse. Your file will be encrypted before upload.'}
                </p>
              </motion.div>

              {/* Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
              <GlowButton
                variant="secondary"
                size="lg"
                glowColor="#0EA5E9"
                onClick={() => fileInputRef.current?.click()}
                icon={<Sparkles className="h-5 w-5" />}
                iconPosition="left"
              >
                Select File
              </GlowButton>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                {[
                  { icon: Shield, text: 'AES-256 Encrypted' },
                  { icon: Zap, text: 'Instant Upload' },
                  { icon: Sparkles, text: 'Blockchain Verified' },
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full glass-effect border border-primary/20"
                  >
                    <feature.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatedCard>
      </motion.div>

      {/* Selected File Card */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard blur={30}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="p-4 rounded-2xl bg-primary/10"
                      animate={{
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <File className="h-10 w-10 text-primary" />
                    </motion.div>
                    <div>
                      <p className="font-bold text-xl mb-1">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {filesService.formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClear}
                      disabled={isUploading}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </div>

                {/* Progress Bar */}
                {isUploading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 space-y-3"
                  >
                    <div className="relative">
                      <Progress value={uploadProgress} className="h-3" />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{
                          x: ['-100%', '200%'],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <motion.p
                        className="text-sm font-semibold text-primary"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {uploadProgress < 30 && '🔐 Encrypting with Seal...'}
                        {uploadProgress >= 30 && uploadProgress < 60 && '☁️ Uploading to Walrus...'}
                        {uploadProgress >= 60 && uploadProgress < 90 && '⛓️ Creating on-chain record...'}
                        {uploadProgress >= 90 && uploadProgress < 100 && '💾 Finalizing...'}
                        {uploadProgress === 100 && '✅ Complete!'}
                      </motion.p>
                      <span className="text-sm font-bold text-primary">{uploadProgress}%</span>
                    </div>
                  </motion.div>
                )}

                {/* Upload Button */}
                <GlowButton
                  onClick={handleUpload}
                  disabled={isUploading}
                  variant="primary"
                  size="lg"
                  glowColor="#0EA5E9"
                  pulse={!isUploading}
                  className="w-full"
                  icon={isUploading ? undefined : <Upload className="h-5 w-5" />}
                  iconPosition="left"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-3">
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Uploading...
                    </span>
                  ) : (
                    'Upload & Encrypt File'
                  )}
                </GlowButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
