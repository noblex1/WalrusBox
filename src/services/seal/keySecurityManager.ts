// Key Security Manager
// Implements security measures including automatic key clearing, compromise detection, and re-encryption

import {
  SealError,
  SealErrorType
} from './sealTypes';
import { keyManagementService, type StoredEncryptionKey } from './keyManagement';
import { walletKeyDerivationService, type KeyRotationMetadata } from './walletKeyDerivation';

/**
 * Key compromise detection result
 */
export interface CompromiseDetectionResult {
  isCompromised: boolean;
  reason?: string;
  detectedAt: Date;
  affectedFiles: string[];
  recommendedAction: 'rotate' | 're-encrypt' | 'revoke';
}

/**
 * Re-encryption task for compromised keys
 */
export interface ReEncryptionTask {
  fileId: string;
  oldKeyId: string;
  newKeyId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

/**
 * Key security configuration
 */
export interface KeySecurityConfig {
  autoCleanupInterval: number; // milliseconds
  maxKeyAge: number; // days
  compromiseCheckInterval: number; // milliseconds
  enableAutoRotation: boolean;
}

/**
 * Key Security Manager
 * Manages key security including automatic cleanup, compromise detection, and rotation
 */
export class KeySecurityManager {
  private static readonly DB_NAME = 'SealKeySecurityDB';
  private static readonly DB_VERSION = 1;
  private static readonly COMPROMISE_STORE_NAME = 'compromiseDetections';
  private static readonly RE_ENCRYPTION_STORE_NAME = 'reEncryptionTasks';
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  private compromiseCheckInterval: NodeJS.Timeout | null = null;
  
  private config: KeySecurityConfig = {
    autoCleanupInterval: 300000, // 5 minutes
    maxKeyAge: 90, // 90 days
    compromiseCheckInterval: 3600000, // 1 hour
    enableAutoRotation: true
  };

  /**
   * Initialize the key security manager
   * @param config - Optional security configuration
   */
  async initialize(config?: Partial<KeySecurityConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Start automatic cleanup
    this.startAutoCleanup();
    
    // Start compromise checking
    this.startCompromiseChecking();
  }

  /**
   * Start automatic key cleanup from memory
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, this.config.autoCleanupInterval);
  }

  /**
   * Start periodic compromise checking
   */
  private startCompromiseChecking(): void {
    if (this.compromiseCheckInterval) {
      clearInterval(this.compromiseCheckInterval);
    }
    
    this.compromiseCheckInterval = setInterval(async () => {
      await this.checkForCompromisedKeys();
    }, this.config.compromiseCheckInterval);
  }

  /**
   * Perform memory cleanup
   * Clears cached keys and forces garbage collection
   */
  performMemoryCleanup(): void {
    try {
      // Clear key management service cache
      keyManagementService.clearMemory();
      
      // Clear wallet key derivation cache
      walletKeyDerivationService.clearCache();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      console.debug('[KeySecurity] Memory cleanup completed');
    } catch (error) {
      console.error('[KeySecurity] Memory cleanup failed:', error);
    }
  }

  /**
   * Check for compromised keys
   * Detects potential key compromises based on various indicators
   */
  private async checkForCompromisedKeys(): Promise<void> {
    try {
      // This is a placeholder for actual compromise detection logic
      // In a real implementation, you would check for:
      // - Unusual access patterns
      // - Failed decryption attempts
      // - Keys that are too old
      // - External security alerts
      
      console.debug('[KeySecurity] Compromise check completed');
    } catch (error) {
      console.error('[KeySecurity] Compromise check failed:', error);
    }
  }

  /**
   * Mark a key as compromised
   * @param keyId - Key identifier
   * @param reason - Reason for compromise
   * @returns Compromise detection result
   */
  async markKeyAsCompromised(
    keyId: string,
    reason: string
  ): Promise<CompromiseDetectionResult> {
    try {
      // Get associated files for this key
      const affectedFiles = await this.getFilesUsingKey(keyId);
      
      // Create compromise detection result
      const result: CompromiseDetectionResult = {
        isCompromised: true,
        reason,
        detectedAt: new Date(),
        affectedFiles,
        recommendedAction: affectedFiles.length > 0 ? 're-encrypt' : 'revoke'
      };
      
      // Store compromise detection
      await this.storeCompromiseDetection(keyId, result);
      
      // Clear the key from memory immediately
      this.performMemoryCleanup();
      
      return result;
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to mark key as compromised: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { keyId, reason }
      );
    }
  }

