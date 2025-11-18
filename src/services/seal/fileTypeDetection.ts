// File Type Detection Utility
// Provides helper functions to detect encryption status and route to appropriate services

import type { BlobMetadata, SealFileMetadata } from '@/types/walrus';

/**
 * Type guard to check if metadata represents an encrypted file
 * @param metadata - Blob metadata to check
 * @returns True if metadata is for an encrypted file
 */
export function isEncrypted(metadata: BlobMetadata | SealFileMetadata | null | undefined): metadata is SealFileMetadata {
  if (!metadata) {
    return false;
  }

  // Check if metadata has Seal-specific fields
  return (
    'isEncrypted' in metadata && 
    (metadata as SealFileMetadata).isEncrypted === true
  );
}

/**
 * Check if a file is encrypted based on blob ID lookup
 * @param blobId - Blob ID to check
 * @param metadataLookup - Function to lookup metadata by blob ID
 * @returns True if file is encrypted
 */
export async function isEncryptedByBlobId(
  blobId: string,
  metadataLookup: (blobId: string) => Promise<BlobMetadata | SealFileMetadata | null>
): Promise<boolean> {
  try {
    const metadata = await metadataLookup(blobId);
    return isEncrypted(metadata);
  } catch (error) {
    console.error('Failed to check encryption status:', error);
    return false;
  }
}

/**
 * Detect encryption from file metadata properties
 * Checks for presence of Seal-specific fields without requiring full type
 * @param metadata - Metadata object to check
 * @returns True if metadata indicates encryption
 */
export function detectEncryptionFromMetadata(metadata: Record<string, unknown>): boolean {
  // Check for Seal-specific fields that indicate encryption
  const hasEncryptionFlag = 'isEncrypted' in metadata && metadata.isEncrypted === true;
  const hasEncryptionAlgorithm = 'encryptionAlgorithm' in metadata && !!metadata.encryptionAlgorithm;
  const hasInitializationVector = 'initializationVector' in metadata && !!metadata.initializationVector;
  const hasSealVersion = 'sealVersion' in metadata && !!metadata.sealVersion;
  const hasChunks = 'chunks' in metadata && Array.isArray(metadata.chunks);
  
  // File is encrypted if it has the encryption flag or multiple Seal-specific fields
  return hasEncryptionFlag || (hasEncryptionAlgorithm && hasInitializationVector) || hasSealVersion;
}

/**
 * Determine storage mode based on metadata
 * @param metadata - Blob metadata
 * @returns Storage mode ('encrypted' or 'unencrypted')
 */
export function getStorageMode(metadata: BlobMetadata | SealFileMetadata | null | undefined): 'encrypted' | 'unencrypted' {
  return isEncrypted(metadata) ? 'encrypted' : 'unencrypted';
}

/**
 * Check if metadata is valid for encrypted operations
 * @param metadata - Metadata to validate
 * @returns True if metadata is valid for encrypted operations
 */
export function isValidEncryptedMetadata(metadata: BlobMetadata | SealFileMetadata): boolean {
  if (!isEncrypted(metadata)) {
    return false;
  }

  const sealMetadata = metadata as SealFileMetadata;

  // Check required fields for encrypted files
  const hasRequiredFields = !!(
    sealMetadata.isEncrypted &&
    sealMetadata.encryptionAlgorithm &&
    sealMetadata.initializationVector &&
    sealMetadata.contentHash
  );

  // Check chunk metadata if file is chunked
  if (sealMetadata.isChunked) {
    const hasValidChunks = !!(
      sealMetadata.chunks &&
      sealMetadata.chunks.length > 0 &&
      sealMetadata.chunkCount === sealMetadata.chunks.length
    );

    return hasRequiredFields && hasValidChunks;
  }

  return hasRequiredFields;
}

/**
 * Check if metadata is valid for unencrypted operations
 * @param metadata - Metadata to validate
 * @returns True if metadata is valid for unencrypted operations
 */
export function isValidUnencryptedMetadata(metadata: BlobMetadata | SealFileMetadata): boolean {
  if (isEncrypted(metadata)) {
    return false;
  }

  // Check required fields for unencrypted files
  return !!(
    metadata.blobId &&
    metadata.fileName &&
    metadata.aggregatorUrl
  );
}

