import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Cloud, Upload, FolderOpen, ArrowLeft, Wallet, Download, Star, Clock, FolderPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const navigate = useNavigate();
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

  return (
    <DndProvider>
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <WalletConnectButton />
          </div>
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

          {!account?.address && (
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

          {/* Recent Files Section */}
          {account?.address && recentFiles.length > 0 && (
            <Card className="glass-effect p-6 border-primary/20 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Files
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {recentFiles.map((file) => (
                  <Card 
                    key={file.id} 
                    className="p-3 hover:bg-primary/5 transition-colors cursor-pointer"
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
            <div className="flex items-center justify-between mb-4">
              <TabsList className="glass-effect grid w-full max-w-2xl grid-cols-3 p-1.5 h-auto">
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
                  <span className="font-medium">All Files</span>
                  <Badge variant="secondary" className="ml-1">{files.length}</Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="favorites" 
                  className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 py-3"
                >
                  <Star className="h-4 w-4" />
                  <span className="font-medium">Favorites</span>
                  <Badge variant="secondary" className="ml-1">{favoriteFiles.length}</Badge>
                </TabsTrigger>
              </TabsList>

              {(activeTab === 'files' || activeTab === 'favorites') && (
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="gap-2 glass-effect border-primary/20"
                  disabled={filteredFiles.length === 0}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>
              )}
            </div>

            <TabsContent value="upload" className="mt-6">
              <FileUploadArea />
            </TabsContent>

            <TabsContent value="files" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Folder Tree Sidebar */}
                <Card className="glass-effect p-4 border-primary/20 lg:col-span-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
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
                <div className="lg:col-span-3 space-y-4">
                  {/* Breadcrumbs */}
                  {breadcrumbs.length > 0 && (
                    <FolderBreadcrumbs
                      items={breadcrumbs}
                      onNavigate={handleFolderSelect}
                    />
                  )}
                  
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
