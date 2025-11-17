// Walrus Integration - Example usage with blob tracking
// Shows how to use the Walrus service with our tracking system

import { walrusService } from './walrus';
import { blobTrackingService } from './blobTracking';
import type { BlobMetadata } from '@/types/walrus';

/**
 * Example: Upload a file to Walrus and track it
 */
export async function uploadAndTrackFile(
  file: File,
  userAddress?: string
): Promise<{ blobId: string; walrusUrl: string; walrusScanUrl: string }> {
  try {
    // 1. Upload to Walrus
    const walrusBlob = await walrusService.uploadFile(file, userAddress);
    
    // 2. Create tracking metadata
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
      storageEpochs: 5,
      uploadEpoch: 0,
      expirationEpoch: 5,
      aggregatorUrl: walrusBlob.walrusUrl,
      walrusScanUrl: walrusService.getWalrusScanUrl(walrusBlob.blobId),
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      status: 'active',
      downloadCount: 0,
      reuseCount: 0
    };
    
    // 3. Track the blob
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
  } catch (error) {
    console.error('Failed to upload and track file:', error);
    throw error;
  }
}

/**
 * Example: Download a blob by ID
 */
export async function downloadBlobById(blobId: string): Promise<Blob> {
  try {
    // 1. Download from Walrus
    const blob = await walrusService.downloadBlob(blobId);
    
    // 2. Update download count in tracking
    const metadata = await blobTrackingService.getBlobMetadata(blobId);
    if (metadata) {
      await blobTrackingService.updateBlobMetadata(blobId, {
        downloadCount: metadata.downloadCount + 1,
        lastAccessed: new Date()
      });
    }
    
    console.log(`✅ Downloaded blob ${blobId}`);
    
    return blob;
  } catch (error) {
    console.error('Failed to download blob:', error);
    throw error;
  }
}

/**
 * Example: Verify a blob exists on Walrus
 */
export async function verifyBlobExists(blobId: string): Promise<boolean> {
  try {
    const exists = await walrusService.verifyBlob(blobId);
    
    // Update verification status in tracking
    const metadata = await blobTrackingService.getBlobMetadata(blobId);
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
  getAllTrackedBlobs
};
