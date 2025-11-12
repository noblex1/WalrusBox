// File Metadata Service
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  visibility: 'public' | 'private';
  allowedWallets: string[];
  encryptionStatus: 'pending' | 'encrypted' | 'failed';
}

const FILES_KEY = 'file_metadata';

export const filesService = {
  getAllFiles: (): FileMetadata[] => {
    const data = localStorage.getItem(FILES_KEY);
    if (!data) return [];
    
    const files = JSON.parse(data);
    // Convert date strings back to Date objects
    return files.map((f: any) => ({
      ...f,
      uploadedAt: new Date(f.uploadedAt)
    }));
  },

  getFile: (id: string): FileMetadata | null => {
    const files = filesService.getAllFiles();
    return files.find(f => f.id === id) || null;
  },

  addFile: (file: Omit<FileMetadata, 'id' | 'uploadedAt'>): FileMetadata => {
    const files = filesService.getAllFiles();
    const newFile: FileMetadata = {
      ...file,
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uploadedAt: new Date(),
    };
    
    files.push(newFile);
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    return newFile;
  },

  updateFile: (id: string, updates: Partial<FileMetadata>): void => {
    const files = filesService.getAllFiles();
    const index = files.findIndex(f => f.id === id);
    
    if (index !== -1) {
      files[index] = { ...files[index], ...updates };
      localStorage.setItem(FILES_KEY, JSON.stringify(files));
    }
  },

  deleteFile: (id: string): void => {
    const files = filesService.getAllFiles();
    const filtered = files.filter(f => f.id !== id);
    localStorage.setItem(FILES_KEY, JSON.stringify(filtered));
  },

  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
};
