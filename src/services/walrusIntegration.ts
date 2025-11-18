// Walrus Integration - Example usage with blob tracking
// Shows how to use the Walrus service with our tracking system

import { walrusService } from './walrus';
import { blobTrackingService } from './blobTracking';
import { sealStorageService } from './seal/sealStorage';
import { isEncrypted } from './seal/fileTypeDetection';
import type { BlobMetadata, SealFileMetadata } from '@/types/walrus';

/**
 * Example: Upload a file to Walrus and track it
 * Supports both encrypted (Seal) and unencrypted (standard Walrus) uploads
 */
export async function uploadAndTrackFile(
  file: File,
  userAddress?: string,
  options?: { useEncryption?: boolean; epochs?: number; onProgress?: (progress: any) => void }
): Promise<{ blobId: string; walrusUrl: string; walrusScanUrl: string; encryptionKey?: string }> {
  try {
    const useEncryption = options?.useEncryption ?? false;
    const epochs = options?.epochs ?? 5;

    if (useEncryption) {
      // Route to Seal service for encrypted upload
      console.log('🔐 Uploading with encryption enabled...');
      
      const sealResult = await sealStorageService.uploadFile(file, {
        encrypt: true,
        userAddress,
        epochs,
        onProgress: options?.onProgress,
        encryptionOptions: {
          algorithm: 'AES-GCM',
          keySize: 256,
          generateKey: true
        }
      });

      // Track the encrypted blob with extended metadata
      await blobTrackingService.trackBlob(sealResult.metadata);

      console.log('✅ Encrypted file uploaded and tracked successfully!');
      console.log(`📦 Primary Blob ID: ${sealResult.blobIds[0]}`);
      console.log(`🔐 Encrypted with ${sealResult.metadata.chunkCount} chunk(s)`);
      console.log(`🔗 Walrus URL: ${sealResult.metadata.aggregatorUrl}`);
      console.log(`🔍 Walrus Scan: ${sealResult.metadata.walrusScanUrl}`);

      return {
        blobId: sealResult.blobIds[0],
        walrusUrl: sealResult.metadata.aggregatorUrl,
        walrusScanUrl: sealResult.metadata.walrusScanUrl,
        encryptionKey: sealResult.encryptionKey
      };
    } else {
      // Route to standard Walrus service for unencrypted upload
      console.log('🐋 Uploading without encryption...');
      
      const walrusBlob = await walrusService.uploadFile(file, userAddress, epochs);
      
      // Create tracking metadata
      const metadata: BlobMetadata = {
        blobId: walrusBlob.blobId,
        fileId: '', // Will be set after Sui FileObject creation
        objectId: '', // Will be set after Sui FileObject creation
        fileName: file.name,
        originalSize: file.size,
        encryptedSize: file.size, // If not encrypted, same as original
        encodedSize: file.size, // Will be updated from Walrus response
        mimeType: file.type,
        contentType: categorizeContentType(file.type),
        walrusResponse: walrusBlob.walrusResponse || {} as any,
        storageCost: 0, // Will be extracted from response
        storageEpochs: epochs,
        uploadEpoch: 0,
        expirationEpoch: epochs,
        aggregatorUrl: walrusBlob.walrusUrl,
        walrusScanUrl: walrusService.getWalrusScanUrl(walrusBlob.blobId),
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + epochs * 24 * 60 * 60 * 1000),
        status: 'active',
        downloadCount: 0,
        reuseCount: 0
      };
      
      // Track the blob
      await blobTrackingService.trackBlob(metadata);
      
      console.log('✅ File uploaded and tracked successfully!');
      console.log(`📦 Blob ID: ${walrusBlob.blobId}`);
      console.log(`🔗 Walrus URL: ${walrusBlob.walrusUrl}`);
      console.log(`🔍 Walrus Scan: ${metadata.walrusScanUrl}`);
      
      return {
        blobId: walrusBlob.blobId,
        walrusUrl: walrusBlob.walrusUrl,
        walrusScanUrl: metadata.walrusScanUrl
      };
    }
  } catch (error) {
    console.error('Failed to upload and track file:', error);
    throw error;
  }
}

/**
 * Example: Download a blob by ID
 * Automatically detects and handles encrypted files
 */
export async function downloadBlobById(
  blobId: string,
  options?: { encryptionKey?: string; onProgress?: (progress: any) => void }
): Promise<Blob> {
  try {
    // 1. Get metadata to check if encrypted
    const metadata = await blobTrackingService.getBlobMetadata(blobId);
    
    if (metadata && isEncrypted(metadata)) {
      // Download encrypted file using Seal
      console.log('🔐 Downloading encrypted file...');
      
      if (!options?.encryptionKey) {
        throw new Error('Encryption key required to download encrypted file');
      }

      const blob = await sealStorageService.downloadFile(
        metadata as SealFileMetadata,
        {
          decrypt: true,
          encryptionKey: options.encryptionKey,
          onProgress: options?.onProgress,
          verifyIntegrity: true
        }
      );

      // Update download count
      await blobTrackingService.updateBlobMetadata(blobId, {
        downloadCount: metadata.downloadCount + 1,
        lastAccessed: new Date()
      });

      console.log(`✅ Downloaded and decrypted blob ${blobId}`);
      
      return blob;
    } else {
      // Download unencrypted file using standard Walrus
      console.log('🐋 Downloading unencrypted file...');
      
      const blob = await walrusService.downloadBlob(blobId);
      
      // Update download count in tracking
      if (metadata) {
        await blobTrackingService.updateBlobMetadata(blobId, {
          downloadCount: metadata.downloadCount + 1,
          lastAccessed: new Date()
        });
      }
      
      console.log(`✅ Downloaded blob ${blobId}`);
      
      return blob;
    }
  } catch (error) {
    console.error('Failed to download blob:', error);
    throw error;
  }
}

