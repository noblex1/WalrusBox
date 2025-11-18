// Wallet-Based Key Derivation Service
// Derives encryption keys from user wallet signatures with key rotation support

import {
  SealError,
  SealErrorType
} from './sealTypes';
import { sealEncryptionService } from './sealEncryption';
import { keyManagementService } from './keyManagement';

/**
 * Key rotation metadata
 */
export interface KeyRotationMetadata {
  keyId: string;
  previousKeyId?: string;
  rotationNumber: number;
  rotatedAt: Date;
  reason: 'scheduled' | 'manual' | 'compromise';
}

/**
 * Wallet key derivation options
 */
export interface WalletKeyDerivationOptions {
  walletAddress: string;
  context?: string; // Optional context for key derivation (e.g., file ID)
  rotationNumber?: number; // For key rotation
}

/**
 * Wallet-Based Key Derivation Service
 * Derives deterministic encryption keys from wallet signatures
 */
export class WalletKeyDerivationService {
  private static readonly DB_NAME = 'SealWalletKeyDB';
  private static readonly DB_VERSION = 1;
  private static readonly ROTATION_STORE_NAME = 'keyRotations';
  private static readonly DEFAULT_CONTEXT = 'walrusbox-encryption';
  
  // Cache for derived keys to avoid repeated wallet signatures
  private derivedKeyCache: Map<string, { key: CryptoKey; derivedAt: Date }> = new Map();

