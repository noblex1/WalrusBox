// Seal Encryption Service
// Handles file encryption and decryption using Web Crypto API with AES-GCM

import {
  EncryptionOptions,
  EncryptionResult,
  EncryptionMetadata,
  SealError,
  SealErrorType,
  type EncryptionAlgorithm
} from './sealTypes';

/**
 * Current encryption version for compatibility tracking
 */
const ENCRYPTION_VERSION = '1.0.0';

/**
 * Default encryption algorithm
 */
const DEFAULT_ALGORITHM: EncryptionAlgorithm = 'AES-GCM';

/**
 * Default key size in bits
 */
const DEFAULT_KEY_SIZE = 256;

/**
 * IV length for AES-GCM (12 bytes is recommended)
 */
const IV_LENGTH = 12;

/**
 * Seal Encryption Service
 * Provides client-side encryption and decryption for files
 */
export class SealEncryptionService {
  /**
   * Encrypt a file using AES-GCM
   * @param file - File to encrypt
   * @param options - Encryption options
   * @returns Encryption result with encrypted data, key, IV, and metadata
   */
  async encryptFile(
    file: File,
    options: EncryptionOptions = {}
  ): Promise<EncryptionResult> {
    try {
      const algorithm = options.algorithm || DEFAULT_ALGORITHM;
      const keySize = options.keySize || DEFAULT_KEY_SIZE;

      // Generate or use provided key
      const key = options.key || (options.generateKey !== false 
        ? await this.generateKey(keySize)
        : null);

      if (!key) {
        throw new SealError(
          SealErrorType.ENCRYPTION_ERROR,
          'No encryption key provided or generated',
          undefined,
          false
        );
      }

      // Generate unique IV for this encryption operation
      const iv = this.generateIV();

      // Read file as ArrayBuffer
      const fileData = await file.arrayBuffer();

      // Encrypt the data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: algorithm,
          iv: iv as unknown as BufferSource
        },
        key,
        fileData
      );

      const encryptedData = new Uint8Array(encryptedBuffer);

      // Create metadata
      const metadata: EncryptionMetadata = {
        algorithm,
        keySize,
        iv: this.arrayBufferToBase64(iv),
        version: ENCRYPTION_VERSION,
        timestamp: new Date()
      };