/**
 * Example: Verify a blob exists on Walrus
 * Handles both encrypted and unencrypted files
 */
export async function verifyBlobExists(blobId: string): Promise<boolean> {
  try {
    // Get metadata to check if encrypted
    const metadata = await blobTrackingService.getBlobMetadata(blobId);
    
    let exists = false;
    
    if (metadata && isEncrypted(metadata)) {
      // Verify encrypted file using Seal
      const verificationResult = await sealStorageService.verifyFile(metadata as SealFileMetadata);
      exists = verificationResult.success;
    } else {
      // Verify unencrypted file using standard Walrus
      exists = await walrusService.verifyBlob(blobId);
    }
    
    // Update verification status in tracking
    if (metadata) {
      await blobTrackingService.updateBlobMetadata(blobId, {
        verificationStatus: exists ? 'verified' : 'failed',
        lastVerified: new Date()
      });
    }
    
    return exists;
  } catch (error) {
    console.error('Failed to verify blob:', error);
    return false;
  }
}

/**
 * Example: Get all tracked blobs with their Walrus URLs
 */
export async function getAllTrackedBlobs(): Promise<Array<{
  blobId: string;
  fileName: string;
  walrusUrl: string;
  walrusScanUrl: string;
  uploadedAt: Date;
  status: string;
}>> {
  try {
    const blobs = await blobTrackingService.getAllBlobs();
    
    return blobs.map(blob => ({
      blobId: blob.blobId,
      fileName: blob.fileName,
      walrusUrl: blob.aggregatorUrl,
      walrusScanUrl: blob.walrusScanUrl,
      uploadedAt: blob.uploadedAt,
      status: blob.status
    }));
  } catch (error) {
    console.error('Failed to get tracked blobs:', error);
    return [];
  }
}

/**
 * Migrate an unencrypted file to encrypted storage
 * Downloads the original file, re-uploads with encryption, and updates metadata
 */
export async function migrateToEncrypted(
  blobId: string,
  userAddress?: string,
  options?: { epochs?: number; onProgress?: (progress: any) => void }
): Promise<{ 
  newBlobId: string; 
  encryptionKey: string; 
  oldBlobId: string;
  metadata: SealFileMetadata;
}> {
  try {
    console.log(`🔄 Starting migration of blob ${blobId} to encrypted storage...`);

    // 1. Get existing metadata
    const existingMetadata = await blobTrackingService.getBlobMetadata(blobId);
    if (!existingMetadata) {
      throw new Error(`Blob ${blobId} not found in tracking database`);
    }

    // Check if already encrypted
    if (isEncrypted(existingMetadata)) {
      throw new Error(`Blob ${blobId} is already encrypted`);
    }

    // 2. Download the unencrypted file
    console.log('📥 Downloading original unencrypted file...');
    const originalBlob = await walrusService.downloadBlob(blobId);
    
    // Convert blob to File to preserve metadata
    const file = new File([originalBlob], existingMetadata.fileName, {
      type: existingMetadata.mimeType
    });

    // 3. Re-upload with encryption enabled
    console.log('🔐 Re-uploading with encryption...');
    const uploadResult = await sealStorageService.uploadFile(file, {
      encrypt: true,
      userAddress,
      epochs: options?.epochs ?? existingMetadata.storageEpochs,
      onProgress: options?.onProgress,
      encryptionOptions: {
        algorithm: 'AES-GCM',
        keySize: 256,
        generateKey: true
      }
    });

    // 4. Preserve file history and update metadata
    const migratedMetadata: SealFileMetadata = {
      ...uploadResult.metadata,
      // Preserve original metadata
      fileId: existingMetadata.fileId,
      downloadCount: existingMetadata.downloadCount,
      lastAccessed: existingMetadata.lastAccessed,
      reuseCount: existingMetadata.reuseCount,
      imageMetadata: existingMetadata.imageMetadata,
      videoMetadata: existingMetadata.videoMetadata,
      audioMetadata: existingMetadata.audioMetadata,
      // Add migration tracking
      contentHash: uploadResult.metadata.contentHash
    };

    // 5. Update tracking database with new encrypted metadata
    // Remove old unencrypted blob tracking
    await blobTrackingService.deleteBlobMetadata(blobId);
    
    // Add new encrypted blob tracking
    await blobTrackingService.trackBlob(migratedMetadata);

    console.log('✅ Migration complete!');
    console.log(`📦 Old Blob ID: ${blobId}`);
    console.log(`📦 New Blob ID: ${uploadResult.blobIds[0]}`);
    console.log(`🔐 Encrypted with ${uploadResult.metadata.chunkCount} chunk(s)`);
    console.log(`🔑 Encryption key generated (store securely!)`);

    return {
      newBlobId: uploadResult.blobIds[0],
      encryptionKey: uploadResult.encryptionKey!,
      oldBlobId: blobId,
      metadata: migratedMetadata
    };
  } catch (error) {
    console.error('Failed to migrate blob to encrypted storage:', error);
    throw error;
  }
}



/**
 * Helper: Categorize content type
 */
function categorizeContentType(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive';
  return 'other';
}

// Export all functions
export const walrusIntegration = {
  uploadAndTrackFile,
  downloadBlobById,
  verifyBlobExists,
  getAllTrackedBlobs,
  migrateToEncrypted,
  isEncrypted // Re-export for convenience
};
