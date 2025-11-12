import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { FileUploadArea } from '@/components/FileUploadArea';
import { FileListTable } from '@/components/FileListTable';
import { filesService } from '@/services/files';
import { walletService } from '@/services/wallet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cloud, Upload, FolderOpen, ArrowLeft, Wallet } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState(filesService.getAllFiles());
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    const { connected } = walletService.getState();
    setWalletConnected(connected);
  }, []);

  const refreshFiles = () => {
    setFiles(filesService.getAllFiles());
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 animate-pulse-slow" />
      
      {/* Header */}
      <header className="relative glass-effect border-b border-white/5 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-110"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 group">
              <Cloud className="h-8 w-8 text-primary transition-transform group-hover:scale-110 duration-300" />
              <span className="text-xl font-bold tracking-tight">WalrusBox</span>
            </div>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 relative">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight">Your Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Upload, manage, and share your encrypted files securely
            </p>
          </div>

          {!walletConnected && (
            <Card className="glass-effect p-8 border-primary/20 shadow-elevated animate-scale-in">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-xl mb-2 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Connect Your Wallet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your Nautilus wallet to unlock secure file storage
                  </p>
                </div>
                <WalletConnectButton />
              </div>
            </Card>
          )}

          <Tabs defaultValue="upload" className="w-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <TabsList className="glass-effect grid w-full max-w-md grid-cols-2 p-1.5 h-auto">
              <TabsTrigger 
                value="upload" 
                className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 py-3"
              >
                <Upload className="h-4 w-4" />
                <span className="font-medium">Upload</span>
              </TabsTrigger>
              <TabsTrigger 
                value="files" 
                className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 py-3"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="font-medium">My Files ({files.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <FileUploadArea />
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              <FileListTable files={files} onRefresh={refreshFiles} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
