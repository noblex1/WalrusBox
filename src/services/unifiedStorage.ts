// Unified Storage Service
// Provides a unified interface for both encrypted (Seal) and unencrypted (Walrus) storage
// Uses adapter pattern to route operations to the appropriate service

import { walrusService } from './walrus';
import { sealStorageService } from './seal/sealStorage';
import { blobTrackingService } from './blobTracking';
import { isEncrypted, getServiceType, validateMetadata, getFileTypeSummary } from './seal/fileTypeDetection';
import type { BlobMetadata, SealFileMetadata } from '@/types/walrus';
import type { 
  UnifiedUploadOptions, 
  UnifiedUploadResult,
  UploadProgress,
  DownloadProgress
} from './seal/sealTypes';

/**
 * Unified download options
 */
export interface UnifiedDownloadOptions {
  encryptionKey?: string;
  onProgress?: (progress: DownloadProgress) => void;
  verifyIntegrity?: boolean;
}

/**
 * Unified verification result
 */
export interface UnifiedVerificationResult {
  exists: boolean;
  encrypted: boolean;
  size?: number;
  responseTime?: number;
  error?: string;
  details?: {
    contentHashMatch?: boolean;
    allChunksPresent?: boolean;
    chunkCount?: number;
  };
}

/**
 * Unified Storage Service
 * Provides a single interface for both encrypted and unencrypted file operations
 */
