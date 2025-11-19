import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SearchBar } from '@/components/SearchBar';
import { FileUploadArea } from '@/components/FileUploadArea';
import { FileListTable } from '@/components/FileListTable';
import { filesService, FileMetadata } from '@/services/files';
import { favoritesService } from '@/services/favorites';
import { exportService } from '@/services/export';
import { useFileFilter } from '@/hooks/useFileFilter';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Cloud, Upload, FolderOpen, ArrowLeft, Wallet, Download, Star, Clock, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { MeshGradient } from '@/components/animations/MeshGradient';
import { FloatingElements, FlowingParticles } from '@/components/animations/FloatingElements';
import { TextReveal, ScaleFade } from '@/components/animations/TextReveal';
import { InteractiveGrid } from '@/components/animations/InteractiveGrid';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const account = useCurrentAccount();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { filters, filteredFiles, setSearch, clearSearch, updateFilters } = useFileFilter(files);
  
  const favoriteIds = favoritesService.getFavorites();
  const favoriteFiles = files.filter(f => favoriteIds.includes(f.id));
  
  const recentIds = favoritesService.getRecentFiles();
  const recentFiles = files.filter(f => recentIds.includes(f.id)).slice(0, 5);

  useEffect(() => {
    if (account?.address) {
      loadFiles(account.address);
    } else {
      setFiles([]);
    }
  }, [account?.address]);

  // Refresh files when navigating from upload with refresh state
  useEffect(() => {
    if (location.state?.refresh && account?.address) {
      loadFiles(account.address);
      // Clear the state to prevent repeated refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, account?.address]);

  const loadFiles = async (address: string) => {
    setIsLoadingFiles(true);
    try {
      const fileList = await filesService.getAllFiles(address);
      setFiles(fileList);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleRefresh = () => {
    if (account?.address) {
      loadFiles(account.address);
      toast({ title: "Files Refreshed" });
    }
  };

  const handleExport = () => {
    exportService.exportToCSV(files);
    toast({ title: "Files Exported", description: "Downloaded as CSV" });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'k') {
          e.preventDefault();
          searchInputRef.current?.focus();
        } else if (e.key === 'r') {
          e.preventDefault();
          handleRefresh();
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <MeshGradient colors={['#0EA5E9', '#8B5CF6', '#EC4899']} speed={0.2} />
      <FloatingElements count={15} />
      <FlowingParticles count={40} />
      <InteractiveGrid />
      
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-50"
      >
        <div className="glass-effect border-b border-primary/10 backdrop-blur-2xl">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <motion.div
              className="flex items-center gap-3 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/')}
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                <Cloud className="h-10 w-10 text-primary drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
              </motion.div>
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                WalBox
              </span>
            </motion.div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/analytics')}
                className="gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Analytics
              </Button>
              <ThemeToggle />
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {!account?.address ? (
          <ScaleFade delay={0.2}>
            <Card className="glass-effect p-16 text-center border-primary/20 max-w-2xl mx-auto">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex p-6 rounded-full bg-primary/10 mb-6"
              >
                <Wallet className="h-16 w-16 text-primary" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-8">
                Connect your Sui wallet to start uploading and managing your files
              </p>
              <WalletConnectButton />
            </Card>
          </ScaleFade>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ScaleFade delay={0.1}>
                <motion.div whileHover={{ scale: 1.05, y: -5 }}>
                  <Card className="glass-effect p-6 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Files</p>
                        <p className="text-3xl font-bold text-primary">{files.length}</p>
                      </div>
                      <FolderOpen className="h-12 w-12 text-primary opacity-50" />
                    </div>
                  </Card>
                </motion.div>
              </ScaleFade>

              <ScaleFade delay={0.2}>
                <motion.div whileHover={{ scale: 1.05, y: -5 }}>
                  <Card className="glass-effect p-6 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Favorites</p>
                        <p className="text-3xl font-bold text-accent">{favoriteFiles.length}</p>
                      </div>
                      <Star className="h-12 w-12 text-accent opacity-50" />
                    </div>
                  </Card>
                </motion.div>
              </ScaleFade>

              <ScaleFade delay={0.3}>
                <motion.div whileHover={{ scale: 1.05, y: -5 }}>
                  <Card className="glass-effect p-6 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Recent</p>
                        <p className="text-3xl font-bold text-secondary">{recentFiles.length}</p>
                      </div>
                      <Clock className="h-12 w-12 text-secondary opacity-50" />
                    </div>
                  </Card>
                </motion.div>
              </ScaleFade>
            </div>

            {/* Search Bar */}
            <TextReveal delay={0.4}>
              <div ref={searchInputRef}>
                <SearchBar
                  value={filters.search || ''}
                  onChange={setSearch}
                  onClear={clearSearch}
                  filters={filters}
                  onFilterChange={updateFilters}
                />
              </div>
            </TextReveal>

            {/* Tabs */}
            <ScaleFade delay={0.5}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="glass-effect border border-primary/20">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    My Files
                    {files.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {files.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="favorites" className="gap-2">
                    <Star className="h-4 w-4" />
                    Favorites
                    {favoriteFiles.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {favoriteFiles.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <FileUploadArea />
                  </motion.div>
                </TabsContent>

                <TabsContent value="files" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">All Files</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleRefresh}>
                          Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                    <FileListTable files={filteredFiles} onRefresh={handleRefresh} />
                  </motion.div>
                </TabsContent>

                <TabsContent value="favorites" className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className="text-xl font-semibold mb-4">Favorite Files</h3>
                    <FileListTable files={favoriteFiles} onRefresh={handleRefresh} />
                  </motion.div>
                </TabsContent>
              </Tabs>
            </ScaleFade>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
