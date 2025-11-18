// Key Management Service
// Secure key operations including generation, storage, export, and import

import {
  SealError,
  SealErrorType
} from './sealTypes';
import { sealEncryptionService } from './sealEncryption';

/**
 * Stored encryption key with metadata
 */
export interface StoredEncryptionKey {
  keyId: string;
  encryptedKey: string; // Key encrypted with master key
  algorithm: string;
  keySize: number;
  createdAt: Date;
  lastUsed: Date;
  associatedFiles: string[]; // File IDs using this key
  rotationCount: number; // Number of times key has been rotated
  isCompromised: boolean;
}

/**
 * Key export format for user backup
 */
export interface KeyBackup {
  version: string;
  keys: Array<{
    keyId: string;
    keyData: string; // Encrypted with user-provided password
    metadata: {
      algorithm: string;
      keySize: number;
      createdAt: string;
      associatedFiles: string[];
    };
  }>;
  exportedAt: string;
}

/**
 * Key Management Service
 * Handles secure key operations including generation, storage, and lifecycle management
 */
export class KeyManagementService {
  private static readonly DB_NAME = 'SealKeyManagementDB';
  private static readonly DB_VERSION = 1;
  private static readonly KEY_STORE_NAME = 'encryptionKeys';
  private static readonly MASTER_KEY_STORE_NAME = 'masterKey';
  
  private masterKey: CryptoKey | null = null;
  private keyCache: Map<string, CryptoKey> = new Map();

  /**
   * Initialize the key management service
   * Generates or retrieves the master key for encrypting stored keys
   */
  async initialize(): Promise<void> {
    try {
      // Try to retrieve existing master key
      this.masterKey = await this.retrieveMasterKey();
      
      if (!this.masterKey) {
        // Generate new master key if none exists
        this.masterKey = await this.generateMasterKey();
        await this.storeMasterKey(this.masterKey);
      }
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to initialize key management: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Generate a new encryption key
   * @param keySize - Key size in bits (128, 192, or 256)
   * @returns Key ID and the generated CryptoKey
   */
  async generateKey(keySize: 128 | 192 | 256 = 256): Promise<{ keyId: string; key: CryptoKey }> {
    try {
      if (!this.masterKey) {
        await this.initialize();
      }

      // Generate new encryption key
      const key = await sealEncryptionService.generateKey(keySize);
      
      // Generate unique key ID
      const keyId = await this.generateKeyId();
      
      // Store the key securely
      await this.storeKey(keyId, key, keySize);
      
      // Cache the key
      this.keyCache.set(keyId, key);
      
      return { keyId, key };
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to generate encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { keySize }
      );
    }
  }

  /**
   * Retrieve an encryption key by ID
   * @param keyId - Unique key identifier
   * @returns CryptoKey or null if not found
   */
  async getKey(keyId: string): Promise<CryptoKey | null> {
    try {
      // Check cache first
      if (this.keyCache.has(keyId)) {
        await this.updateKeyLastUsed(keyId);
        return this.keyCache.get(keyId)!;
      }

      if (!this.masterKey) {
        await this.initialize();
      }

      // Retrieve from storage
      const storedKey = await this.retrieveStoredKey(keyId);
      if (!storedKey) {
        return null;
      }

      // Decrypt the key
      const key = await this.decryptStoredKey(storedKey);
      
      // Cache the key
      this.keyCache.set(keyId, key);
      
      // Update last used timestamp
      await this.updateKeyLastUsed(keyId);
      
      return key;
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to retrieve encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { keyId }
      );
    }
  }