      return {
        encryptedData,
        key,
        iv,
        metadata
      };
    } catch (error) {
      // Clear sensitive data on error
      this.secureMemoryCleanup();
      
      throw new SealError(
        SealErrorType.ENCRYPTION_ERROR,
        `Failed to encrypt file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { fileName: file.name, fileSize: file.size }
      );
    }
  }

  /**
   * Decrypt encrypted data
   * @param encryptedData - Encrypted data as Uint8Array
   * @param key - Decryption key
   * @param iv - Initialization vector used during encryption
   * @param algorithm - Encryption algorithm (default: AES-GCM)
   * @returns Decrypted data as Blob
   */
  async decryptFile(
    encryptedData: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array,
    algorithm: EncryptionAlgorithm = DEFAULT_ALGORITHM
  ): Promise<Blob> {
    try {
      // Decrypt the data with integrity verification (AES-GCM provides this)
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: algorithm,
          iv: iv as unknown as BufferSource
        },
        key,
        encryptedData as unknown as BufferSource
      );

      // Return as Blob for easy file handling
      return new Blob([decryptedBuffer]);
    } catch (error) {
      // Clear sensitive data on error
      this.secureMemoryCleanup();
      
      throw new SealError(
        SealErrorType.DECRYPTION_ERROR,
        `Failed to decrypt file: ${error instanceof Error ? error.message : 'Unknown error'}. Data may be corrupted or key is incorrect.`,
        error instanceof Error ? error : undefined,
        false,
        { dataSize: encryptedData.length }
      );
    }
  }

  /**
   * Generate a secure encryption key
   * @param keySize - Key size in bits (128, 192, or 256)
   * @returns CryptoKey for encryption/decryption
   */
  async generateKey(keySize: 128 | 192 | 256 = DEFAULT_KEY_SIZE): Promise<CryptoKey> {
    try {
      const key = await crypto.subtle.generateKey(
        {
          name: DEFAULT_ALGORITHM,
          length: keySize
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      return key;
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
   * Export a CryptoKey to a string format for storage
   * @param key - CryptoKey to export
   * @returns Base64-encoded key string
   */
  async exportKey(key: CryptoKey): Promise<string> {
    try {
      const exportedKey = await crypto.subtle.exportKey('raw', key);
      return this.arrayBufferToBase64(new Uint8Array(exportedKey));
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to export encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Import a key from string format
   * @param keyData - Base64-encoded key string
   * @param keySize - Key size in bits
   * @returns CryptoKey for encryption/decryption
   */
  async importKey(
    keyData: string,
    keySize: 128 | 192 | 256 = DEFAULT_KEY_SIZE
  ): Promise<CryptoKey> {
    try {
      const keyBuffer = this.base64ToArrayBuffer(keyData);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        {
          name: DEFAULT_ALGORITHM,
          length: keySize
        },
        true,
        ['encrypt', 'decrypt']
      );

      return key;
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to import encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { keySize }
      );
    }
  }

  /**
   * Generate a unique initialization vector (IV)
   * @returns Uint8Array containing random IV
   */
  private generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  }

  /**
   * Convert ArrayBuffer to Base64 string
   * @param buffer - ArrayBuffer or Uint8Array to convert
   * @returns Base64-encoded string
   */
  private arrayBufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   * @param base64 - Base64-encoded string
   * @returns ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Secure memory cleanup
   * Attempts to clear sensitive data from memory
   * Note: JavaScript doesn't provide guaranteed memory clearing,
   * but this helps reduce the window of exposure
   */
  private secureMemoryCleanup(): void {
    // Force garbage collection hint (not guaranteed)
    if (global.gc) {
      global.gc();
    }
  }
}

// Export singleton instance
export const sealEncryptionService = new SealEncryptionService();

/**
 * Encryption Metadata Handler
 * Handles storage and retrieval of encryption metadata
 */
export class EncryptionMetadataHandler {
  /**
   * Store encryption metadata in IndexedDB
   * @param fileId - Unique file identifier
   * @param metadata - Encryption metadata to store
   */
  async storeMetadata(fileId: string, metadata: EncryptionMetadata): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['encryptionMetadata'], 'readwrite');
      const store = transaction.objectStore('encryptionMetadata');
      
      const request = store.put({
        fileId,
        ...metadata,
        storedAt: new Date()
      });
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to store encryption metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { fileId }
      );
    }
  }

  /**
   * Retrieve encryption metadata from IndexedDB
   * @param fileId - Unique file identifier
   * @returns Encryption metadata or null if not found
   */
  async getMetadata(fileId: string): Promise<EncryptionMetadata | null> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['encryptionMetadata'], 'readonly');
      const store = transaction.objectStore('encryptionMetadata');
      
      const request = store.get(fileId);
      const result = await new Promise<any>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      if (!result) return null;
      
      return {
        algorithm: result.algorithm,
        keySize: result.keySize,
        iv: result.iv,
        version: result.version,
        timestamp: new Date(result.timestamp)
      };
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to retrieve encryption metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { fileId }
      );
    }
  }

  /**
   * Delete encryption metadata from IndexedDB
   * @param fileId - Unique file identifier
   */
  async deleteMetadata(fileId: string): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['encryptionMetadata'], 'readwrite');
      const store = transaction.objectStore('encryptionMetadata');
      
      const request = store.delete(fileId);
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to delete encryption metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { fileId }
      );
    }
  }

  /**
   * Open or create IndexedDB database for encryption metadata
   * @returns IDBDatabase instance
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SealEncryptionDB', 1);
      
      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for encryption metadata
        if (!db.objectStoreNames.contains('encryptionMetadata')) {
          db.createObjectStore('encryptionMetadata', { keyPath: 'fileId' });
        }
      };
    });
  }
}

/**
 * Key Derivation Service
 * Derives encryption keys from user wallet signatures
 */
export class KeyDerivationService {
  /**
   * Derive an encryption key from a wallet signature
   * @param walletAddress - User's wallet address
   * @param signMessage - Function to sign a message with the wallet
   * @param context - Optional context string for key derivation (e.g., file ID)
   * @returns Derived CryptoKey
   */
  async deriveKeyFromWallet(
    walletAddress: string,
    signMessage: (message: string) => Promise<string>,
    context: string = 'walrusbox-encryption'
  ): Promise<CryptoKey> {
    try {
      // Create a deterministic message to sign
      const message = `${context}:${walletAddress}`;
      
      // Get signature from wallet
      const signature = await signMessage(message);
      
      // Convert signature to key material
      const keyMaterial = await this.signatureToKeyMaterial(signature);
      
      // Derive key using PBKDF2
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode(walletAddress),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        {
          name: DEFAULT_ALGORITHM,
          length: DEFAULT_KEY_SIZE
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      return key;
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to derive key from wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { walletAddress, context }
      );
    }
  }

  /**
   * Convert signature string to CryptoKey material
   * @param signature - Signature string from wallet
   * @returns CryptoKey for key derivation
   */
  private async signatureToKeyMaterial(signature: string): Promise<CryptoKey> {
    // Convert signature to bytes
    const signatureBytes = new TextEncoder().encode(signature);
    
    // Import as raw key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      signatureBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    return keyMaterial;
  }

  /**
   * Derive a file-specific key from a master key
   * @param masterKey - Master encryption key
   * @param fileId - Unique file identifier
   * @returns File-specific CryptoKey
   */
  async deriveFileKey(masterKey: CryptoKey, fileId: string): Promise<CryptoKey> {
    try {
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
      
      // Derive file-specific key
      const fileKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode(fileId),
          iterations: 10000,
          hash: 'SHA-256'
        },
        derivableKey,
        {
          name: DEFAULT_ALGORITHM,
          length: DEFAULT_KEY_SIZE
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      return fileKey;
    } catch (error) {
      throw new SealError(
        SealErrorType.KEY_MANAGEMENT_ERROR,
        `Failed to derive file-specific key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        false,
        { fileId }
      );
    }
  }
}

