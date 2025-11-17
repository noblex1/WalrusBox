// Folder Management Service - Handles folder operations and hierarchy

import { Transaction } from '@mysten/sui/transactions';
import { FolderNode } from '@/components/FolderTree';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x0';
const REGISTRY_ID = import.meta.env.VITE_REGISTRY_ID || '0x0';

// Local storage key for folders (until smart contract is deployed)
const FOLDERS_STORAGE_KEY = 'walrusbox_folders';

export interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  color?: string;
  owner: string;
  createdAt: Date;
}

/**
 * Folder Service - Manages folder hierarchy and operations
 * Currently uses localStorage, will migrate to smart contract
 */
export const foldersService = {
  /**
   * Get all folders for a user
   * @param ownerAddress - User's wallet address
   * @returns Array of folder data
   */
  getAllFolders: (ownerAddress: string): FolderData[] => {
    try {
      const stored = localStorage.getItem(`${FOLDERS_STORAGE_KEY}_${ownerAddress}`);
      if (!stored) return [];
      
      const folders = JSON.parse(stored);
      return folders.map((f: any) => ({
        ...f,
        createdAt: new Date(f.createdAt),
      }));
    } catch (error) {
      console.error('Error loading folders:', error);
      return [];
    }
  },

  /**
   * Create a new folder
   * @param ownerAddress - User's wallet address
   * @param name - Folder name
   * @param parentId - Parent folder ID (null for root)
   * @param color - Optional folder color
   * @returns Created folder data
   */
  createFolder: (
    ownerAddress: string,
    name: string,
    parentId: string | null,
    color?: string
  ): FolderData => {
    try {
      const folders = foldersService.getAllFolders(ownerAddress);
      
      // Generate unique ID
      const id = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Calculate path
      let path = '/';
      if (parentId) {
        const parent = folders.find(f => f.id === parentId);
        if (parent) {
          path = `${parent.path}${parent.name}/`;
        }
      }
      
      // Validate hierarchy depth (max 10 levels)
      const depth = path.split('/').filter(Boolean).length;
      if (depth >= 10) {
        throw new Error('Maximum folder depth (10 levels) exceeded');
      }
      
      const newFolder: FolderData = {
        id,
        name,
        parentId,
        path,
        color,
        owner: ownerAddress,
        createdAt: new Date(),
      };
      
      folders.push(newFolder);
      localStorage.setItem(
        `${FOLDERS_STORAGE_KEY}_${ownerAddress}`,
        JSON.stringify(folders)
      );
      
      return newFolder;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  },

  /**
   * Delete a folder and optionally its contents
   * @param ownerAddress - User's wallet address
   * @param folderId - Folder ID to delete
   * @param recursive - If true, delete subfolders too
   */
  deleteFolder: (
    ownerAddress: string,
    folderId: string,
    recursive: boolean = false
  ): void => {
    try {
      let folders = foldersService.getAllFolders(ownerAddress);
      
      if (recursive) {
        // Get all descendant folder IDs
        const toDelete = new Set<string>([folderId]);
        let changed = true;
        
        while (changed) {
          changed = false;
          folders.forEach(folder => {
            if (folder.parentId && toDelete.has(folder.parentId) && !toDelete.has(folder.id)) {
              toDelete.add(folder.id);
              changed = true;
            }
          });
        }
        
        // Remove all folders in the set
        folders = folders.filter(f => !toDelete.has(f.id));
      } else {
        // Check if folder has children
        const hasChildren = folders.some(f => f.parentId === folderId);
        if (hasChildren) {
          throw new Error('Cannot delete folder with subfolders. Use recursive delete or move contents first.');
        }
        
        // Remove only this folder
        folders = folders.filter(f => f.id !== folderId);
      }
      
      localStorage.setItem(
        `${FOLDERS_STORAGE_KEY}_${ownerAddress}`,
        JSON.stringify(folders)
      );
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  },

  /**
   * Rename a folder
   * @param ownerAddress - User's wallet address
   * @param folderId - Folder ID to rename
   * @param newName - New folder name
   */
  renameFolder: (
    ownerAddress: string,
    folderId: string,
    newName: string
  ): void => {
    try {
      const folders = foldersService.getAllFolders(ownerAddress);
      const folder = folders.find(f => f.id === folderId);
      
      if (!folder) {
        throw new Error('Folder not found');
      }
      
      folder.name = newName;
      
      // Update paths for this folder and all descendants
      const updatePaths = (parentId: string, parentPath: string) => {
        folders.forEach(f => {
          if (f.parentId === parentId) {
            const parent = folders.find(p => p.id === parentId);
            if (parent) {
              f.path = `${parentPath}${parent.name}/`;
              updatePaths(f.id, f.path);
            }
          }
        });
      };
      
      updatePaths(folderId, folder.path);
      
      localStorage.setItem(
        `${FOLDERS_STORAGE_KEY}_${ownerAddress}`,
        JSON.stringify(folders)
      );
    } catch (error) {
      console.error('Error renaming folder:', error);
      throw error;
    }
  },

  /**
   * Move a folder to a new parent
   * @param ownerAddress - User's wallet address
   * @param folderId - Folder ID to move
   * @param newParentId - New parent folder ID (null for root)
   */
  moveFolder: (
    ownerAddress: string,
    folderId: string,
    newParentId: string | null
  ): void => {
    try {
      const folders = foldersService.getAllFolders(ownerAddress);
      const folder = folders.find(f => f.id === folderId);
      
      if (!folder) {
        throw new Error('Folder not found');
      }
      
      // Prevent moving folder into itself or its descendants
      if (newParentId) {
        let current = folders.find(f => f.id === newParentId);
        while (current) {
          if (current.id === folderId) {
            throw new Error('Cannot move folder into itself or its descendants');
          }
          current = current.parentId ? folders.find(f => f.id === current!.parentId) : undefined;
        }
      }
      
      // Calculate new path
      let newPath = '/';
      if (newParentId) {
        const parent = folders.find(f => f.id === newParentId);
        if (parent) {
          newPath = `${parent.path}${parent.name}/`;
        }
      }
      
      // Validate depth
      const depth = newPath.split('/').filter(Boolean).length;
      if (depth >= 10) {
        throw new Error('Maximum folder depth (10 levels) exceeded');
      }
      
      folder.parentId = newParentId;
      folder.path = newPath;
      
      // Update paths for all descendants
      const updateDescendantPaths = (parentId: string) => {
        folders.forEach(f => {
          if (f.parentId === parentId) {
            const parent = folders.find(p => p.id === parentId);
            if (parent) {
              f.path = `${parent.path}${parent.name}/`;
              updateDescendantPaths(f.id);
            }
          }
        });
      };
      
      updateDescendantPaths(folderId);
      
      localStorage.setItem(
        `${FOLDERS_STORAGE_KEY}_${ownerAddress}`,
        JSON.stringify(folders)
      );
    } catch (error) {
      console.error('Error moving folder:', error);
      throw error;
    }
  },

  /**
   * Convert folder data to FolderNode format for FolderTree component
   * @param folders - Array of folder data
   * @returns Array of folder nodes
   */
  toFolderNodes: (folders: FolderData[]): FolderNode[] => {
    return folders.map(f => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      path: f.path,
      color: f.color,
    }));
  },

  /**
   * Get folder by ID
   * @param ownerAddress - User's wallet address
   * @param folderId - Folder ID
   * @returns Folder data or null
   */
  getFolder: (ownerAddress: string, folderId: string): FolderData | null => {
    const folders = foldersService.getAllFolders(ownerAddress);
    return folders.find(f => f.id === folderId) || null;
  },

  /**
   * Get breadcrumb trail for a folder
   * @param ownerAddress - User's wallet address
   * @param folderId - Folder ID (null for root)
   * @returns Array of breadcrumb items
   */
  getBreadcrumbs: (
    ownerAddress: string,
    folderId: string | null
  ): Array<{ id: string | null; name: string; path: string }> => {
    if (!folderId) {
      return [];
    }
    
    const folders = foldersService.getAllFolders(ownerAddress);
    const breadcrumbs: Array<{ id: string | null; name: string; path: string }> = [];
    
    let current = folders.find(f => f.id === folderId);
    while (current) {
      breadcrumbs.unshift({
        id: current.id,
        name: current.name,
        path: current.path,
      });
      current = current.parentId ? folders.find(f => f.id === current!.parentId) : undefined;
    }
    
    return breadcrumbs;
  },

  /**
   * Future: Create folder on-chain (when smart contract is deployed)
   */
  createFolderOnChain: async (
    signer: (tx: Transaction, options?: any) => Promise<string>,
    name: string,
    parentId: string | null,
    color?: string
  ): Promise<string> => {
    try {
      const tx = new Transaction();
      
      // This will be implemented when the smart contract is deployed
      // tx.moveCall({
      //   target: `${PACKAGE_ID}::walrusbox::create_folder`,
      //   arguments: [
      //     tx.object(REGISTRY_ID),
      //     tx.pure.string(name),
      //     parentId ? tx.pure.option('id', parentId) : tx.pure.option('id', null),
      //     color ? tx.pure.option('string', color) : tx.pure.option('string', null),
      //   ],
      // });
      
      // return await signer(tx, { showEffects: true });
      
      throw new Error('On-chain folder creation not yet implemented');
    } catch (error) {
      console.error('Error creating folder on-chain:', error);
      throw error;
    }
  },
};
