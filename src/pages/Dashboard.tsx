import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SearchBar } from '@/components/SearchBar';
import { FileUploadArea } from '@/components/FileUploadArea';
import { FileListTable } from '@/components/FileListTable';
import { FolderTree } from '@/components/FolderTree';
import { FolderBreadcrumbs, BreadcrumbItem } from '@/components/FolderBreadcrumbs';
import { NewFolderModal } from '@/components/NewFolderModal';
import { DndProvider } from '@/components/DndProvider';
import { filesService, FileMetadata } from '@/services/files';
import { foldersService } from '@/services/folders';
import { favoritesService } from '@/services/favorites';
import { exportService } from '@/services/export';
import { useFileFilter } from '@/hooks/useFileFilter';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Cloud, Upload, FolderOpen, ArrowLeft, Wallet, Download, Star, Clock, FolderPlus, Settings, Shield, ShieldOff, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const account = useCurrentAccount();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Folder management
  const [folders, setFolders] = useState<ReturnType<typeof foldersService.getAllFolders>>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  
  // Encryption settings
  const [encryptByDefault, setEncryptByDefault] = useState(() => {
    const saved = localStorage.getItem('encrypt_by_default');
    return saved ? saved === 'true' : true;
  });
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  
  // File filtering
  const { filters, filteredFiles, setSearch, clearSearch, updateFilters } = useFileFilter(files);
  
  // Filter files by current folder
  const filesInCurrentFolder = filesService.getFilesInFolder(filteredFiles, currentFolderId);
  
  // Favorites
  const favoriteIds = favoritesService.getFavorites();
  const favoriteFiles = files.filter(f => favoriteIds.includes(f.id));
  
  // Recent files
  const recentIds = favoritesService.getRecentFiles();
  const recentFiles = files.filter(f => recentIds.includes(f.id)).slice(0, 5);
  
  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = account?.address 
    ? foldersService.getBreadcrumbs(account.address, currentFolderId)
    : [];
  
  // Calculate encryption statistics
  const encryptedFiles = files.filter(f => {
    const sealKey = localStorage.getItem(`seal_key_${f.id}`);
    return !!sealKey;
  });
  const unencryptedFiles = files.filter(f => {
    const sealKey = localStorage.getItem(`seal_key_${f.id}`);
    return !sealKey;
  });
  const encryptionPercentage = files.length > 0 
    ? Math.round((encryptedFiles.length / files.length) * 100) 
    : 0;

  useEffect(() => {
    // Load files and folders when wallet is connected
    if (account?.address) {
      loadFiles(account.address);
      loadFolders(account.address);
    } else {
      setFiles([]);
      setFolders([]);
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

  const loadFolders = (address: string) => {
    try {
      const folderList = foldersService.getAllFolders(address);
      setFolders(folderList);
    } catch (error) {
      console.error('Error loading folders:', error);
      setFolders([]);
    }
  };

  const refreshFiles = async () => {
    if (account?.address) {
      await loadFiles(account.address);
      loadFolders(account.address);
    }
  };

  // Folder operations
  const handleCreateFolder = async (name: string, color: string, parentId: string | null) => {
    if (!account?.address) return;
    
    try {
      foldersService.createFolder(account.address, name, parentId, color);
      loadFolders(account.address);
      toast({
        title: 'Folder Created',
        description: `"${name}" has been created successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Create Folder',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleFileDrop = (fileId: string, targetFolderId: string | null) => {
    try {
      filesService.moveFileToFolder(fileId, targetFolderId);
      const targetFolder = targetFolderId 
        ? folders.find(f => f.id === targetFolderId)
        : null;
      toast({
        title: 'File Moved',
        description: targetFolder 
          ? `File moved to "${targetFolder.name}"`
          : 'File moved to root',
      });
      refreshFiles();
    } catch (error) {
      toast({
        title: 'Failed to Move File',
        description: 'An error occurred while moving the file',
        variant: 'destructive',
      });
    }
  };

  const handleOpenNewFolderModal = (parentId: string | null) => {
    setNewFolderParentId(parentId);
    setShowNewFolderModal(true);
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

  // Export files
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

  // Handle encryption default toggle
  const handleEncryptByDefaultChange = (checked: boolean) => {
    setEncryptByDefault(checked);
    localStorage.setItem('encrypt_by_default', checked.toString());
    toast({
      title: 'Settings Updated',
      description: `Encryption is now ${checked ? 'enabled' : 'disabled'} by default`,
    });
  };

  // Handle bulk migration
  const handleBulkMigration = async () => {
    if (unencryptedFiles.length === 0) {
      toast({
        title: 'No Files to Migrate',
        description: 'All files are already encrypted',
      });
      return;
    }

    setIsMigrating(true);
    setMigrationProgress(0);

    try {
      // This is a placeholder - actual migration would need to:
      // 1. Download each unencrypted file
      // 2. Re-upload with encryption
      // 3. Update metadata
      // For now, we'll just simulate the process
      
      toast({
        title: 'Migration Not Yet Implemented',
        description: 'Bulk migration feature is coming soon. For now, please re-upload files individually with encryption enabled.',
        variant: 'default',
      });

      // Simulated progress for demonstration
      for (let i = 0; i <= 100; i += 10) {
        setMigrationProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      toast({
        title: 'Migration Failed',
        description: error instanceof Error ? error.message : 'Failed to migrate files',
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
      setMigrationProgress(0);
    }
  };

  return (
    <DndProvider>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-30 animate-pulse-slow" />
      
      {/* Header - Mobile Optimized */}
      <header className="sticky top-0 z-50 glass-effect border-b border-white/5 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-110 h-9 w-9 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2 group">
              <Cloud className="h-6 w-6 sm:h-8 sm:w-8 text-primary transition-transform group-hover:scale-110 duration-300" />
              <span className="text-base sm:text-xl font-bold tracking-tight">WalBox</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <WalletConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Optimized */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 relative">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3 tracking-tight">Your Dashboard</h1>
            <p className="text-sm sm:text-lg text-muted-foreground">
              Upload, manage, and share your encrypted files securely
            </p>
          </div>

          {!account?.address && (
            <Card className="glass-effect p-6 sm:p-8 border-primary/20 shadow-elevated animate-scale-in">
              <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left sm:justify-between">
                <div>
                  <h3 className="font-semibold text-lg sm:text-xl mb-2 flex items-center justify-center sm:justify-start gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Connect Your Wallet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your Sui wallet to unlock secure file storage
                  </p>
                </div>
                <WalletConnectButton />
              </div>
            </Card>
          )}

          {/* Recent Files Section - Mobile Optimized */}
          {account?.address && recentFiles.length > 0 && (
            <Card className="glass-effect p-4 sm:p-6 border-primary/20 animate-fade-in">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Recent Files
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {recentFiles.map((file) => (
                  <Card 
                    key={file.id} 
                    className="p-3 hover:bg-primary/5 transition-colors cursor-pointer min-h-[60px]"
                    onClick={() => setActiveTab('files')}
                  >
                    <p className="text-sm truncate font-medium">{file.file_id}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {file.uploadedAt.toLocaleDateString()}
                    </p>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4">
              <TabsList className="glass-effect grid w-full sm:max-w-3xl grid-cols-4 p-1 sm:p-1.5 h-auto">
                <TabsTrigger 
                  value="upload" 
                  className="gap-1 sm:gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 py-2.5 sm:py-3 text-xs sm:text-sm"
                >
                  <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="font-medium">Upload</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="files" 
                  className="gap-1 sm:gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 py-2.5 sm:py-3 text-xs sm:text-sm"
                >
                  <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="font-medium hidden xs:inline">All Files</span>
                  <span className="font-medium xs:hidden">Files</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">{files.length}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="favorites" 
                  className="gap-1 sm:gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 py-2.5 sm:py-3 text-xs sm:text-sm"
                >
                  <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="font-medium hidden xs:inline">Favorites</span>
                  <span className="font-medium xs:hidden">Fav</span>
                  <Badge variant="secondary" className="ml-0.5 sm:ml-1 text-xs">{favoriteFiles.length}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="gap-1 sm:gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 py-2.5 sm:py-3 text-xs sm:text-sm"
                >
                  <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="font-medium hidden xs:inline">Settings</span>
                  <span className="font-medium xs:hidden">Set</span>
                </TabsTrigger>
              </TabsList>

              {(activeTab === 'files' || activeTab === 'favorites') && (
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="gap-2 glass-effect border-primary/20 w-full sm:w-auto min-h-[44px]"
                  disabled={filteredFiles.length === 0}
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </Button>
              )}
            </div>

            <TabsContent value="upload" className="mt-6">
              <FileUploadArea />
            </TabsContent>

            <TabsContent value="files" className="mt-4 sm:mt-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Folder Tree Sidebar - Hidden on mobile, collapsible */}
                <Card className="glass-effect p-4 border-primary/20 lg:col-span-1 hidden lg:block">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      Folders
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenNewFolderModal(null)}
                      className="h-8 w-8 hover:bg-primary/10"
                      title="Create new folder"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FolderTree
                    folders={foldersService.toFolderNodes(folders)}
                    selectedFolderId={currentFolderId}
                    onFolderSelect={handleFolderSelect}
                    onCreateFolder={handleOpenNewFolderModal}
                    onFileDrop={handleFileDrop}
                  />
                </Card>

                {/* File List */}
                <div className="lg:col-span-3 space-y-3 sm:space-y-4">
                  {/* Breadcrumbs */}
                  {breadcrumbs.length > 0 && (
                    <FolderBreadcrumbs
                      items={breadcrumbs}
                      onNavigate={handleFolderSelect}
                    />
                  )}
                  
                  {/* Mobile Folder Button */}
                  <div className="lg:hidden">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenNewFolderModal(null)}
                      className="w-full gap-2 glass-effect border-primary/20 min-h-[44px]"
                    >
                      <FolderPlus className="h-4 w-4" />
                      New Folder
                    </Button>
                  </div>
                  
                  <SearchBar
                    value={filters.search}
                    onChange={setSearch}
                    onClear={clearSearch}
                    filters={filters}
                    onFilterChange={updateFilters}
                    placeholder="Search files..."
                  />
                  
                  <FileListTable files={filesInCurrentFolder} onRefresh={refreshFiles} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="favorites" className="mt-6">
              <FileListTable files={favoriteFiles} onRefresh={refreshFiles} />
            </TabsContent>

            <TabsContent value="settings" className="mt-6 space-y-6">
              {/* Encryption Settings Section */}
              <Card className="glass-effect p-6 border-primary/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Encryption Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your file encryption preferences
                    </p>
                  </div>
                </div>

                {/* Default Encryption Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-primary/10">
                    <div className="flex-1">
                      <Label htmlFor="encrypt-default" className="text-base font-medium cursor-pointer">
                        Enable Encryption by Default
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        New file uploads will be encrypted automatically
                      </p>
                    </div>
                    <Switch
                      id="encrypt-default"
                      checked={encryptByDefault}
                      onCheckedChange={handleEncryptByDefaultChange}
                    />
                  </div>

                  {/* Encryption Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 bg-card/50 border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{encryptedFiles.length}</p>
                          <p className="text-xs text-muted-foreground">Encrypted Files</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-card/50 border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <ShieldOff className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{unencryptedFiles.length}</p>
                          <p className="text-xs text-muted-foreground">Unencrypted Files</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-card/50 border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{encryptionPercentage}%</p>
                          <p className="text-xs text-muted-foreground">Encryption Rate</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Encryption Progress Bar */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall Encryption Status</span>
                        <span className="font-medium">{encryptionPercentage}%</span>
                      </div>
                      <Progress value={encryptionPercentage} className="h-2" />
                    </div>
                  )}

                  {/* Bulk Migration Tool */}
                  {unencryptedFiles.length > 0 && (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-3">
                        <RefreshCw className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-amber-500 mb-1">
                            Migrate Unencrypted Files
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            You have {unencryptedFiles.length} unencrypted file{unencryptedFiles.length !== 1 ? 's' : ''}. 
                            Migrate them to encrypted storage for better security.
                          </p>
                          {isMigrating && (
                            <div className="mb-3 space-y-2">
                              <Progress value={migrationProgress} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                Migrating files... {migrationProgress}%
                              </p>
                            </div>
                          )}
                          <Button
                            onClick={handleBulkMigration}
                            disabled={isMigrating}
                            variant="outline"
                            className="gap-2 border-amber-500/30 hover:bg-amber-500/10"
                          >
                            {isMigrating ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Migrating...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4" />
                                Migrate All Files
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      About Encryption
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Files are encrypted using AES-256-GCM encryption</li>
                      <li>• Encryption happens client-side before upload</li>
                      <li>• Large files are split into chunks for distributed storage</li>
                      <li>• Only you can decrypt your files with your encryption key</li>
                      <li>• Encryption keys are stored securely in your browser</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* New Folder Modal */}
      <NewFolderModal
        open={showNewFolderModal}
        parentFolderId={newFolderParentId}
        parentFolderName={
          newFolderParentId 
            ? folders.find(f => f.id === newFolderParentId)?.name 
            : undefined
        }
        onClose={() => setShowNewFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />
      </div>
    </DndProvider>
  );
};

export default Dashboard;