  /**
   * Check if a key is compromised
   * @param keyId - Key identifier
   * @returns Compromise detection result or null if not compromised
   */
  async isKeyCompromised(keyId: string): Promise<CompromiseDetectionResult | null> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([KeySecurityManager.COMPROMISE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(KeySecurityManager.COMPROMISE_STORE_NAME);
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get(keyId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      if (!result) return null;
      
      return {
        isCompromised: result.isCompromised,
        reason: result.reason,
        detectedAt: new Date(result.detectedAt),
        affectedFiles: result.affectedFiles,
        recommendedAction: result.recommendedAction
      };
    } catch (error) {
      console.error('[KeySecurity] Failed to check compromise status:', error);
      return null;
    }
  }

  /**
   * Re-encrypt files using a new key after compromise
   * @param oldKeyId - Compromised key ID
   * @param newKeyId - New key ID to use
   * @param reEncryptCallback - Callback function to re-encrypt each file
   * @returns Array of re-encryption tasks
   */
  async reEncryptFilesAfterCompromise(
    oldKeyId: string,
    newKeyId: string,
    reEncryptCallback: (fileId: string, oldKey: CryptoKey, newKey: CryptoKey) => Promise<void>
  ): Promise<ReEncryptionTask[]> {
    try {
      // Get affected files
      const affectedFiles = await this.getFilesUsingKey(oldKeyId);
      
      if (affectedFiles.length === 0) {
        return [];
      }
      
      // Get old and new keys
      const oldKey = await keyManagementService.getKey(oldKeyId);
      const newKey = await keyManagementService.getKey(newKeyId);
      
      if (!oldKey || !newKey) {
        throw new Error('Failed to retrieve encryption keys');
      }
      
      // Create re-encryption tasks
      const tasks: ReEncryptionTask[] = affectedFiles.map(fileId => ({
        fileId,
        oldKeyId,
        newKeyId,
        status: 'pending' as const
      }));
      
      // Store tasks
      await this.storeReEncryptionTasks(tasks);
      
      // Execute re-encryption for each file
      for (const task of tasks) {
        try {
          task.status = 'in-progress';
          await this.updateReEncryptionTask(task);
          
          await reEncryptCallback(task.fileId, oldKey, newKey);
          
          task.status = 'completed';
          await this.updateReEncryptionTask(task);
        } catch (error) {
          task.status = 'failed';
          task.error = error instanceof Error ? error.message : 'Unknown error';
          await this.updateReEncryptionTask(task);
        }
      }
      
      // Delete the compromised key after successful re-encryption
      const allCompleted = tasks.every(t => t.status === 'completed');
      if (allCompleted) {
        await keyManagementService.deleteKey(oldKeyId);
      }
      
      return tasks;
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to re-encrypt files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { oldKeyId, newKeyId }
      );
    }
  }

