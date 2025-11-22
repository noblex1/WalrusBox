// Seal Metadata Service
// Centralized metadata management for Seal-encrypted files

import type { SealFileMetadata } from './sealTypes';
import { sealStorageService } from './sealStorage';
import { sealErrorLogger } from './sealErrorLogger';

/**
 * Blob verification result for a single blob
 */
export interface BlobVerificationResult {
  allBlobsExist: boolean;
  missingBlobs: string[];
  verifiedBlobs: string[];
  errors: Array<{ blobId: string; error: string }>;
  verifiedAt: Date;
}

/**
 * Verification cache entry
 */
interface VerificationCacheEntry {
  result: BlobVerificationResult;
  timestamp: number;
}

/**
 * Seal Metadata Service
 * Provides centralized metadata storage, retrieval, validation, and verification
 */
export class SealMetadataService {
  private readonly METADATA_KEY_PREFIX = 'seal_metadata_';
  private readonly VERIFICATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private verificationCache: Map<string, VerificationCacheEntry> = new Map();

  /**
   * Save Seal metadata to localStorage with consistent key format
   * @param fileId - Unique file identifier
   * @param metadata - Seal file metadata to store
   */
  async saveSealMetadata(fileId: string, metadata: SealFileMetadata): Promise<void> {
    try {
      const key = this.getMetadataKey(fileId);
      const serialized = JSON.stringify(metadata);
      
      localStorage.setItem(key, serialized);
      
      console.log(`✅ Saved Seal metadata for file: ${fileId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to save Seal metadata for file ${fileId}:`, errorMessage);
      
      sealErrorLogger.logError(
        error,
        'saveSealMetadata',
        { fileId, metadataSize: JSON.stringify(metadata).length }
      );
      
      throw new Error(`Failed to save Seal metadata: ${errorMessage}`);
    }
  }

  /**
   * Retrieve Seal metadata from localStorage
   * @param fileId - Unique file identifier
   * @returns Seal file metadata or null if not found
   */
  async getSealMetadata(fileId: string): Promise<SealFileMetadata | null> {
    try {
      const key = this.getMetadataKey(fileId);
      const serialized = localStorage.getItem(key);
      
      if (!serialized) {
        console.warn(`⚠️ No Seal metadata found for file: ${fileId}`);
        return null;
      }
      
      const metadata = JSON.parse(serialized) as SealFileMetadata;
      
      // Convert date strings back to Date objects
      if (metadata.uploadedAt) {
        metadata.uploadedAt = new Date(metadata.uploadedAt);
      }
      if (metadata.expiresAt) {
        metadata.expiresAt = new Date(metadata.expiresAt);
      }
      
      console.log(`✅ Retrieved Seal metadata for file: ${fileId}`);
      return metadata;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to retrieve Seal metadata for file ${fileId}:`, errorMessage);
      
      sealErrorLogger.logError(error, 'getSealMetadata', { fileId });
      
      return null;
    }
  }

  /**
   * Validate Seal metadata for required fields and data integrity
   * @param metadata - Seal file metadata to validate
   * @returns True if metadata is valid, false otherwise
   */
  validateSealMetadata(metadata: SealFileMetadata | null): boolean {
    if (!metadata) {
      console.warn('⚠️ Metadata is null or undefined');
      return false;
    }

    // Check required core fields
    const requiredFields: (keyof SealFileMetadata)[] = [
      'blobId',
      'fileId',
      'fileName',
      'originalSize',
      'encryptedSize',
      'mimeType',
      'isEncrypted',
      'uploadedAt'
    ];

    for (const field of requiredFields) {
      if (metadata[field] === undefined || metadata[field] === null) {
        console.warn(`⚠️ Missing required field: ${field}`);
        return false;
      }
    }

    // Validate encryption fields if encrypted
    if (metadata.isEncrypted) {
      if (!metadata.encryptionAlgorithm) {
        console.warn('⚠️ Missing encryption algorithm for encrypted file');
        return false;
      }
      if (!metadata.initializationVector) {
        console.warn('⚠️ Missing initialization vector for encrypted file');
        return false;
      }
    }

    // Validate chunking fields if chunked
    if (metadata.isChunked) {
      if (!metadata.chunkCount || metadata.chunkCount <= 0) {
        console.warn('⚠️ Invalid chunk count for chunked file');
        return false;
      }
      if (!metadata.chunks || metadata.chunks.length === 0) {
        console.warn('⚠️ Missing chunks array for chunked file');
        return false;
      }
      if (metadata.chunks.length !== metadata.chunkCount) {
        console.warn(`⚠️ Chunk count mismatch: expected ${metadata.chunkCount}, got ${metadata.chunks.length}`);
        return false;
      }

      // Validate each chunk has required fields
      for (let i = 0; i < metadata.chunks.length; i++) {
        const chunk = metadata.chunks[i];
        if (!chunk.blobId) {
          console.warn(`⚠️ Missing blob ID for chunk ${i}`);
          return false;
        }
        if (chunk.index !== i) {
          console.warn(`⚠️ Chunk index mismatch at position ${i}: expected ${i}, got ${chunk.index}`);
          return false;
        }
      }
    } else {
      // Non-chunked file must have a valid blob ID
      if (!metadata.blobId || metadata.blobId.trim() === '') {
        console.warn('⚠️ Missing or empty blob ID for non-chunked file');
        return false;
      }
    }

    // Validate content hash
    if (!metadata.contentHash || metadata.contentHash.trim() === '') {
      console.warn('⚠️ Missing content hash');
      return false;
    }

    console.log(`✅ Metadata validation passed for file: ${metadata.fileId}`);
    return true;
  }

  /**
   * Verify that all blobs exist on Walrus network using HEAD requests
   * @param metadata - Seal file metadata with blob IDs
   * @returns Verification result with details
   */
  async verifyBlobsExist(metadata: SealFileMetadata): Promise<BlobVerificationResult> {
    const fileId = metadata.fileId;
    
    // Check cache first
    const cached = this.getFromCache(fileId);
    if (cached) {
      console.log(`✅ Using cached verification result for file: ${fileId}`);
      return cached;
    }

    const verifiedBlobs: string[] = [];
    const missingBlobs: string[] = [];
    const errors: Array<{ blobId: string; error: string }> = [];

    try {
      console.log(`🔍 Verifying blobs for file: ${fileId}`);

      // Collect all blob IDs to verify
      const blobIds: string[] = [];
      
      if (metadata.isChunked && metadata.chunks) {
        // Verify all chunks
        for (const chunk of metadata.chunks) {
          if (chunk.blobId) {
            blobIds.push(chunk.blobId);
          }
        }
      } else {
        // Verify single blob
        if (metadata.blobId) {
          blobIds.push(metadata.blobId);
        }
      }

      if (blobIds.length === 0) {
        console.warn(`⚠️ No blob IDs found in metadata for file: ${fileId}`);
        const result: BlobVerificationResult = {
          allBlobsExist: false,
          missingBlobs: [],
          verifiedBlobs: [],
          errors: [{ blobId: '', error: 'No blob IDs found in metadata' }],
          verifiedAt: new Date()
        };
        return result;
      }

      // Verify each blob
      for (const blobId of blobIds) {
        try {
          const verificationResult = await sealStorageService.verifyBlob(blobId);
          
          if (verificationResult.exists) {
            verifiedBlobs.push(blobId);
            console.log(`✅ Blob verified: ${blobId}`);
          } else {
            missingBlobs.push(blobId);
            const errorMsg = verificationResult.error || 'Blob not found';
            errors.push({ blobId, error: errorMsg });
            console.warn(`❌ Blob missing: ${blobId} - ${errorMsg}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          missingBlobs.push(blobId);
          errors.push({ blobId, error: errorMsg });
          console.error(`❌ Error verifying blob ${blobId}:`, errorMsg);
        }
      }