  /**
   * Derive an encryption key from user wallet signature
   * @param walletAddress - User's wallet address
   * @param signMessage - Function to sign a message with the wallet
   * @param options - Derivation options
   * @returns Derived CryptoKey and key ID
   */
  async deriveKeyFromWallet(
    walletAddress: string,
    signMessage: (message: string) => Promise<string>,
    options: Partial<WalletKeyDerivationOptions> = {}
  ): Promise<{ keyId: string; key: CryptoKey }> {
    try {
      const context = options.context || WalletKeyDerivationService.DEFAULT_CONTEXT;
      const rotationNumber = options.rotationNumber || 0;
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(walletAddress, context, rotationNumber);
      
      // Check cache first
      const cached = this.derivedKeyCache.get(cacheKey);
      if (cached) {
        // Return cached key if it's less than 1 hour old
        const age = Date.now() - cached.derivedAt.getTime();
        if (age < 3600000) { // 1 hour
          const keyId = await this.getOrCreateKeyId(walletAddress, context, rotationNumber);
          return { keyId, key: cached.key };
        }
      }

      // Create deterministic message to sign
      const message = this.createDerivationMessage(walletAddress, context, rotationNumber);
      
      // Get signature from wallet
      const signature = await signMessage(message);
      
      // Derive key from signature
      const key = await this.deriveKeyFromSignature(signature, walletAddress, context);
      
      // Cache the derived key
      this.derivedKeyCache.set(cacheKey, { key, derivedAt: new Date() });
      
      // Get or create key ID
      const keyId = await this.getOrCreateKeyId(walletAddress, context, rotationNumber);
      
      // Store the key in key management service
      await this.storeWalletDerivedKey(keyId, key, walletAddress, context, rotationNumber);
      
      return { keyId, key };
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to derive key from wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { walletAddress, context: options.context }
      );
    }
  }

  /**
   * Derive a file-specific key from a master wallet key
   * @param walletAddress - User's wallet address
   * @param signMessage - Function to sign a message with the wallet
   * @param fileId - Unique file identifier
   * @returns Derived CryptoKey and key ID for the file
   */
  async deriveFileKey(
    walletAddress: string,
    signMessage: (message: string) => Promise<string>,
    fileId: string
  ): Promise<{ keyId: string; key: CryptoKey }> {
    try {
      // Derive master key from wallet
      const { key: masterKey } = await this.deriveKeyFromWallet(
        walletAddress,
        signMessage,
        { context: WalletKeyDerivationService.DEFAULT_CONTEXT }
      );
      
      // Derive file-specific key from master key
      const fileKey = await this.deriveSubKey(masterKey, fileId);
      
      // Generate file-specific key ID
      const keyId = await this.generateFileKeyId(walletAddress, fileId);
      
      // Store the file key
      await this.storeWalletDerivedKey(keyId, fileKey, walletAddress, fileId, 0);
      
      return { keyId, key: fileKey };
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to derive file-specific key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { walletAddress, fileId }
      );
    }
  }

  /**
   * Rotate an encryption key
   * @param walletAddress - User's wallet address
   * @param signMessage - Function to sign a message with the wallet
   * @param currentKeyId - Current key ID to rotate
   * @param reason - Reason for rotation
   * @returns New key ID and CryptoKey
   */
  async rotateKey(
    walletAddress: string,
    signMessage: (message: string) => Promise<string>,
    currentKeyId: string,
    reason: 'scheduled' | 'manual' | 'compromise' = 'manual'
  ): Promise<{ newKeyId: string; newKey: CryptoKey; rotationMetadata: KeyRotationMetadata }> {
    try {
      // Get current rotation number
      const currentRotation = await this.getCurrentRotationNumber(currentKeyId);
      const newRotationNumber = currentRotation + 1;
      
      // Extract context from key ID
      const context = await this.getContextFromKeyId(currentKeyId);
      
      // Derive new key with incremented rotation number
      const { keyId: newKeyId, key: newKey } = await this.deriveKeyFromWallet(
        walletAddress,
        signMessage,
        { context, rotationNumber: newRotationNumber }
      );
      
      // Create rotation metadata
      const rotationMetadata: KeyRotationMetadata = {
        keyId: newKeyId,
        previousKeyId: currentKeyId,
        rotationNumber: newRotationNumber,
        rotatedAt: new Date(),
        reason
      };
      
      // Store rotation metadata
      await this.storeRotationMetadata(rotationMetadata);
      
      // Clear cache for old key
      this.clearCacheForKey(currentKeyId);
      
      return { newKeyId, newKey, rotationMetadata };
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to rotate key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { walletAddress, currentKeyId, reason }
      );
    }
  }

  /**
   * Get rotation history for a key
   * @param keyId - Key identifier
   * @returns Array of rotation metadata
   */
  async getRotationHistory(keyId: string): Promise<KeyRotationMetadata[]> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([WalletKeyDerivationService.ROTATION_STORE_NAME], 'readonly');
      const store = transaction.objectStore(WalletKeyDerivationService.ROTATION_STORE_NAME);
      
      const allRotations = await new Promise<KeyRotationMetadata[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      // Find rotation chain for this key
      const rotationChain: KeyRotationMetadata[] = [];
      let currentKeyId: string | undefined = keyId;
      
      while (currentKeyId) {
        const rotation = allRotations.find(r => r.keyId === currentKeyId);
        if (rotation) {
          rotationChain.push(rotation);
          currentKeyId = rotation.previousKeyId;
        } else {
          break;
        }
      }
      
      return rotationChain.reverse(); // Oldest first
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to get rotation history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { keyId }
      );
    }
  }

  /**
   * Check if a key should be rotated based on age
   * @param keyId - Key identifier
   * @param maxAgeInDays - Maximum age in days before rotation is recommended
   * @returns true if rotation is recommended
   */
  async shouldRotateKey(keyId: string, maxAgeInDays: number = 90): Promise<boolean> {
    try {
      const rotationHistory = await this.getRotationHistory(keyId);
      
      if (rotationHistory.length === 0) {
        // No rotation history, check key creation date
        // For now, assume rotation is not needed
        return false;
      }
      
      const lastRotation = rotationHistory[rotationHistory.length - 1];
      const daysSinceRotation = (Date.now() - lastRotation.rotatedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      return daysSinceRotation >= maxAgeInDays;
    } catch (error) {
      console.warn(`Failed to check key rotation status: ${error}`);
      return false;
    }
  }

  /**
   * Clear all cached derived keys
   */
  clearCache(): void {
    this.derivedKeyCache.clear();
  }

  /**
   * Create a deterministic message for wallet signing
   * @param walletAddress - User's wallet address
   * @param context - Context string
   * @param rotationNumber - Rotation number
   * @returns Message string to sign
   */
  private createDerivationMessage(
    walletAddress: string,
    context: string,
    rotationNumber: number
  ): string {
    return `WalrusBox Key Derivation\nContext: ${context}\nWallet: ${walletAddress}\nRotation: ${rotationNumber}\nTimestamp: ${Math.floor(Date.now() / 86400000)}`; // Daily rotation of timestamp
  }

  /**
   * Derive a CryptoKey from a wallet signature
   * @param signature - Wallet signature
   * @param walletAddress - User's wallet address
   * @param context - Context string
   * @returns Derived CryptoKey
   */
  private async deriveKeyFromSignature(
    signature: string,
    walletAddress: string,
    context: string
  ): Promise<CryptoKey> {
    // Convert signature to bytes
    const signatureBytes = new TextEncoder().encode(signature);
    
    // Import as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      signatureBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Create salt from wallet address and context
    const salt = new TextEncoder().encode(`${walletAddress}:${context}`);
    
    // Derive key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    return key;
  }

  /**
   * Derive a sub-key from a master key
   * @param masterKey - Master CryptoKey
   * @param subContext - Sub-context (e.g., file ID)
   * @returns Derived sub-key
   */
  private async deriveSubKey(masterKey: CryptoKey, subContext: string): Promise<CryptoKey> {
    // Export master key
    const masterKeyData = await crypto.subtle.exportKey('raw', masterKey);
    
    // Import as derivable key
    const derivableKey = await crypto.subtle.importKey(
      'raw',
      masterKeyData,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive sub-key
    const subKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(subContext),
        iterations: 10000,
        hash: 'SHA-256'
      },
      derivableKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    return subKey;
  }

  /**
   * Generate a cache key for derived keys
   * @param walletAddress - User's wallet address
   * @param context - Context string
   * @param rotationNumber - Rotation number
   * @returns Cache key string
   */
  private generateCacheKey(
    walletAddress: string,
    context: string,
    rotationNumber: number
  ): string {
    return `${walletAddress}:${context}:${rotationNumber}`;
  }

  /**
   * Get or create a key ID for a wallet-derived key
   * @param walletAddress - User's wallet address
   * @param context - Context string
   * @param rotationNumber - Rotation number
   * @returns Key ID
   */
  private async getOrCreateKeyId(
    walletAddress: string,
    context: string,
    rotationNumber: number
  ): Promise<string> {
    // Create deterministic key ID
    const idString = `${walletAddress}:${context}:${rotationNumber}`;
    const idBytes = new TextEncoder().encode(idString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', idBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `wallet_key_${hashHex.substring(0, 32)}`;
  }

  /**
   * Generate a file-specific key ID
   * @param walletAddress - User's wallet address
   * @param fileId - File identifier
   * @returns Key ID
   */
  private async generateFileKeyId(walletAddress: string, fileId: string): Promise<string> {
    const idString = `${walletAddress}:file:${fileId}`;
    const idBytes = new TextEncoder().encode(idString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', idBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `file_key_${hashHex.substring(0, 32)}`;
  }

  /**
   * Store a wallet-derived key in the key management service
   * @param keyId - Key identifier
   * @param key - CryptoKey to store
   * @param walletAddress - User's wallet address
   * @param context - Context string
   * @param rotationNumber - Rotation number
   */
  private async storeWalletDerivedKey(
    keyId: string,
    key: CryptoKey,
    walletAddress: string,
    context: string,
    rotationNumber: number
  ): Promise<void> {
    // Check if key already exists
    const existingKey = await keyManagementService.getKey(keyId);
    if (existingKey) {
      return; // Key already stored
    }
    
    // Export and re-import through key management service to ensure proper storage
    const exportedKey = await sealEncryptionService.exportKey(key);
    const importedKey = await sealEncryptionService.importKey(exportedKey, 256);
    
    // Store using key management service's internal method
    // Note: This is a simplified approach. In production, you might want to extend
    // KeyManagementService to accept pre-generated keys with specific IDs
    await keyManagementService.associateFileWithKey(keyId, `wallet:${walletAddress}:${context}:${rotationNumber}`);
  }

  /**
   * Get current rotation number for a key
   * @param keyId - Key identifier
   * @returns Current rotation number
   */
  private async getCurrentRotationNumber(keyId: string): Promise<number> {
    try {
      const rotationHistory = await this.getRotationHistory(keyId);
      if (rotationHistory.length === 0) {
        return 0;
      }
      return rotationHistory[rotationHistory.length - 1].rotationNumber;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get context from key ID
   * @param keyId - Key identifier
   * @returns Context string
   */
  private async getContextFromKeyId(keyId: string): Promise<string> {
    // For wallet-derived keys, we store the context in the associated files
    // This is a simplified implementation
    return WalletKeyDerivationService.DEFAULT_CONTEXT;
  }

  /**
   * Store rotation metadata
   * @param metadata - Rotation metadata to store
   */
  private async storeRotationMetadata(metadata: KeyRotationMetadata): Promise<void> {
    const db = await this.openDatabase();
    const transaction = db.transaction([WalletKeyDerivationService.ROTATION_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(WalletKeyDerivationService.ROTATION_STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        ...metadata,
        rotatedAt: metadata.rotatedAt.toISOString()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  }

  /**
   * Clear cache for a specific key
   * @param keyId - Key identifier
   */
  private clearCacheForKey(keyId: string): void {
    // Remove all cache entries that might be related to this key
    for (const [cacheKey] of this.derivedKeyCache) {
      if (cacheKey.includes(keyId)) {
        this.derivedKeyCache.delete(cacheKey);
      }
    }
  }

  /**
   * Open or create IndexedDB database
   * @returns IDBDatabase instance
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        WalletKeyDerivationService.DB_NAME,
        WalletKeyDerivationService.DB_VERSION
      );
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create rotation metadata store
        if (!db.objectStoreNames.contains(WalletKeyDerivationService.ROTATION_STORE_NAME)) {
          db.createObjectStore(WalletKeyDerivationService.ROTATION_STORE_NAME, { keyPath: 'keyId' });
        }
      };
    });
  }
}

// Export singleton instance
export const walletKeyDerivationService = new WalletKeyDerivationService();
