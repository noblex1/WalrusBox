import { describe, it, expect, beforeEach } from 'vitest';
import { foldersService } from './folders';
import { filesService, FileMetadata } from './files';

describe('Files and Folders Integration', () => {
  const testOwner = '0x1234567890abcdef';
  
  beforeEach(() => {
    localStorage.clear();
  });

  describe('moveFileToFolder', () => {
    it('should move file to a folder', () => {
      const folder = foldersService.createFolder(testOwner, 'Documents', null);
      const fileId = 'test-file-1';
      
      filesService.moveFileToFolder(fileId, folder.id);
      
      const folderId = filesService.getFileFolderId(fileId);
      expect(folderId).toBe(folder.id);
    });

    it('should move file to root (null folder)', () => {
      const folder = foldersService.createFolder(testOwner, 'Documents', null);
      const fileId = 'test-file-1';
      
      // First move to folder
      filesService.moveFileToFolder(fileId, folder.id);
      
      // Then move to root
      filesService.moveFileToFolder(fileId, null);
      
      const folderId = filesService.getFileFolderId(fileId);
      expect(folderId).toBeNull();
    });

    it('should handle moving file between folders', () => {
      const folder1 = foldersService.createFolder(testOwner, 'Folder1', null);
      const folder2 = foldersService.createFolder(testOwner, 'Folder2', null);
      const fileId = 'test-file-1';
      
      filesService.moveFileToFolder(fileId, folder1.id);
      expect(filesService.getFileFolderId(fileId)).toBe(folder1.id);
      
      filesService.moveFileToFolder(fileId, folder2.id);
      expect(filesService.getFileFolderId(fileId)).toBe(folder2.id);
    });
  });

  describe('getFilesInFolder', () => {
    it('should return files in root folder', () => {
      const mockFiles: FileMetadata[] = [
        {
          id: 'file1',
          file_id: 'file1',
          walrus_object_hash: new Uint8Array(),
          owner: testOwner,
          visibility: 'public',
          allowedWallets: [],
          uploadedAt: new Date(),
        },
        {
          id: 'file2',
          file_id: 'file2',
          walrus_object_hash: new Uint8Array(),
          owner: testOwner,
          visibility: 'public',
          allowedWallets: [],
          uploadedAt: new Date(),
        },
      ];
      
      const filesInRoot = filesService.getFilesInFolder(mockFiles, null);
      expect(filesInRoot).toHaveLength(2);
    });

    it('should return files in specific folder', () => {
      const folder = foldersService.createFolder(testOwner, 'Documents', null);
      
      const mockFiles: FileMetadata[] = [
        {
          id: 'file1',
          file_id: 'file1',
          walrus_object_hash: new Uint8Array(),
          owner: testOwner,
          visibility: 'public',
          allowedWallets: [],
          uploadedAt: new Date(),
        },
        {
          id: 'file2',
          file_id: 'file2',
          walrus_object_hash: new Uint8Array(),
          owner: testOwner,
          visibility: 'public',
          allowedWallets: [],
          uploadedAt: new Date(),
        },
      ];
      
      // Move file1 to folder
      filesService.moveFileToFolder('file1', folder.id);
      
      const filesInFolder = filesService.getFilesInFolder(mockFiles, folder.id);
      expect(filesInFolder).toHaveLength(1);
      expect(filesInFolder[0].id).toBe('file1');
    });

    it('should return empty array when folder has no files', () => {
      const folder = foldersService.createFolder(testOwner, 'Empty', null);
      
      const mockFiles: FileMetadata[] = [];
      
      const filesInFolder = filesService.getFilesInFolder(mockFiles, folder.id);
      expect(filesInFolder).toHaveLength(0);
    });
  });

  describe('folder and file organization workflow', () => {
    it('should organize files into nested folder structure', () => {
      // Create folder hierarchy
      const documents = foldersService.createFolder(testOwner, 'Documents', null);
      const projects = foldersService.createFolder(testOwner, 'Projects', documents.id);
      const work = foldersService.createFolder(testOwner, 'Work', projects.id);
      
      // Create mock files
      const mockFiles: FileMetadata[] = [
        {
          id: 'file1',
          file_id: 'file1',
          walrus_object_hash: new Uint8Array(),
          owner: testOwner,
          visibility: 'public',
          allowedWallets: [],
          uploadedAt: new Date(),
        },
        {
          id: 'file2',
          file_id: 'file2',
          walrus_object_hash: new Uint8Array(),
          owner: testOwner,
          visibility: 'public',
          allowedWallets: [],
          uploadedAt: new Date(),
        },
        {
          id: 'file3',
          file_id: 'file3',
          walrus_object_hash: new Uint8Array(),
          owner: testOwner,
          visibility: 'public',
          allowedWallets: [],
          uploadedAt: new Date(),
        },
      ];
      
      // Organize files
      filesService.moveFileToFolder('file1', documents.id);
      filesService.moveFileToFolder('file2', projects.id);
      filesService.moveFileToFolder('file3', work.id);
      
      // Verify organization
      expect(filesService.getFilesInFolder(mockFiles, documents.id)).toHaveLength(1);
      expect(filesService.getFilesInFolder(mockFiles, projects.id)).toHaveLength(1);
      expect(filesService.getFilesInFolder(mockFiles, work.id)).toHaveLength(1);
      expect(filesService.getFilesInFolder(mockFiles, null)).toHaveLength(0);
    });

    it('should handle moving files when folder is moved', () => {
      const folder1 = foldersService.createFolder(testOwner, 'Folder1', null);
      const folder2 = foldersService.createFolder(testOwner, 'Folder2', null);
      
      const mockFiles: FileMetadata[] = [
        {
          id: 'file1',
          file_id: 'file1',
          walrus_object_hash: new Uint8Array(),
          owner: testOwner,
          visibility: 'public',
          allowedWallets: [],
          uploadedAt: new Date(),
        },
      ];
      
      // Put file in folder1
      filesService.moveFileToFolder('file1', folder1.id);
      
      // Move folder1 into folder2
      foldersService.moveFolder(testOwner, folder1.id, folder2.id);
      
      // File should still be in folder1
      expect(filesService.getFileFolderId('file1')).toBe(folder1.id);
      
      // Verify folder1 is now under folder2
      const folder1Updated = foldersService.getFolder(testOwner, folder1.id);
      expect(folder1Updated?.parentId).toBe(folder2.id);
    });

    it('should handle deleting folder with files', () => {
      const folder = foldersService.createFolder(testOwner, 'ToDelete', null);
      
      // Add files to folder
      filesService.moveFileToFolder('file1', folder.id);
      filesService.moveFileToFolder('file2', folder.id);
      
      // Delete folder
      foldersService.deleteFolder(testOwner, folder.id);
      
      // Verify folder is deleted
      const folders = foldersService.getAllFolders(testOwner);
      expect(folders).toHaveLength(0);
      
      // Files still have folder references (would need cleanup in real app)
      expect(filesService.getFileFolderId('file1')).toBe(folder.id);
    });
  });

  describe('folder hierarchy with files', () => {
    it('should maintain file organization through folder renames', () => {
      const folder = foldersService.createFolder(testOwner, 'OldName', null);
      
      const mockFiles: FileMetadata[] = [
        {
          id: 'file1',
          file_id: 'file1',
          walrus_object_hash: new Uint8Array(),
          owner: testOwner,
          visibility: 'public',
          allowedWallets: [],
          uploadedAt: new Date(),
        },
      ];
      
      filesService.moveFileToFolder('file1', folder.id);
      
      // Rename folder
      foldersService.renameFolder(testOwner, folder.id, 'NewName');
      
      // File should still be in the folder
      expect(filesService.getFileFolderId('file1')).toBe(folder.id);
      expect(filesService.getFilesInFolder(mockFiles, folder.id)).toHaveLength(1);
    });

    it('should support complex folder hierarchy with multiple files', () => {
      // Create 3-level hierarchy
      const level1 = foldersService.createFolder(testOwner, 'Level1', null);
      const level2 = foldersService.createFolder(testOwner, 'Level2', level1.id);
      const level3 = foldersService.createFolder(testOwner, 'Level3', level2.id);
      
      const mockFiles: FileMetadata[] = Array.from({ length: 6 }, (_, i) => ({
        id: `file${i + 1}`,
        file_id: `file${i + 1}`,
        walrus_object_hash: new Uint8Array(),
        owner: testOwner,
        visibility: 'public' as const,
        allowedWallets: [],
        uploadedAt: new Date(),
      }));
      
      // Distribute files across folders
      filesService.moveFileToFolder('file1', level1.id);
      filesService.moveFileToFolder('file2', level1.id);
      filesService.moveFileToFolder('file3', level2.id);
      filesService.moveFileToFolder('file4', level2.id);
      filesService.moveFileToFolder('file5', level3.id);
      filesService.moveFileToFolder('file6', level3.id);
      
      // Verify distribution
      expect(filesService.getFilesInFolder(mockFiles, level1.id)).toHaveLength(2);
      expect(filesService.getFilesInFolder(mockFiles, level2.id)).toHaveLength(2);
      expect(filesService.getFilesInFolder(mockFiles, level3.id)).toHaveLength(2);
      expect(filesService.getFilesInFolder(mockFiles, null)).toHaveLength(0);
    });
  });
});