      const allBlobsExist = missingBlobs.length === 0;
      const result: BlobVerificationResult = {
        allBlobsExist,
        missingBlobs,
        verifiedBlobs,
        errors,
        verifiedAt: new Date()
      };

      // Cache the result
      this.addToCache(fileId, result);

      if (allBlobsExist) {
        console.log(`✅ All blobs verified for file: ${fileId} (${verifiedBlobs.length} blobs)`);
      } else {
        console.warn(`⚠️ Verification failed for file: ${fileId} - ${missingBlobs.length} missing blobs`);
        
        // Log detailed error information
        sealErrorLogger.logError(
          new Error('Blob verification failed'),
          'verifyBlobsExist',
          {
            fileId,
            fileName: metadata.fileName,
            missingBlobs,
            verifiedBlobs,
            errors
          }
        );
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to verify blobs for file ${fileId}:`, errorMsg);
      
      sealErrorLogger.logError(error, 'verifyBlobsExist', { fileId, fileName: metadata.fileName });
      
      return {
        allBlobsExist: false,
        missingBlobs: [],
        verifiedBlobs: [],
        errors: [{ blobId: '', error: errorMsg }],
        verifiedAt: new Date()
      };
    }
  }

  /**
   * Get metadata key for localStorage
   * @param fileId - File identifier
   * @returns Formatted metadata key
   */
  private getMetadataKey(fileId: string): string {
    return `${this.METADATA_KEY_PREFIX}${fileId}`;
  }

  /**
   * Get verification result from cache if not expired
   * @param fileId - File identifier
   * @returns Cached verification result or null
   */
  private getFromCache(fileId: string): BlobVerificationResult | null {
    const entry = this.verificationCache.get(fileId);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > this.VERIFICATION_CACHE_TTL) {
      // Cache expired, remove it
      this.verificationCache.delete(fileId);
      console.log(`🗑️ Verification cache expired for file: ${fileId}`);
      return null;
    }

    return entry.result;
  }

  /**
   * Add verification result to cache
   * @param fileId - File identifier
   * @param result - Verification result to cache
   */
  private addToCache(fileId: string, result: BlobVerificationResult): void {
    this.verificationCache.set(fileId, {
      result,
      timestamp: Date.now()
    });
    
    console.log(`💾 Cached verification result for file: ${fileId}`);
  }

  /**
   * Clear verification cache for a specific file or all files
   * @param fileId - Optional file identifier to clear specific cache entry
   */
  clearVerificationCache(fileId?: string): void {
    if (fileId) {
      this.verificationCache.delete(fileId);
      console.log(`🗑️ Cleared verification cache for file: ${fileId}`);
    } else {
      this.verificationCache.clear();
      console.log(`🗑️ Cleared all verification cache`);
    }
  }

  /**
   * Delete Seal metadata from localStorage
   * @param fileId - File identifier
   */
  async deleteSealMetadata(fileId: string): Promise<void> {
    try {
      const key = this.getMetadataKey(fileId);
      localStorage.removeItem(key);
      
      // Also clear from verification cache
      this.clearVerificationCache(fileId);
      
      console.log(`🗑️ Deleted Seal metadata for file: ${fileId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to delete Seal metadata for file ${fileId}:`, errorMessage);
      
      sealErrorLogger.logError(error, 'deleteSealMetadata', { fileId });
      
      throw new Error(`Failed to delete Seal metadata: ${errorMessage}`);
    }
  }

  /**
   * List all Seal metadata keys in localStorage
   * @returns Array of file IDs with Seal metadata
   */
  listSealMetadataKeys(): string[] {
    const keys: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.METADATA_KEY_PREFIX)) {
          const fileId = key.substring(this.METADATA_KEY_PREFIX.length);
          keys.push(fileId);
        }
      }
      
      console.log(`📋 Found ${keys.length} Seal metadata entries`);
    } catch (error) {
      console.error('❌ Failed to list Seal metadata keys:', error);
    }
    
    return keys;
  }

  /**
   * Migrate old metadata format to new format
   * Scans localStorage for old metadata key formats and converts them
   * @returns Number of metadata entries migrated
   */
  async migrateOldMetadata(): Promise<number> {
    let migratedCount = 0;
    
    try {
      console.log('🔄 Starting metadata migration...');
      
      // Scan for old metadata patterns
      const oldPatterns = [
        'seal_',
        'encrypted_',
        'file_metadata_',
        'blob_metadata_'
      ];
      
      const keysToMigrate: Array<{ oldKey: string; fileId: string; metadata: SealFileMetadata }> = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        // Skip if already in new format
        if (key.startsWith(this.METADATA_KEY_PREFIX)) {
          continue;
        }
        
        // Check if matches old patterns
        const matchesOldPattern = oldPatterns.some(pattern => key.startsWith(pattern));
        if (!matchesOldPattern) {
          continue;
        }
        
        try {
          const value = localStorage.getItem(key);
          if (!value) continue;
          
          const parsed = JSON.parse(value);
          
          // Check if it looks like Seal metadata
          if (parsed.isEncrypted !== undefined && parsed.blobId && parsed.fileId) {
            keysToMigrate.push({
              oldKey: key,
              fileId: parsed.fileId,
              metadata: parsed as SealFileMetadata
            });
          }
        } catch (error) {
          // Skip invalid JSON
          continue;
        }
      }
      
      console.log(`📋 Found ${keysToMigrate.length} metadata entries to migrate`);
      
      // Migrate each entry
      for (const { oldKey, fileId, metadata } of keysToMigrate) {
        try {
          // Validate metadata before migration
          if (!this.validateSealMetadata(metadata)) {
            console.warn(`⚠️ Skipping invalid metadata for file: ${fileId}`);
            continue;
          }
          
          // Save in new format
          await this.saveSealMetadata(fileId, metadata);
          
          // Remove old key
          localStorage.removeItem(oldKey);
          
          migratedCount++;
          console.log(`✅ Migrated metadata: ${oldKey} -> ${this.getMetadataKey(fileId)}`);
        } catch (error) {
          console.error(`❌ Failed to migrate metadata for file ${fileId}:`, error);
        }
      }
      
      console.log(`✅ Migration complete: ${migratedCount} entries migrated`);
      
      // Log migration results
      sealErrorLogger.logError(
        new Error('Metadata migration completed'),
        'migrateOldMetadata',
        { migratedCount, totalFound: keysToMigrate.length }
      );
    } catch (error) {
      console.error('❌ Metadata migration failed:', error);
      sealErrorLogger.logError(error, 'migrateOldMetadata', { migratedCount });
    }
    
    return migratedCount;
  }
}

// Export singleton instance
export const sealMetadataService = new SealMetadataService();
