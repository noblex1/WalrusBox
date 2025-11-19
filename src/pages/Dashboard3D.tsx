import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SearchBar } from '@/components/SearchBar';
import { FileUploadArea3D } from '@/components/FileUploadArea3D';
import { FileListTable } from '@/components/FileListTable';
import { filesService, FileMetadata } from '@/services/files';
import { favoritesService } from '@/services/favorites';
import { exportService } from '@/services/export';
import { useFileFilter } from '@/hooks/useFileFilter';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Cloud, Upload, FolderOpen, ArrowLeft, Wallet, Download, Star, Clock, Zap, Shield, Database } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SimpleParticles } from '@/components/3d/ParticleField';
import { DotGrid } from '@/components/effects/GridBackground';
import { AnimatedCard, GlassCard } from '@/components/animated/AnimatedCard';
import { GlowButton } from '@/components/animated/GlowButton';

const Dashboard3D = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const account = useCurrentAccount();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // File filtering
  const { filters, filteredFiles, setSearch, clearSearch, updateFilters } = useFileFilter(files);
  
  // Favorites
  const favoriteIds = favoritesService.getFavorites();
  const favoriteFiles = files.filter(f => favoriteIds.includes(f.id));
  
  // Recent files
  const recentIds = favoritesService.getRecentFiles();
  const recentFiles = files.filter(f => recentIds.includes(f.id)).slice(0, 5);

  // Check for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const refreshFiles = async () => {
    if (account?.address) {
      await loadFiles(account.address);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'u',
      ctrl: true,
      callback: () => setActiveTab('upload'),
      description: 'Open upload tab',
    },
    {
      key: 'k',
      ctrl: true,
      callback: () => searchInputRef.current?.focus(),
      description: 'Focus search',
    },
    {
      key: 'r',
      ctrl: true,
      callback: refreshFiles,
      description: 'Refresh files',
    },
  ]);

  const handleExport = () => {
    try {
      exportService.exportToCSV(filteredFiles);
      toast({
        title: 'Files Exported',
        description: `Exported ${filteredFiles.length} files to CSV`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export files',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      {!prefersReducedMotion && (
        <>
          <SimpleParticles count={15} />
          <DotGrid opacity={0.15} spacing={40} />
        </>
      )}

      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-50"
      >
        <div className="glass-effect border-b border-primary/20 backdrop-blur-2xl">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div
                className="flex items-center gap-3 group cursor-pointer"
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/')}
              >
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Cloud className="h-10 w-10 text-primary drop-shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                </motion.div>
                <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  WalBox
                </span>
              </motion.div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-10 relative z-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Page Title */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Your Dashboard
            </h1>
            <p className="text-xl text-muted-foreground">
              Upload, manage, and share your encrypted files securely
            </p>
          </motion.div>

          {/* Wallet Connection Card */}
          {!account?.address && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <GlassCard blur={30}>
                <div className="p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="p-4 rounded-2xl bg-primary/10"
                      >
                        <Wallet className="h-8 w-8 text-primary" />
                      </motion.div>
                      <div>
                        <h3 className="font-bold text-2xl mb-2">Connect Your Wallet</h3>
                        <p className="text-muted-foreground">
                          Connect your Sui wallet to unlock secure file storage
                        </p>
                      </div>
                    </div>
                    <WalletConnectButton />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Stats Cards */}
          {account?.address && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                { icon: Database, label: 'Total Files', value: files.length, color: '#0EA5E9' },
                { icon: Star, label: 'Favorites', value: favoriteFiles.length, color: '#06B6D4' },
                { icon: Zap, label: 'Recent', value: recentFiles.length, color: '#8B5CF6' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <AnimatedCard glowColor={stat.color} intensity="medium">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                          <p className="text-4xl font-bold" style={{ color: stat.color }}>
                            {stat.value}
                          </p>
                        </div>
                        <motion.div
                          whileHover={{ rotate: 360, scale: 1.2 }}
                          transition={{ duration: 0.6 }}
                          className="p-3 rounded-xl bg-primary/10"
                        >
                          <stat.icon className="h-8 w-8" style={{ color: stat.color }} />
                        </motion.div>
                      </div>
                    </div>
                  </AnimatedCard>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Recent Files */}
          {account?.address && recentFiles.length > 0 && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <GlassCard>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold">Recent Files</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {recentFiles.map((file, i) => (
                      <motion.div
                        key={file.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.7 + i * 0.05 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        onClick={() => setActiveTab('files')}
                        className="p-4 rounded-xl glass-effect border border-primary/20 cursor-pointer hover:border-primary/40 transition-all"
                      >
                        <p className="text-sm truncate font-semibold mb-2">{file.file_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.uploadedAt.toLocaleDateString()}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Tabs Section */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="glass-effect grid w-full max-w-2xl grid-cols-3 p-2 h-auto border border-primary/20">
                  {[
                    { value: 'upload', icon: Upload, label: 'Upload' },
                    { value: 'files', icon: FolderOpen, label: 'All Files', badge: files.length },
                    { value: 'favorites', icon: Star, label: 'Favorites', badge: favoriteFiles.length },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 py-4 relative overflow-hidden group"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0"
                        initial={{ x: '-100%' }}
                        whileHover={{ x: '100%' }}
                        transition={{ duration: 0.6 }}
                      />
                      <tab.icon className="h-5 w-5 relative z-10" />
                      <span className="font-semibold relative z-10">{tab.label}</span>
                      {tab.badge !== undefined && (
                        <Badge variant="secondary" className="ml-1 relative z-10">
                          {tab.badge}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {(activeTab === 'files' || activeTab === 'favorites') && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GlowButton
                      variant="outline"
                      size="md"
                      glowColor="#0EA5E9"
                      onClick={handleExport}
                      disabled={filteredFiles.length === 0}
                      icon={<Download className="h-4 w-4" />}
                      iconPosition="left"
                    >
                      <span className="hidden sm:inline">Export CSV</span>
                    </GlowButton>
                  </motion.div>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabsContent value="upload" className="mt-0">
                    <FileUploadArea3D />
                  </TabsContent>

                  <TabsContent value="files" className="mt-0 space-y-6">
                    <SearchBar
                      value={filters.search}
                      onChange={setSearch}
                      onClear={clearSearch}
                      filters={filters}
                      onFilterChange={updateFilters}
                      placeholder="Search files..."
                    />
                    <FileListTable files={filteredFiles} onRefresh={refreshFiles} />
                  </TabsContent>

                  <TabsContent value="favorites" className="mt-0">
                    <FileListTable files={favoriteFiles} onRefresh={refreshFiles} />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard3D;