  /**
   * Rotate keys for long-term files
   * @param walletAddress - User's wallet address
   * @param signMessage - Function to sign messages with wallet
   * @param maxAgeInDays - Maximum age before rotation (default: 90 days)
   * @returns Array of rotation results
   */
  async rotateKeysForLongTermFiles(
    walletAddress: string,
    signMessage: (message: string) => Promise<string>,
    maxAgeInDays: number = 90
  ): Promise<Array<{ keyId: string; rotated: boolean; newKeyId?: string; error?: string }>> {
    try {
      if (!this.config.enableAutoRotation) {
        return [];
      }
      
      // Get all keys that need rotation
      const keysToRotate = await this.getKeysNeedingRotation(maxAgeInDays);
      
      const results = [];
      
      for (const keyId of keysToRotate) {
        try {
          // Check if key should be rotated
          const shouldRotate = await walletKeyDerivationService.shouldRotateKey(keyId, maxAgeInDays);
          
          if (shouldRotate) {
            // Rotate the key
            const { newKeyId } = await walletKeyDerivationService.rotateKey(
              walletAddress,
              signMessage,
              keyId,
              'scheduled'
            );
            
            results.push({
              keyId,
              rotated: true,
              newKeyId
            });
          } else {
            results.push({
              keyId,
              rotated: false
            });
          }
        } catch (error) {
          results.push({
            keyId,
            rotated: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return results;
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to rotate keys for long-term files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { walletAddress, maxAgeInDays }
      );
    }
  }

  /**
   * Get files using a specific key
   * @param keyId - Key identifier
   * @returns Array of file IDs
   */
  private async getFilesUsingKey(keyId: string): Promise<string[]> {
    // This would typically query your file metadata storage
    // For now, return empty array as placeholder
    // In production, integrate with your file tracking system
    return [];
  }

  /**
   * Get keys that need rotation
   * @param maxAgeInDays - Maximum age in days
   * @returns Array of key IDs
   */
  private async getKeysNeedingRotation(maxAgeInDays: number): Promise<string[]> {
    // This would typically query your key storage for old keys
    // For now, return empty array as placeholder
    // In production, integrate with key management service
    return [];
  }

  /**
   * Store compromise detection result
   * @param keyId - Key identifier
   * @param result - Compromise detection result
   */
  private async storeCompromiseDetection(
    keyId: string,
    result: CompromiseDetectionResult
  ): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction([KeySecurityManager.COMPROMISE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(KeySecurityManager.COMPROMISE_STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        keyId,
        ...result,
        detectedAt: result.detectedAt.toISOString()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  }

  /**
   * Store re-encryption tasks
   * @param tasks - Array of re-encryption tasks
   */
  private async storeReEncryptionTasks(tasks: ReEncryptionTask[]): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction([KeySecurityManager.RE_ENCRYPTION_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(KeySecurityManager.RE_ENCRYPTION_STORE_NAME);
    
    for (const task of tasks) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          ...task,
          id: `${task.fileId}_${task.oldKeyId}_${task.newKeyId}`
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    db.close();
  }

  /**
   * Update a re-encryption task
   * @param task - Re-encryption task to update
   */
  private async updateReEncryptionTask(task: ReEncryptionTask): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction([KeySecurityManager.RE_ENCRYPTION_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(KeySecurityManager.RE_ENCRYPTION_STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        ...task,
        id: `${task.fileId}_${task.oldKeyId}_${task.newKeyId}`
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  }

  /**
   * Get pending re-encryption tasks
   * @returns Array of pending tasks
   */
  async getPendingReEncryptionTasks(): Promise<ReEncryptionTask[]> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([KeySecurityManager.RE_ENCRYPTION_STORE_NAME], 'readonly');
      const store = transaction.objectStore(KeySecurityManager.RE_ENCRYPTION_STORE_NAME);
      
      const allTasks = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      return allTasks
        .filter(t => t.status === 'pending' || t.status === 'in-progress')
        .map(t => ({
          fileId: t.fileId,
          oldKeyId: t.oldKeyId,
          newKeyId: t.newKeyId,
          status: t.status,
          error: t.error
        }));
    } catch (error) {
      console.error('[KeySecurity] Failed to get pending re-encryption tasks:', error);
      return [];
    }
  }

  /**
   * Stop all security monitoring
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.compromiseCheckInterval) {
      clearInterval(this.compromiseCheckInterval);
      this.compromiseCheckInterval = null;
    }
    
    // Final cleanup
    this.performMemoryCleanup();
  }

  /**
   * Open or create IndexedDB database
   * @returns IDBDatabase instance
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        KeySecurityManager.DB_NAME,
        KeySecurityManager.DB_VERSION
      );
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create compromise detection store
        if (!db.objectStoreNames.contains(KeySecurityManager.COMPROMISE_STORE_NAME)) {
          db.createObjectStore(KeySecurityManager.COMPROMISE_STORE_NAME, { keyPath: 'keyId' });
        }
        
        // Create re-encryption tasks store
        if (!db.objectStoreNames.contains(KeySecurityManager.RE_ENCRYPTION_STORE_NAME)) {
          db.createObjectStore(KeySecurityManager.RE_ENCRYPTION_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }
}

// Export singleton instance
export const keySecurityManager = new KeySecurityManager();

/**
 * Automatic Key Cleanup Hook
 * Can be used in React components to ensure cleanup on unmount
 */
export function useKeySecurityCleanup(): void {
  if (typeof window !== 'undefined') {
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      keySecurityManager.performMemoryCleanup();
    });
    
    // Cleanup on visibility change (when tab becomes hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        keySecurityManager.performMemoryCleanup();
      }
    });
  }
}
