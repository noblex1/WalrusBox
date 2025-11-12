import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { filesService, FileMetadata } from '@/services/files';
import { storageService } from '@/services/storage';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Cloud, 
  ArrowLeft, 
  Download, 
  Lock, 
  Unlock,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const FileView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFile = async () => {
      if (!id) return;

      const metadata = filesService.getFile(id);
      if (!metadata) {
        toast({
          title: "File Not Found",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setFile(metadata);

      try {
        const blob = await storageService.getBlob(id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setFileUrl(url);
        }
      } catch (error) {
        toast({
          title: "Could not load file",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadFile();

    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [id, navigate]);

  const handleDownload = () => {
    if (!fileUrl || !file) return;

    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = file.name;
    a.click();

    toast({
      title: "Download Started",
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-8 w-8" />;
    if (type.startsWith('video/')) return <Video className="h-8 w-8" />;
    if (type.startsWith('audio/')) return <Music className="h-8 w-8" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-8 w-8" />;
    return <FileIcon className="h-8 w-8" />;
  };

  const renderPreview = () => {
    if (!file || !fileUrl) return null;

    if (file.type.startsWith('image/')) {
      return (
        <div className="p-8">
          <img 
            src={fileUrl} 
            alt={file.name}
            className="max-w-full max-h-96 mx-auto rounded-lg shadow-elevated"
          />
        </div>
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <div className="p-8">
          <video 
            src={fileUrl} 
            controls
            className="max-w-full max-h-96 mx-auto rounded-lg shadow-elevated"
          />
        </div>
      );
    }

    if (file.type.startsWith('audio/')) {
      return (
        <div className="p-8">
          <audio 
            src={fileUrl} 
            controls
            className="w-full"
          />
        </div>
      );
    }

    return (
      <div className="text-center py-16">
        <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
          <div className="text-primary">
            {getFileIcon(file.type)}
          </div>
        </div>
        <p className="text-muted-foreground text-lg">
          Preview not available for this file type
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Download the file to view it
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading file...</p>
      </div>
    );
  }

  if (!file) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-20 animate-pulse-slow" />
      
      {/* Header */}
      <header className="relative glass-effect border-b border-white/5 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-110"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 group">
              <Cloud className="h-8 w-8 text-primary transition-transform group-hover:scale-110 duration-300" />
              <span className="text-xl font-bold tracking-tight">Web3Store</span>
            </div>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 relative">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* File Info Card */}
          <Card className="glass-effect p-8 border-primary/10 shadow-elevated animate-fade-in">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-primary/10">
                  {getFileIcon(file.type)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">{file.name}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-medium">{filesService.formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.uploadedAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <Badge 
                variant={file.visibility === 'public' ? 'default' : 'secondary'}
                className="gap-1.5 px-3 py-1.5"
              >
                {file.visibility === 'public' ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                <span className="font-medium">{file.visibility}</span>
              </Badge>
            </div>

            <Button 
              onClick={handleDownload}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-[1.02] font-semibold text-base py-6"
            >
              <Download className="mr-2 h-5 w-5" />
              Download File
            </Button>
          </Card>

          {/* Preview Card */}
          <Card className="glass-effect p-8 border-white/5 shadow-elevated animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Preview
            </h2>
            <div className="rounded-xl overflow-hidden bg-background/50 border border-white/5">
              {renderPreview()}
            </div>
          </Card>

          {/* Access Control */}
          {file.allowedWallets.length > 0 && (
            <Card className="glass-effect p-8 border-white/5 shadow-elevated animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Allowed Wallets
              </h2>
              <div className="flex flex-wrap gap-2">
                {file.allowedWallets.map((wallet) => (
                  <Badge key={wallet} variant="secondary" className="px-3 py-1.5 font-medium">
                    {wallet}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default FileView;