export class UnifiedStorageService {
  /**
   * Upload a file with automatic routing based on encryption preference
   * @param file - File to upload
   * @param options - Upload options
   * @returns Upload result with metadata
   */
  async uploadFile(
    file: File,
    options: UnifiedUploadOptions
  ): Promise<UnifiedUploadResult> {
    try {
      console.log(`📤 Uploading file: ${file.name} (encryption: ${options.useEncryption ? 'enabled' : 'disabled'})`);

      if (options.useEncryption) {
        // Route to Seal service for encrypted upload
        return await this.uploadEncrypted(file, options);
      } else {
        // Route to Walrus service for unencrypted upload
        return await this.uploadUnencrypted(file, options);
      }
    } catch (error) {
      console.error('Unified upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload file with encryption using Seal
   * @param file - File to upload
   * @param options - Upload options
   * @returns Upload result
   */
  private async uploadEncrypted(
    file: File,
    options: UnifiedUploadOptions
  ): Promise<UnifiedUploadResult> {
    const sealResult = await sealStorageService.uploadFile(file, {
      encrypt: true,
      userAddress: options.userAddress,
      epochs: options.epochs || 5,
      onProgress: options.onProgress,
      encryptionOptions: {
        algorithm: 'AES-GCM',
        keySize: 256,
        generateKey: true
      }
    });

    // Track the encrypted blob
    await blobTrackingService.trackBlob(sealResult.metadata);

    console.log(`✅ Encrypted upload complete: ${sealResult.blobIds[0]}`);

    return {
      mode: 'encrypted',
      blobIds: sealResult.blobIds,
      objectIds: sealResult.objectIds,
      metadata: sealResult.metadata,
      encryptionKey: sealResult.encryptionKey
    };
  }

  /**
   * Upload file without encryption using Walrus
   * @param file - File to upload
   * @param options - Upload options
   * @returns Upload result
   */
  private async uploadUnencrypted(
    file: File,
    options: UnifiedUploadOptions
  ): Promise<UnifiedUploadResult> {
    const walrusBlob = await walrusService.uploadFile(
      file,
      options.userAddress,
      options.epochs || 5
    );

    // Create tracking metadata
    const metadata: BlobMetadata = {
      blobId: walrusBlob.blobId,
      fileId: crypto.randomUUID(),
      objectId: '',
      fileName: file.name,
      originalSize: file.size,
      encryptedSize: file.size,
      encodedSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      contentType: this.categorizeContentType(file.type),
      walrusResponse: walrusBlob.walrusResponse || {} as any,
      storageCost: 0,
      storageEpochs: options.epochs || 5,
      uploadEpoch: 0,
      expirationEpoch: 0,
      aggregatorUrl: walrusBlob.walrusUrl,
      walrusScanUrl: walrusService.getWalrusScanUrl(walrusBlob.blobId),
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + (options.epochs || 5) * 24 * 60 * 60 * 1000),
      status: 'active',
      downloadCount: 0,
      reuseCount: 0
    };

    // Track the blob
    await blobTrackingService.trackBlob(metadata);

    console.log(`✅ Unencrypted upload complete: ${walrusBlob.blobId}`);

    return {
      mode: 'unencrypted',
      blobIds: [walrusBlob.blobId],
      objectIds: [],
      metadata
    };
  }

  /**
   * Download a file with automatic routing based on encryption status
   * @param blobId - Blob ID to download
   * @param options - Download options
   * @returns Downloaded file as Blob
   */
  async downloadFile(
    blobId: string,
    options?: UnifiedDownloadOptions
  ): Promise<Blob> {
    try {
      console.log(`📥 Downloading file: ${blobId}`);

      // Get metadata to determine encryption status
      const metadata = await blobTrackingService.getBlobMetadata(blobId);

      if (!metadata) {
        throw new Error(`Blob ${blobId} not found in tracking database`);
      }

      // Validate metadata
      const validation = validateMetadata(metadata, 'download');
      if (!validation.valid) {
        throw new Error(`Invalid metadata: ${validation.error}`);
      }

      console.log(`📋 File type: ${getFileTypeSummary(metadata)}`);

      if (isEncrypted(metadata)) {
        // Route to Seal service for encrypted download
        return await this.downloadEncrypted(metadata as SealFileMetadata, options);
      } else {
        // Route to Walrus service for unencrypted download
        return await this.downloadUnencrypted(metadata, options);
      }
    } catch (error) {
      console.error('Unified download failed:', error);
      throw error;
    }
  }

  /**
   * Download encrypted file using Seal
   * @param metadata - File metadata
   * @param options - Download options
   * @returns Decrypted file as Blob
   */
  private async downloadEncrypted(
    metadata: SealFileMetadata,
    options?: UnifiedDownloadOptions
  ): Promise<Blob> {
    if (!options?.encryptionKey) {
      throw new Error('Encryption key required to download encrypted file');
    }

    const blob = await sealStorageService.downloadFile(metadata, {
      decrypt: true,
      encryptionKey: options.encryptionKey,
      onProgress: options?.onProgress,
      verifyIntegrity: options?.verifyIntegrity !== false
    });

    // Update download count
    await blobTrackingService.updateBlobMetadata(metadata.blobId, {
      downloadCount: metadata.downloadCount + 1,
      lastAccessed: new Date()
    });

    console.log(`✅ Encrypted download complete: ${metadata.blobId}`);

    return blob;
  }

  /**
   * Download unencrypted file using Walrus
   * @param metadata - File metadata
   * @param options - Download options
   * @returns File as Blob
   */
  private async downloadUnencrypted(
    metadata: BlobMetadata,
    options?: UnifiedDownloadOptions
  ): Promise<Blob> {
    const blob = await walrusService.downloadBlob(metadata.blobId);

    // Update download count
    await blobTrackingService.updateBlobMetadata(metadata.blobId, {
      downloadCount: metadata.downloadCount + 1,
      lastAccessed: new Date()
    });

    console.log(`✅ Unencrypted download complete: ${metadata.blobId}`);

    return blob;
  }

  /**
   * Verify a file with automatic routing based on encryption status
   * @param blobId - Blob ID to verify
   * @param verifyContentHash - Whether to verify content hash (encrypted files only)
   * @returns Verification result
   */
  async verifyFile(
    blobId: string,
    verifyContentHash: boolean = false
  ): Promise<UnifiedVerificationResult> {
    try {
      console.log(`🔍 Verifying file: ${blobId}`);

      // Get metadata to determine encryption status
      const metadata = await blobTrackingService.getBlobMetadata(blobId);

      if (!metadata) {
        return {
          exists: false,
          encrypted: false,
          error: 'Blob not found in tracking database'
        };
      }

      // Validate metadata
      const validation = validateMetadata(metadata, 'verify');
      if (!validation.valid) {
        return {
          exists: false,
          encrypted: isEncrypted(metadata),
          error: `Invalid metadata: ${validation.error}`
        };
      }

      if (isEncrypted(metadata)) {
        // Route to Seal service for encrypted verification
        return await this.verifyEncrypted(metadata as SealFileMetadata, verifyContentHash);
      } else {
        // Route to Walrus service for unencrypted verification
        return await this.verifyUnencrypted(metadata);
      }
    } catch (error) {
      console.error('Unified verification failed:', error);
      return {
        exists: false,
        encrypted: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify encrypted file using Seal
   * @param metadata - File metadata
   * @param verifyContentHash - Whether to verify content hash
   * @returns Verification result
   */
  private async verifyEncrypted(
    metadata: SealFileMetadata,
    verifyContentHash: boolean
  ): Promise<UnifiedVerificationResult> {
    const result = await sealStorageService.verifyFile(metadata, verifyContentHash);

    // Update verification status
    await blobTrackingService.updateBlobMetadata(metadata.blobId, {
      verificationStatus: result.success ? 'verified' : 'failed',
      lastVerified: new Date()
    });

    console.log(`${result.success ? '✅' : '❌'} Encrypted verification complete: ${metadata.blobId}`);

    return {
      exists: result.allChunksPresent,
      encrypted: true,
      error: result.error,
      details: {
        contentHashMatch: result.contentHashMatch,
        allChunksPresent: result.allChunksPresent,
        chunkCount: metadata.chunkCount
      }
    };
  }

  /**
   * Verify unencrypted file using Walrus
   * @param metadata - File metadata
   * @returns Verification result
   */
  private async verifyUnencrypted(
    metadata: BlobMetadata
  ): Promise<UnifiedVerificationResult> {
    const startTime = Date.now();
    const exists = await walrusService.verifyBlob(metadata.blobId);
    const responseTime = Date.now() - startTime;

    // Update verification status
    await blobTrackingService.updateBlobMetadata(metadata.blobId, {
      verificationStatus: exists ? 'verified' : 'failed',
      lastVerified: new Date()
    });

    console.log(`${exists ? '✅' : '❌'} Unencrypted verification complete: ${metadata.blobId}`);

    return {
      exists,
      encrypted: false,
      responseTime,
      error: exists ? undefined : 'Blob not found on Walrus network'
    };
  }

  /**
   * Delete a file with automatic routing based on encryption status
   * @param blobId - Blob ID to delete
   * @returns True if deletion was successful
   */
  async deleteFile(blobId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting file: ${blobId}`);

      // Get metadata to determine encryption status
      const metadata = await blobTrackingService.getBlobMetadata(blobId);

      if (!metadata) {
        console.warn(`Blob ${blobId} not found in tracking database`);
        return false;
      }

      // For both encrypted and unencrypted files, we just remove from tracking
      // Walrus blobs are immutable and will expire based on storage epochs
      await blobTrackingService.deleteBlobMetadata(blobId);

      console.log(`✅ File deleted from tracking: ${blobId}`);

      return true;
    } catch (error) {
      console.error('Unified deletion failed:', error);
      return false;
    }
  }

  /**
   * Get file metadata with encryption status
   * @param blobId - Blob ID
   * @returns File metadata or null if not found
   */
  async getFileMetadata(blobId: string): Promise<(BlobMetadata | SealFileMetadata) | null> {
    try {
      const metadata = await blobTrackingService.getBlobMetadata(blobId);
      
      if (metadata) {
        console.log(`📋 Retrieved metadata for ${blobId}: ${getFileTypeSummary(metadata)}`);
      }

      return metadata;
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return null;
    }
  }

  /**
   * Check if a file is encrypted
   * @param blobId - Blob ID
   * @returns True if file is encrypted
   */
  async isFileEncrypted(blobId: string): Promise<boolean> {
    try {
      const metadata = await blobTrackingService.getBlobMetadata(blobId);
      return isEncrypted(metadata);
    } catch (error) {
      console.error('Failed to check encryption status:', error);
      return false;
    }
  }

  /**
   * Get storage service type for a file
   * @param blobId - Blob ID
   * @returns Service type ('seal' or 'walrus')
   */
  async getServiceType(blobId: string): Promise<'seal' | 'walrus'> {
    try {
      const metadata = await blobTrackingService.getBlobMetadata(blobId);
      return getServiceType(metadata);
    } catch (error) {
      console.error('Failed to get service type:', error);
      return 'walrus'; // Default to walrus for backward compatibility
    }
  }

  /**
   * Categorize content type
   * @param mimeType - MIME type
   * @returns Content type category
   */
  private categorizeContentType(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar')) return 'archive';
    return 'other';
  }
}

// Export singleton instance
export const unifiedStorageService = new UnifiedStorageService();

// Export for convenience
export { isEncrypted, getServiceType, validateMetadata, getFileTypeSummary } from './seal/fileTypeDetection';