/**
 * Algorithm Version Tracker
 * Tracks encryption algorithm versions for compatibility
 */
export class AlgorithmVersionTracker {
  private static readonly CURRENT_VERSION = ENCRYPTION_VERSION;
  private static readonly SUPPORTED_VERSIONS = ['1.0.0'];

  /**
   * Get current encryption version
   * @returns Current version string
   */
  static getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * Check if a version is supported
   * @param version - Version string to check
   * @returns true if version is supported
   */
  static isVersionSupported(version: string): boolean {
    return this.SUPPORTED_VERSIONS.includes(version);
  }

  /**
   * Get algorithm configuration for a specific version
   * @param version - Version string
   * @returns Algorithm configuration
   */
  static getAlgorithmConfig(version: string): {
    algorithm: EncryptionAlgorithm;
    keySize: number;
    ivLength: number;
  } {
    if (!this.isVersionSupported(version)) {
      throw new SealError(
        SealErrorType.ENCRYPTION_ERROR,
        `Unsupported encryption version: ${version}`,
        undefined,
        false,
        { version, supportedVersions: this.SUPPORTED_VERSIONS }
      );
    }

    // Version 1.0.0 configuration
    return {
      algorithm: DEFAULT_ALGORITHM,
      keySize: DEFAULT_KEY_SIZE,
      ivLength: IV_LENGTH
    };
  }

  /**
   * Validate encryption metadata version
   * @param metadata - Encryption metadata to validate
   * @throws SealError if version is not supported
   */
  static validateMetadata(metadata: EncryptionMetadata): void {
    if (!this.isVersionSupported(metadata.version)) {
      throw new SealError(
        SealErrorType.ENCRYPTION_ERROR,
        `Cannot decrypt file: encryption version ${metadata.version} is not supported`,
        undefined,
        false,
        { 
          metadataVersion: metadata.version, 
          supportedVersions: this.SUPPORTED_VERSIONS 
        }
      );
    }
  }
}

// Export singleton instances
export const encryptionMetadataHandler = new EncryptionMetadataHandler();
export const keyDerivationService = new KeyDerivationService();
