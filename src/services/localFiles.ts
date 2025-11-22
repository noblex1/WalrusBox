/**
 * Local File Metadata Service
 * Stores file metadata in localStorage for mock/local storage mode
 * This complements the blockchain-based files.ts service
 */

export interface LocalFileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  visibility: 'public' | 'private';
  allowedWallets: string[];
  isEncrypted?: boolean;
  hasSealMetadata?: boolean;
  sealMetadataKey?: string;
  lastVerified?: Date;
  verificationStatus?: 'verified' | 'failed' | 'pending';
}

const LOCAL_FILES_KEY = 'walrusbox_local_files';

export const localFilesService = {
  /**
   * Store file metadata locally
   */
  saveFile: (metadata: LocalFileMetadata): void => {
    const files = localFilesService.getAllFiles();
    const existing = files.findIndex(f => f.id === metadata.id);
    
    if (existing >= 0) {
      files[existing] = metadata;
    } else {
      files.push(metadata);
    }
    
    localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(files));
  },

  /**
   * Get all local files
   */
  getAllFiles: (): LocalFileMetadata[] => {
    try {
      const stored = localStorage.getItem(LOCAL_FILES_KEY);
      if (!stored) return [];
      
      const files = JSON.parse(stored);
      return files.map((f: any) => ({
        ...f,
        uploadedAt: new Date(f.uploadedAt),
      }));
    } catch (error) {
      console.error('Error getting local files:', error);
      return [];
    }
  },

  /**
   * Get a specific file by ID
   */
  getFile: (id: string): LocalFileMetadata | null => {
    const files = localFilesService.getAllFiles();
    return files.find(f => f.id === id) || null;
  },

  /**
   * Delete a file
   */
  deleteFile: (id: string): void => {
    const files = localFilesService.getAllFiles();
    const filtered = files.filter(f => f.id !== id);
    localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(filtered));
  },

  /**
   * Format file size for display
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },
};
