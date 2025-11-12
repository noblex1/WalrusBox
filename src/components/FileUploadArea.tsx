import { useState, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { encryptionService } from '@/services/encryption';
import { storageService } from '@/services/storage';
import { filesService } from '@/services/files';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const FileUploadArea = () => {
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

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Create file metadata
      const metadata = filesService.addFile({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        visibility: 'private',
        allowedWallets: [],
        encryptionStatus: 'pending',
      });

      setUploadProgress(30);

      // Simulate encryption
      const encryptedBlob = await encryptionService.encrypt(selectedFile);
      setUploadProgress(70);

      // Store in IndexedDB
      await storageService.storeBlob(metadata.id, encryptedBlob);
      setUploadProgress(90);

      // Update encryption status
      filesService.updateFile(metadata.id, { encryptionStatus: 'encrypted' });
      setUploadProgress(100);

      toast({
        title: "File Uploaded Successfully",
        description: `${selectedFile.name} has been encrypted and stored.`,
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 500);

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Could not upload file",
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
                  {uploadProgress < 30 && '🔄 Preparing file...'}
                  {uploadProgress >= 30 && uploadProgress < 70 && '🔐 Encrypting with 256-bit AES...'}
                  {uploadProgress >= 70 && uploadProgress < 100 && '☁️ Storing securely...'}
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