/**
 * Get service type based on encryption status
 * @param metadata - Blob metadata
 * @returns Service type to use ('seal' or 'walrus')
 */
export function getServiceType(metadata: BlobMetadata | SealFileMetadata | null | undefined): 'seal' | 'walrus' {
  return isEncrypted(metadata) ? 'seal' : 'walrus';
}

/**
 * Check if a file requires encryption key for access
 * @param metadata - Blob metadata
 * @returns True if encryption key is required
 */
export function requiresEncryptionKey(metadata: BlobMetadata | SealFileMetadata | null | undefined): boolean {
  return isEncrypted(metadata);
}

/**
 * Extract encryption information from metadata
 * @param metadata - Blob metadata
 * @returns Encryption information or null if not encrypted
 */
export function getEncryptionInfo(metadata: BlobMetadata | SealFileMetadata | null | undefined): {
  algorithm: string;
  keyId?: string;
  iv: string;
  sealVersion: string;
} | null {
  if (!isEncrypted(metadata)) {
    return null;
  }

  const sealMetadata = metadata as SealFileMetadata;

  return {
    algorithm: sealMetadata.encryptionAlgorithm || 'AES-GCM',
    keyId: sealMetadata.encryptionKeyId,
    iv: sealMetadata.initializationVector || '',
    sealVersion: sealMetadata.sealVersion || '1.0.0'
  };
}

/**
 * Check if file can be migrated to encrypted storage
 * @param metadata - Blob metadata
 * @returns True if file can be migrated
 */
export function canMigrateToEncrypted(metadata: BlobMetadata | SealFileMetadata | null | undefined): boolean {
  if (!metadata) {
    return false;
  }

  // Can only migrate unencrypted files
  if (isEncrypted(metadata)) {
    return false;
  }

  // Check if file is still accessible
  return metadata.status === 'active' && !!metadata.blobId;
}

/**
 * Get file type summary for display
 * @param metadata - Blob metadata
 * @returns Human-readable file type summary
 */
export function getFileTypeSummary(metadata: BlobMetadata | SealFileMetadata | null | undefined): string {
  if (!metadata) {
    return 'Unknown';
  }

  const encrypted = isEncrypted(metadata);
  const chunked = 'isChunked' in metadata && (metadata as SealFileMetadata).isChunked;

  if (encrypted && chunked) {
    const chunkCount = (metadata as SealFileMetadata).chunkCount || 0;
    return `Encrypted (${chunkCount} chunks)`;
  }

  if (encrypted) {
    return 'Encrypted';
  }

  return 'Unencrypted';
}

/**
 * Validate metadata before operations
 * @param metadata - Metadata to validate
 * @param operation - Operation type ('upload', 'download', 'verify', 'delete')
 * @returns Validation result with error message if invalid
 */
export function validateMetadata(
  metadata: BlobMetadata | SealFileMetadata | null | undefined,
  operation: 'upload' | 'download' | 'verify' | 'delete'
): { valid: boolean; error?: string } {
  if (!metadata) {
    return { valid: false, error: 'Metadata is null or undefined' };
  }

  // Common validations
  if (!metadata.blobId) {
    return { valid: false, error: 'Missing blob ID' };
  }

  if (!metadata.fileName) {
    return { valid: false, error: 'Missing file name' };
  }

  // Operation-specific validations
  if (operation === 'download') {
    if (isEncrypted(metadata)) {
      if (!isValidEncryptedMetadata(metadata)) {
        return { valid: false, error: 'Invalid encrypted metadata - missing required fields' };
      }
    } else {
      if (!isValidUnencryptedMetadata(metadata)) {
        return { valid: false, error: 'Invalid unencrypted metadata - missing required fields' };
      }
    }
  }

  if (operation === 'verify') {
    if (!metadata.aggregatorUrl) {
      return { valid: false, error: 'Missing aggregator URL' };
    }
  }

  return { valid: true };
}

// Export all functions as a namespace for convenience
export const fileTypeDetection = {
  isEncrypted,
  isEncryptedByBlobId,
  detectEncryptionFromMetadata,
  getStorageMode,
  isValidEncryptedMetadata,
  isValidUnencryptedMetadata,
  getServiceType,
  requiresEncryptionKey,
  getEncryptionInfo,
  canMigrateToEncrypted,
  getFileTypeSummary,
  validateMetadata
};
