import { describe, it, expect, beforeEach } from 'vitest';
import { foldersService, FolderData } from './folders';

describe('Folders Service', () => {
  const testOwner = '0x1234567890abcdef';
  
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createFolder', () => {
    it('should create a root folder', () => {
      const folder = foldersService.createFolder(testOwner, 'Documents', null);
      
      expect(folder).toBeDefined();
      expect(folder.name).toBe('Documents');
      expect(folder.parentId).toBeNull();
      expect(folder.path).toBe('/');
      expect(folder.owner).toBe(testOwner);
      expect(folder.id).toMatch(/^folder_/);
    });

    it('should create a nested folder', () => {
      const parent = foldersService.createFolder(testOwner, 'Documents', null);
      const child = foldersService.createFolder(testOwner, 'Projects', parent.id);
      
      expect(child.name).toBe('Projects');
      expect(child.parentId).toBe(parent.id);
      expect(child.path).toBe('/Documents/');
    });

    it('should create folder with color', () => {
      const folder = foldersService.createFolder(testOwner, 'Photos', null, '#FF5733');
      
      expect(folder.color).toBe('#FF5733');
    });

    it('should throw error when exceeding max depth', () => {
      let parent = foldersService.createFolder(testOwner, 'Level1', null);
      
      // Create 9 more levels (total 10)
      for (let i = 2; i <= 10; i++) {
        parent = foldersService.createFolder(testOwner, `Level${i}`, parent.id);
      }
      
      // Attempting to create 11th level should fail
      expect(() => {
        foldersService.createFolder(testOwner, 'Level11', parent.id);
      }).toThrow('Maximum folder depth (10 levels) exceeded');
    });
  });

  describe('getAllFolders', () => {
    it('should return empty array when no folders exist', () => {
      const folders = foldersService.getAllFolders(testOwner);
      expect(folders).toEqual([]);
    });

    it('should return all folders for owner', () => {
      foldersService.createFolder(testOwner, 'Documents', null);
      foldersService.createFolder(testOwner, 'Photos', null);
      
      const folders = foldersService.getAllFolders(testOwner);
      expect(folders).toHaveLength(2);
      expect(folders[0].name).toBe('Documents');
      expect(folders[1].name).toBe('Photos');
    });

    it('should parse dates correctly', () => {
      foldersService.createFolder(testOwner, 'Test', null);
      const folders = foldersService.getAllFolders(testOwner);
      
      expect(folders[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteFolder', () => {
    it('should delete a folder without children', () => {
      const folder = foldersService.createFolder(testOwner, 'ToDelete', null);
      
      foldersService.deleteFolder(testOwner, folder.id);
      
      const folders = foldersService.getAllFolders(testOwner);
      expect(folders).toHaveLength(0);
    });

    it('should throw error when deleting folder with children without recursive flag', () => {
      const parent = foldersService.createFolder(testOwner, 'Parent', null);
      foldersService.createFolder(testOwner, 'Child', parent.id);
      
      expect(() => {
        foldersService.deleteFolder(testOwner, parent.id, false);
      }).toThrow('Cannot delete folder with subfolders');
    });

    it('should recursively delete folder with children', () => {
      const parent = foldersService.createFolder(testOwner, 'Parent', null);
      const child1 = foldersService.createFolder(testOwner, 'Child1', parent.id);
      foldersService.createFolder(testOwner, 'Grandchild', child1.id);
      foldersService.createFolder(testOwner, 'Child2', parent.id);
      
      foldersService.deleteFolder(testOwner, parent.id, true);
      
      const folders = foldersService.getAllFolders(testOwner);
      expect(folders).toHaveLength(0);
    });
  });

  describe('renameFolder', () => {
    it('should rename a folder', () => {
      const folder = foldersService.createFolder(testOwner, 'OldName', null);
      
      foldersService.renameFolder(testOwner, folder.id, 'NewName');
      
      const folders = foldersService.getAllFolders(testOwner);
      expect(folders[0].name).toBe('NewName');
    });

    it('should update paths of child folders after rename', () => {
      const parent = foldersService.createFolder(testOwner, 'Parent', null);
      const child = foldersService.createFolder(testOwner, 'Child', parent.id);
      
      foldersService.renameFolder(testOwner, parent.id, 'RenamedParent');
      
      const folders = foldersService.getAllFolders(testOwner);
      const updatedChild = folders.find(f => f.id === child.id);
      
      expect(updatedChild?.path).toBe('/RenamedParent/');
    });

    it('should throw error when folder not found', () => {
      expect(() => {
        foldersService.renameFolder(testOwner, 'nonexistent', 'NewName');
      }).toThrow('Folder not found');
    });
  });

  describe('moveFolder', () => {
    it('should move folder to root', () => {
      const parent = foldersService.createFolder(testOwner, 'Parent', null);
      const child = foldersService.createFolder(testOwner, 'Child', parent.id);
      
      foldersService.moveFolder(testOwner, child.id, null);
      
      const folders = foldersService.getAllFolders(testOwner);
      const movedFolder = folders.find(f => f.id === child.id);
      
      expect(movedFolder?.parentId).toBeNull();
      expect(movedFolder?.path).toBe('/');
    });

    it('should move folder to another parent', () => {
      const parent1 = foldersService.createFolder(testOwner, 'Parent1', null);
      const parent2 = foldersService.createFolder(testOwner, 'Parent2', null);
      const child = foldersService.createFolder(testOwner, 'Child', parent1.id);
      
      foldersService.moveFolder(testOwner, child.id, parent2.id);
      
      const folders = foldersService.getAllFolders(testOwner);
      const movedFolder = folders.find(f => f.id === child.id);
      
      expect(movedFolder?.parentId).toBe(parent2.id);
      expect(movedFolder?.path).toBe('/Parent2/');
    });

    it('should update paths of descendants after move', () => {
      const parent1 = foldersService.createFolder(testOwner, 'Parent1', null);
      const parent2 = foldersService.createFolder(testOwner, 'Parent2', null);
      const child = foldersService.createFolder(testOwner, 'Child', parent1.id);
      const grandchild = foldersService.createFolder(testOwner, 'Grandchild', child.id);
      
      foldersService.moveFolder(testOwner, child.id, parent2.id);
      
      const folders = foldersService.getAllFolders(testOwner);
      const updatedGrandchild = folders.find(f => f.id === grandchild.id);
      
      expect(updatedGrandchild?.path).toBe('/Parent2/Child/');
    });

    it('should throw error when moving folder into itself', () => {
      const folder = foldersService.createFolder(testOwner, 'Folder', null);
      
      expect(() => {
        foldersService.moveFolder(testOwner, folder.id, folder.id);
      }).toThrow('Cannot move folder into itself or its descendants');
    });

    it('should throw error when moving folder into its descendant', () => {
      const parent = foldersService.createFolder(testOwner, 'Parent', null);
      const child = foldersService.createFolder(testOwner, 'Child', parent.id);
      const grandchild = foldersService.createFolder(testOwner, 'Grandchild', child.id);
      
      expect(() => {
        foldersService.moveFolder(testOwner, parent.id, grandchild.id);
      }).toThrow('Cannot move folder into itself or its descendants');
    });

    it('should throw error when move would exceed max depth', () => {
      let parent = foldersService.createFolder(testOwner, 'Level1', null);
      
      // Create 9 levels
      for (let i = 2; i <= 9; i++) {
        parent = foldersService.createFolder(testOwner, `Level${i}`, parent.id);
      }
      
      const separateFolder = foldersService.createFolder(testOwner, 'Separate', null);
      
      expect(() => {
        foldersService.moveFolder(testOwner, separateFolder.id, parent.id);
      }).toThrow('Maximum folder depth (10 levels) exceeded');
    });

    it('should throw error when folder not found', () => {
      expect(() => {
        foldersService.moveFolder(testOwner, 'nonexistent', null);
      }).toThrow('Folder not found');
    });
  });

  describe('getFolder', () => {
    it('should return folder by id', () => {
      const created = foldersService.createFolder(testOwner, 'Test', null);
      const found = foldersService.getFolder(testOwner, created.id);
      
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test');
    });

    it('should return null for nonexistent folder', () => {
      const found = foldersService.getFolder(testOwner, 'nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('getBreadcrumbs', () => {
    it('should return empty array for root', () => {
      const breadcrumbs = foldersService.getBreadcrumbs(testOwner, null);
      expect(breadcrumbs).toEqual([]);
    });

    it('should return breadcrumb trail for nested folder', () => {
      const parent = foldersService.createFolder(testOwner, 'Documents', null);
      const child = foldersService.createFolder(testOwner, 'Projects', parent.id);
      const grandchild = foldersService.createFolder(testOwner, 'Work', child.id);
      
      const breadcrumbs = foldersService.getBreadcrumbs(testOwner, grandchild.id);
      
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0].name).toBe('Documents');
      expect(breadcrumbs[1].name).toBe('Projects');
      expect(breadcrumbs[2].name).toBe('Work');
    });
  });

  describe('toFolderNodes', () => {
    it('should convert folder data to folder nodes', () => {
      const folder = foldersService.createFolder(testOwner, 'Test', null, '#FF0000');
      const nodes = foldersService.toFolderNodes([folder]);
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe(folder.id);
      expect(nodes[0].name).toBe('Test');
      expect(nodes[0].color).toBe('#FF0000');
    });
  });

  describe('folder hierarchy validation', () => {
    it('should allow exactly 10 levels of nesting', () => {
      let parent = foldersService.createFolder(testOwner, 'Level1', null);
      
      for (let i = 2; i <= 10; i++) {
        parent = foldersService.createFolder(testOwner, `Level${i}`, parent.id);
      }
      
      const folders = foldersService.getAllFolders(testOwner);
      expect(folders).toHaveLength(10);
    });

    it('should prevent creating 11th level', () => {
      let parent = foldersService.createFolder(testOwner, 'Level1', null);
      
      for (let i = 2; i <= 10; i++) {
        parent = foldersService.createFolder(testOwner, `Level${i}`, parent.id);
      }
      
      expect(() => {
        foldersService.createFolder(testOwner, 'Level11', parent.id);
      }).toThrow('Maximum folder depth (10 levels) exceeded');
    });
  });
});