  /**
   * Store an encryption key securely in IndexedDB
   * @param keyId - Unique key identifier
   * @param key - CryptoKey to store
   * @param keySize - Key size in bits
   */
  private async storeKey(keyId: string, key: CryptoKey, keySize: number): Promise<void> {
    try {
      if (!this.masterKey) {
        throw new Error('Master key not initialized');
      }

      // Export the key
      const exportedKey = await sealEncryptionService.exportKey(key);
      
      // Encrypt the key with master key
      const encryptedKey = await this.encryptWithMasterKey(exportedKey);
      
      // Create stored key object
      const storedKey: StoredEncryptionKey = {
        keyId,
        encryptedKey,
        algorithm: 'AES-GCM',
        keySize,
        createdAt: new Date(),
        lastUsed: new Date(),
        associatedFiles: [],
        rotationCount: 0,
        isCompromised: false
      };
      
      // Store in IndexedDB
      const db = await this.openDatabase();
      const transaction = db.transaction([KeyManagementService.KEY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(KeyManagementService.KEY_STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put(storedKey);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to store encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { keyId }
      );
    }
  }

  /**
   * Retrieve a stored key from IndexedDB
   * @param keyId - Unique key identifier
   * @returns StoredEncryptionKey or null if not found
   */
  private async retrieveStoredKey(keyId: string): Promise<StoredEncryptionKey | null> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([KeyManagementService.KEY_STORE_NAME], 'readonly');
      const store = transaction.objectStore(KeyManagementService.KEY_STORE_NAME);
      
      const result = await new Promise<StoredEncryptionKey | null>((resolve, reject) => {
        const request = store.get(keyId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      return result;
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to retrieve stored key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { keyId }
      );
    }
  }

  /**
   * Update the last used timestamp for a key
   * @param keyId - Unique key identifier
   */
  private async updateKeyLastUsed(keyId: string): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([KeyManagementService.KEY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(KeyManagementService.KEY_STORE_NAME);
      
      const storedKey = await new Promise<StoredEncryptionKey | null>((resolve, reject) => {
        const request = store.get(keyId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      
      if (storedKey) {
        storedKey.lastUsed = new Date();
        await new Promise<void>((resolve, reject) => {
          const request = store.put(storedKey);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      db.close();
    } catch (error) {
      // Non-critical error, log but don't throw
      console.warn(`Failed to update key last used timestamp: ${error}`);
    }
  }

  /**
   * Associate a file with an encryption key
   * @param keyId - Unique key identifier
   * @param fileId - File identifier to associate
   */
  async associateFileWithKey(keyId: string, fileId: string): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([KeyManagementService.KEY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(KeyManagementService.KEY_STORE_NAME);
      
      const storedKey = await new Promise<StoredEncryptionKey | null>((resolve, reject) => {
        const request = store.get(keyId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      
      if (storedKey && !storedKey.associatedFiles.includes(fileId)) {
        storedKey.associatedFiles.push(fileId);
        await new Promise<void>((resolve, reject) => {
          const request = store.put(storedKey);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      db.close();
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to associate file with key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { keyId, fileId }
      );
    }
  }

  /**
   * Export keys for user backup
   * @param password - User-provided password to encrypt the backup
   * @returns KeyBackup object containing encrypted keys
   */
  async exportKeys(password: string): Promise<KeyBackup> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([KeyManagementService.KEY_STORE_NAME], 'readonly');
      const store = transaction.objectStore(KeyManagementService.KEY_STORE_NAME);
      
      // Get all keys
      const allKeys = await new Promise<StoredEncryptionKey[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      db.close();

      // Derive encryption key from password
      const backupKey = await this.deriveKeyFromPassword(password);
      
      // Encrypt each key with the backup key
      const encryptedKeys = await Promise.all(
        allKeys.map(async (storedKey) => {
          // Decrypt with master key first
          const key = await this.decryptStoredKey(storedKey);
          const exportedKey = await sealEncryptionService.exportKey(key);
          
          // Re-encrypt with backup key
          const encryptedData = await this.encryptWithKey(exportedKey, backupKey);
          
          return {
            keyId: storedKey.keyId,
            keyData: encryptedData,
            metadata: {
              algorithm: storedKey.algorithm,
              keySize: storedKey.keySize,
              createdAt: storedKey.createdAt.toISOString(),
              associatedFiles: storedKey.associatedFiles
            }
          };
        })
      );
      
      return {
        version: '1.0.0',
        keys: encryptedKeys,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to export keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Import keys from backup
   * @param backup - KeyBackup object containing encrypted keys
   * @param password - User-provided password to decrypt the backup
   */
  async importKeys(backup: KeyBackup, password: string): Promise<void> {
    try {
      if (backup.version !== '1.0.0') {
        throw new Error(`Unsupported backup version: ${backup.version}`);
      }

      if (!this.masterKey) {
        await this.initialize();
      }

      // Derive decryption key from password
      const backupKey = await this.deriveKeyFromPassword(password);
      
      // Decrypt and import each key
      for (const encryptedKey of backup.keys) {
        try {
          // Decrypt with backup key
          const decryptedKeyData = await this.decryptWithKey(encryptedKey.keyData, backupKey);
          
          // Import the key
          const key = await sealEncryptionService.importKey(
            decryptedKeyData,
            encryptedKey.metadata.keySize as 128 | 192 | 256
          );
          
          // Store with master key encryption
          await this.storeKey(encryptedKey.keyId, key, encryptedKey.metadata.keySize);
          
          // Restore metadata
          await this.restoreKeyMetadata(encryptedKey.keyId, encryptedKey.metadata);
        } catch (error) {
          console.error(`Failed to import key ${encryptedKey.keyId}:`, error);
          // Continue with other keys
        }
      }
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to import keys: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Restore key metadata after import
   * @param keyId - Unique key identifier
   * @param metadata - Key metadata to restore
   */
  private async restoreKeyMetadata(
    keyId: string,
    metadata: { algorithm: string; keySize: number; createdAt: string; associatedFiles: string[] }
  ): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([KeyManagementService.KEY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(KeyManagementService.KEY_STORE_NAME);
      
      const storedKey = await new Promise<StoredEncryptionKey | null>((resolve, reject) => {
        const request = store.get(keyId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      
      if (storedKey) {
        storedKey.createdAt = new Date(metadata.createdAt);
        storedKey.associatedFiles = metadata.associatedFiles;
        
        await new Promise<void>((resolve, reject) => {
          const request = store.put(storedKey);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      db.close();
    } catch (error) {
      console.warn(`Failed to restore key metadata: ${error}`);
    }
  }

  /**
   * Delete an encryption key
   * @param keyId - Unique key identifier
   */
  async deleteKey(keyId: string): Promise<void> {
    try {
      // Remove from cache
      this.keyCache.delete(keyId);
      
      // Remove from storage
      const db = await this.openDatabase();
      const transaction = db.transaction([KeyManagementService.KEY_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(KeyManagementService.KEY_STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(keyId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to delete encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { keyId }
      );
    }
  }

  /**
   * Clear all keys from memory (security measure)
   */
  clearMemory(): void {
    this.keyCache.clear();
    this.masterKey = null;
  }

  /**
   * Generate a unique key ID
   * @returns Unique key identifier
   */
  private async generateKeyId(): Promise<string> {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const hexString = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `key_${Date.now()}_${hexString}`;
  }

  /**
   * Generate master key for encrypting stored keys
   * @returns CryptoKey for master encryption
   */
  private async generateMasterKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Store master key in IndexedDB
   * @param masterKey - Master CryptoKey to store
   */
  private async storeMasterKey(masterKey: CryptoKey): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction([KeyManagementService.MASTER_KEY_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(KeyManagementService.MASTER_KEY_STORE_NAME);
    
    const exportedKey = await crypto.subtle.exportKey('raw', masterKey);
    const keyData = Array.from(new Uint8Array(exportedKey));
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: 'master', keyData, createdAt: new Date() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  }

  /**
   * Retrieve master key from IndexedDB
   * @returns Master CryptoKey or null if not found
   */
  private async retrieveMasterKey(): Promise<CryptoKey | null> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([KeyManagementService.MASTER_KEY_STORE_NAME], 'readonly');
      const store = transaction.objectStore(KeyManagementService.MASTER_KEY_STORE_NAME);
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get('master');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      if (!result) return null;
      
      const keyData = new Uint8Array(result.keyData);
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Encrypt data with master key
   * @param data - Data to encrypt
   * @returns Encrypted data as base64 string
   */
  private async encryptWithMasterKey(data: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }
    
    return await this.encryptWithKey(data, this.masterKey);
  }

  /**
   * Encrypt data with a specific key
   * @param data - Data to encrypt
   * @param key - CryptoKey to use for encryption
   * @returns Encrypted data as base64 string (IV + ciphertext)
   */
  private async encryptWithKey(data: string, key: CryptoKey): Promise<string> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );
    
    // Combine IV and ciphertext
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt stored key data
   * @param storedKey - StoredEncryptionKey object
   * @returns Decrypted CryptoKey
   */
  private async decryptStoredKey(storedKey: StoredEncryptionKey): Promise<CryptoKey> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }
    
    const decryptedData = await this.decryptWithKey(storedKey.encryptedKey, this.masterKey);
    return await sealEncryptionService.importKey(
      decryptedData,
      storedKey.keySize as 128 | 192 | 256
    );
  }

  /**
   * Decrypt data with a specific key
   * @param encryptedData - Base64 encrypted data (IV + ciphertext)
   * @param key - CryptoKey to use for decryption
   * @returns Decrypted data as string
   */
  private async decryptWithKey(encryptedData: string, key: CryptoKey): Promise<string> {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  }

  /**
   * Derive a key from a password using PBKDF2
   * @param password - User-provided password
   * @returns Derived CryptoKey
   */
  private async deriveKeyFromPassword(password: string): Promise<CryptoKey> {
    const passwordBytes = new TextEncoder().encode(password);
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Use a fixed salt for backup/restore (in production, consider storing salt with backup)
    const salt = new TextEncoder().encode('walrusbox-key-backup-salt-v1');
    
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Open or create IndexedDB database
   * @returns IDBDatabase instance
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        KeyManagementService.DB_NAME,
        KeyManagementService.DB_VERSION
      );
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create key store
        if (!db.objectStoreNames.contains(KeyManagementService.KEY_STORE_NAME)) {
          db.createObjectStore(KeyManagementService.KEY_STORE_NAME, { keyPath: 'keyId' });
        }
        
        // Create master key store
        if (!db.objectStoreNames.contains(KeyManagementService.MASTER_KEY_STORE_NAME)) {
          db.createObjectStore(KeyManagementService.MASTER_KEY_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }
}

// Export singleton instance
export const keyManagementService = new KeyManagementService();
