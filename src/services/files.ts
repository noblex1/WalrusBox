// File Metadata Service - Queries Sui contract state via RPC

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

// Sui RPC client configuration
const SUI_NETWORK = import.meta.env.VITE_SUI_NETWORK || 'testnet';
const SUI_RPC_URL = import.meta.env.VITE_SUI_RPC_URL || getFullnodeUrl(SUI_NETWORK);
const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x0'; // Set after contract deployment
const REGISTRY_ID = import.meta.env.VITE_REGISTRY_ID || '0x0'; // Set after contract initialization

const suiClient = new SuiClient({ url: SUI_RPC_URL });

// FileMetadata interface matching Sui contract structure
export interface FileMetadata {
  id: string; // Sui object ID
  file_id: string; // Unique file identifier
  walrus_object_hash: Uint8Array; // Walrus storage hash
  owner: string; // Owner address
  visibility: 'public' | 'private'; // File visibility
  allowedWallets: string[]; // Allowed addresses for private files
  uploadedAt: Date; // Creation timestamp
  encryptionStatus?: 'pending' | 'encrypted' | 'failed'; // Frontend status
  folderId?: string | null; // Parent folder ID (for folder organization)
  fileName?: string; // Original file name
  fileSize?: number; // File size in bytes
  mimeType?: string; // MIME type
}

/**
 * Convert Sui object data to FileMetadata
 */
function parseFileObject(objectData: any): FileMetadata {
  console.log('🔍 Parsing file object:', objectData);
  
  // Handle different response structures
  const data = objectData.data || objectData;
  const fields = data.content?.fields || {};
  
  // Extract ID from various possible locations
  const id = data.objectId || data.id || objectData.objectId || objectData.id;
  
  if (!id) {
    console.error('❌ No ID found in object data:', objectData);
  }
  
  // Try to get timestamp from various sources
  let uploadedAt: Date;
  if (fields.created_at && Number(fields.created_at) > 0) {
    // Use on-chain timestamp if available
    uploadedAt = new Date(Number(fields.created_at));
  } else if (data.digest) {
    // Try to use object creation time from digest metadata
    // This is a fallback - the actual timestamp would need to be queried separately
    uploadedAt = new Date();
  } else {
    // Last resort: use current time
    uploadedAt = new Date();
  }
  
  const parsed = {
    id: id || '',
    file_id: fields.file_id || '',
    walrus_object_hash: fields.walrus_object_hash 
      ? new Uint8Array(Object.values(fields.walrus_object_hash)) 
      : new Uint8Array(),
    owner: fields.owner || '',
    visibility: fields.visibility === 1 ? 'public' : 'private',
    allowedWallets: fields.allowed_addresses 
      ? (Array.isArray(fields.allowed_addresses) 
          ? fields.allowed_addresses 
          : Object.values(fields.allowed_addresses))
      : [],
    uploadedAt,
    encryptionStatus: 'encrypted' as const, // Assumed encrypted if stored on-chain
  };
  
  console.log('✅ Parsed file:', parsed);
  return parsed;
}

export const filesService = {
  /**
   * Get all files owned by an address
   * @param ownerAddress - Sui address of the owner
   * @returns Array of FileMetadata
   */
  getAllFiles: async (ownerAddress?: string): Promise<FileMetadata[]> => {
    try {
      if (!ownerAddress) {
        return [];
      }

      console.log('🔍 Querying files for owner:', ownerAddress);
      console.log('📦 Package ID:', PACKAGE_ID);
      
      // Query owned objects of type FileObject
      const objects = await suiClient.getOwnedObjects({
        owner: ownerAddress,
        filter: {
          StructType: `${PACKAGE_ID}::walrusbox::FileObject`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      console.log('📋 Received objects from blockchain:', objects.data.length, objects.data);

      // Parse and return file metadata
      return objects.data
        .map(obj => {
          try {
            return parseFileObject(obj);
          } catch (error) {
            console.error('❌ Error parsing file object:', error, obj);
            return null;
          }
        })
        .filter((file): file is FileMetadata => file !== null);
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  },

  /**
   * Get a specific file by object ID
   * @param objectId - Sui object ID
   * @returns FileMetadata or null
   */
  getFile: async (objectId: string): Promise<FileMetadata | null> => {
    try {
      const object = await suiClient.getObject({
        id: objectId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!object.data) {
        return null;
      }

      return parseFileObject(object.data);
    } catch (error) {
      console.error('Error fetching file:', error);
      return null;
    }
  },

  /**
   * Get file by file_id from registry
   * @param fileId - File identifier
   * @returns FileMetadata or null
   */
  getFileById: async (fileId: string): Promise<FileMetadata | null> => {
    try {
      // Query registry to get object ID
      const registry = await suiClient.getObject({
        id: REGISTRY_ID,
        options: {
          showContent: true,
        },
      });

      if (!registry.data?.content) {
        return null;
      }

      const registryFields = (registry.data.content as any).fields;
      const filesTable = registryFields.files;

      // Look up file_id in the table
      // Note: This is a simplified lookup - in production, you may need to iterate
      // or use a more efficient indexing strategy
      const fileObjectId = filesTable?.fields?.contents?.find(
        (entry: any) => entry.fields?.key === fileId
      )?.fields?.value;

      if (!fileObjectId) {
        return null;
      }

      return await filesService.getFile(fileObjectId);
    } catch (error) {
      console.error('Error fetching file by ID:', error);
      return null;
    }
  },

  /**
   * Create a new file on-chain
   * This should be called after uploading to Walrus
   * @param signer - Transaction signer function (from wallet service)
   * @param fileId - Unique file identifier
   * @param walrusObjectHash - Walrus storage hash
   * @returns Transaction digest
   */
  createFile: async (
    signer: (tx: Transaction, options?: any) => Promise<string>,
    fileId: string,
    walrusObjectHash: Uint8Array,
    folderId: string = '',
    path: string = '/'
  ): Promise<string> => {
    try {
      const tx = new Transaction();

      // Convert strings to bytes
      const fileIdBytes = Array.from(new TextEncoder().encode(fileId));
      const hashBytes = Array.from(walrusObjectHash);
      const folderIdBytes = Array.from(new TextEncoder().encode(folderId));
      const pathBytes = Array.from(new TextEncoder().encode(path));

      // Call create_file with all 5 required arguments
      tx.moveCall({
        target: `${PACKAGE_ID}::walrusbox::create_file`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.pure(bcs.vector(bcs.u8()).serialize(fileIdBytes)),
          tx.pure(bcs.vector(bcs.u8()).serialize(hashBytes)),
          tx.pure(bcs.vector(bcs.u8()).serialize(folderIdBytes)),
          tx.pure(bcs.vector(bcs.u8()).serialize(pathBytes)),
        ],
      });

      // Execute transaction using provided signer
      const digest = await signer(tx, {
        showEffects: true,
        showEvents: true,
      });

      return digest;
    } catch (error) {
      console.error('Error creating file:', error);
      throw new Error('Failed to create file on-chain');
    }
  },

  /**
   * Update file visibility
   * @param signer - Transaction signer function
   * @param fileObjectId - File object ID
   * @param visibility - 'public' or 'private'
   */
  setVisibility: async (
    signer: (tx: Transaction, options?: any) => Promise<string>,
    fileObjectId: string,
    visibility: 'public' | 'private'
  ): Promise<string> => {
    try {
      const tx = new Transaction();
      const visibilityValue = visibility === 'public' ? 1 : 0;

      tx.moveCall({
        target: `${PACKAGE_ID}::walrusbox::set_visibility`,
        arguments: [
          tx.object(fileObjectId),
          tx.pure.u8(visibilityValue),  // Explicitly specify u8 type
        ],
      });

      return await signer(tx, {
        showEffects: true,
      });
    } catch (error) {
      console.error('Error setting visibility:', error);
      throw new Error('Failed to update file visibility');
    }
  },

  /**
   * Add allowed address to private file
   * @param signer - Transaction signer function
   * @param fileObjectId - File object ID
   * @param allowedAddress - Address to allow access
   */
  addAllowedAddress: async (
    signer: (tx: Transaction, options?: any) => Promise<string>,
    fileObjectId: string,
    allowedAddress: string
  ): Promise<string> => {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::walrusbox::add_allowed_address`,
        arguments: [
          tx.object(fileObjectId),
          tx.pure.address(allowedAddress),  // Explicitly specify address type
        ],
      });

      return await signer(tx, {
        showEffects: true,
      });
    } catch (error) {
      console.error('Error adding allowed address:', error);
      throw new Error('Failed to add allowed address');
    }
  },

  /**
   * Remove allowed address from private file
   * @param signer - Transaction signer function
   * @param fileObjectId - File object ID
   * @param allowedAddress - Address to remove
   */
  removeAllowedAddress: async (
    signer: (tx: Transaction, options?: any) => Promise<string>,
    fileObjectId: string,
    allowedAddress: string
  ): Promise<string> => {
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::walrusbox::remove_allowed_address`,
        arguments: [
          tx.object(fileObjectId),
          tx.pure.address(allowedAddress),  // Explicitly specify address type
        ],
      });

      return await signer(tx, {
        showEffects: true,
      });
    } catch (error) {
      console.error('Error removing allowed address:', error);
      throw new Error('Failed to remove allowed address');
    }
  },

  /**
   * Verify if an address has access to a file
   * @param fileObjectId - File object ID
   * @param requesterAddress - Address to check
   * @returns true if access is granted
   */
  verifyAccess: async (
    fileObjectId: string,
    requesterAddress: string
  ): Promise<boolean> => {
    try {
      const file = await filesService.getFile(fileObjectId);
      if (!file) {
        return false;
      }

      // Owner always has access
      if (file.owner === requesterAddress) {
        return true;
      }

      // Public files are accessible to everyone
      if (file.visibility === 'public') {
        return true;
      }

      // For private files, check allowed list
      if (file.visibility === 'private') {
        return file.allowedWallets.includes(requesterAddress);
      }

      return false;
    } catch (error) {
      console.error('Error verifying access:', error);
      return false;
    }
  },

  /**
   * Format file size for display
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Move file to a folder (updates local metadata)
   * @param fileId - File ID to move
   * @param folderId - Target folder ID (null for root)
   */
  moveFileToFolder: (fileId: string, folderId: string | null): void => {
    try {
      const metadata = localStorage.getItem(`file_folder_${fileId}`);
      const data = metadata ? JSON.parse(metadata) : {};
      data.folderId = folderId;
      localStorage.setItem(`file_folder_${fileId}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error moving file to folder:', error);
    }
  },

  /**
   * Get folder ID for a file
   * @param fileId - File ID
   * @returns Folder ID or null
   */
  getFileFolderId: (fileId: string): string | null => {
    try {
      const metadata = localStorage.getItem(`file_folder_${fileId}`);
      if (!metadata) return null;
      const data = JSON.parse(metadata);
      return data.folderId || null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get files in a specific folder
   * @param files - All files
   * @param folderId - Folder ID (null for root)
   * @returns Filtered files
   */
  getFilesInFolder: (files: FileMetadata[], folderId: string | null): FileMetadata[] => {
    return files.filter(file => {
      const fileFolderId = filesService.getFileFolderId(file.id);
      return fileFolderId === folderId;
    });
  },

  /**
   * Download an encrypted file with Seal
   * @param fileId - File identifier
   * @param options - Download options
   * @returns Downloaded and decrypted file as Blob
   */
  downloadEncryptedFile: async (
    fileId: string,
    options?: DownloadEncryptedFileOptions
  ): Promise<Blob> => {
    const startTime = Date.now();
    
    try {
      console.log(`🔽 Starting encrypted file download: ${fileId}`);
      
      // Import Seal services dynamically
      const { sealMetadataService } = await import('./seal/sealMetadata');
      const { sealStorageService } = await import('./seal/sealStorage');
      const { sealErrorHandler } = await import('./seal/sealErrorHandler');
      
      // Step 1: Retrieve Seal metadata
      options?.onProgress?.({
        stage: 'loading_metadata',
        percentage: 0,
        message: 'Loading file metadata...'
      });
      
      const metadata = await sealMetadataService.getSealMetadata(fileId);
      
      if (!metadata) {
        throw new Error(`Seal metadata not found for file: ${fileId}`);
      }
      
      console.log(`✅ Loaded Seal metadata for: ${metadata.fileName}`);
      
      // Step 2: Validate metadata
      options?.onProgress?.({
        stage: 'validating',
        percentage: 10,
        message: 'Validating file metadata...'
      });
      
      const isValid = sealMetadataService.validateSealMetadata(metadata);
      
      if (!isValid) {
        throw new Error(`Invalid Seal metadata for file: ${fileId}`);
      }
      
      console.log(`✅ Metadata validation passed`);
      
      // Step 3: Optional blob verification
      if (options?.verifyBeforeDownload !== false) {
        options?.onProgress?.({
          stage: 'verifying',
          percentage: 20,
          message: 'Verifying file availability...'
        });
        
        const verificationResult = await sealMetadataService.verifyBlobsExist(metadata);
        
        if (!verificationResult.allBlobsExist) {
          const missingBlobIds = verificationResult.missingBlobs.join(', ');
          console.error(`❌ Missing blobs for file ${fileId}:`, verificationResult.missingBlobs);
          
          throw new Error(
            `File is not available on storage network. Missing blobs: ${missingBlobIds}`
          );
        }
        
        console.log(`✅ All blobs verified (${verificationResult.verifiedBlobs.length} blobs)`);
      }
      
      // Step 4: Download and decrypt file
      options?.onProgress?.({
        stage: 'downloading',
        percentage: 30,
        message: 'Downloading file...'
      });
      
      // Get encryption key from options or localStorage
      let encryptionKey = options?.encryptionKey;
      
      if (!encryptionKey && metadata.encryptionKeyId) {
        // Try to retrieve key from localStorage
        const storedKey = localStorage.getItem(`seal_key_${metadata.encryptionKeyId}`);
        if (storedKey) {
          encryptionKey = storedKey;
        }
      }
      
      if (!encryptionKey) {
        throw new Error('Encryption key not found. Cannot decrypt file.');
      }
      
      // Create download options with progress tracking
      const downloadOptions = {
        decrypt: true,
        encryptionKey,
        verifyIntegrity: options?.verifyIntegrity !== false,
        onProgress: (progress: any) => {
          // Map download progress to our progress callback
          let percentage = 30;
          let message = 'Downloading file...';
          
          switch (progress.stage) {
            case 'downloading':
              percentage = 30 + Math.floor(progress.percentage * 0.4); // 30-70%
              message = `Downloading chunk ${progress.currentChunk || 0}/${progress.totalChunks || 1}...`;
              break;
            case 'reassembling':
              percentage = 70;
              message = 'Reassembling file...';
              break;
            case 'decrypting':
              percentage = 85;
              message = 'Decrypting file...';
              break;
            case 'complete':
              percentage = 100;
              message = 'Download complete';
              break;
            case 'error':
              percentage = 0;
              message = progress.error || 'Download failed';
              break;
          }
          
          options?.onProgress?.({
            stage: progress.stage,
            percentage,
            message,
            currentChunk: progress.currentChunk,
            totalChunks: progress.totalChunks,
            bytesDownloaded: progress.bytesDownloaded,
            totalBytes: progress.totalBytes
          });
        }
      };
      
      // Set timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      let downloadPromise: Promise<Blob>;
      
      if (options?.timeout && options.timeout > 0) {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Download timeout after ${options.timeout}ms`));
          }, options.timeout);
        });
        
        // Race between download and timeout
        downloadPromise = Promise.race([
          sealStorageService.downloadFile(metadata, downloadOptions),
          timeoutPromise
        ]);
      } else {
        downloadPromise = sealStorageService.downloadFile(metadata, downloadOptions);
      }
      
      const blob = await downloadPromise;
      
      // Clear timeout if it was set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Step 5: Complete
      options?.onProgress?.({
        stage: 'complete',
        percentage: 100,
        message: 'Download complete'
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Encrypted file download complete in ${duration}ms:`, {
        fileId,
        fileName: metadata.fileName,
        size: blob.size
      });
      
      return blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to download encrypted file ${fileId}:`, errorMessage);
      
      // Report error through progress callback
      options?.onProgress?.({
        stage: 'error',
        percentage: 0,
        message: errorMessage,
        error: errorMessage
      });
      
      // Re-throw with more context
      throw new Error(`Failed to download encrypted file: ${errorMessage}`);
    }
  },

  /**
   * Verify file availability before download
   * @param fileId - File identifier
   * @returns Availability result with details
   */
  verifyFileAvailability: async (
    fileId: string
  ): Promise<FileAvailabilityResult> => {
    try {
      console.log(`🔍 Verifying file availability: ${fileId}`);
      
      // Import Seal services dynamically
      const { sealMetadataService } = await import('./seal/sealMetadata');
      
      // Load metadata
      const metadata = await sealMetadataService.getSealMetadata(fileId);
      
      if (!metadata) {
        return {
          available: false,
          reason: 'Metadata not found',
          canRecover: false
        };
      }
      
      // Validate metadata
      const isValid = sealMetadataService.validateSealMetadata(metadata);
      
      if (!isValid) {
        return {
          available: false,
          reason: 'Metadata is corrupted or incomplete',
          canRecover: false
        };
      }
      
      // Verify blobs exist
      const verificationResult = await sealMetadataService.verifyBlobsExist(metadata);
      
      if (!verificationResult.allBlobsExist) {
        return {
          available: false,
          reason: `Missing ${verificationResult.missingBlobs.length} blob(s) on storage network`,
          missingBlobs: verificationResult.missingBlobs,
          canRecover: false
        };
      }
      
      console.log(`✅ File is available: ${fileId}`);
      
      return {
        available: true,
        canRecover: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to verify file availability for ${fileId}:`, errorMessage);
      
      return {
        available: false,
        reason: errorMessage,
        canRecover: true // Network errors are potentially recoverable
      };
    }
  },
};

/**
 * Download options for encrypted files
 */
export interface DownloadEncryptedFileOptions {
  /** Whether to verify blob existence before download (default: true) */
  verifyBeforeDownload?: boolean;
  
  /** Encryption key for decryption (if not provided, will try to load from localStorage) */
  encryptionKey?: string;
  
  /** Progress callback */
  onProgress?: (progress: DownloadProgress) => void;
  
  /** Timeout in milliseconds (0 or undefined = no timeout) */
  timeout?: number;
  
  /** Whether to verify file integrity after download (default: true) */
  verifyIntegrity?: boolean;
}

/**
 * Download progress information
 */
export interface DownloadProgress {
  /** Current stage of download */
  stage: 'loading_metadata' | 'validating' | 'verifying' | 'downloading' | 'reassembling' | 'decrypting' | 'complete' | 'error';
  
  /** Progress percentage (0-100) */
  percentage: number;
  
  /** Human-readable message */
  message: string;
  
  /** Current chunk being downloaded (for multi-chunk files) */
  currentChunk?: number;
  
  /** Total number of chunks */
  totalChunks?: number;
  
  /** Bytes downloaded so far */
  bytesDownloaded?: number;
  
  /** Total bytes to download */
  totalBytes?: number;
  
  /** Error message if stage is 'error' */
  error?: string;
}

/**
 * File availability result
 */
export interface FileAvailabilityResult {
  /** Whether the file is available for download */
  available: boolean;
  
  /** Reason if not available */
  reason?: string;
  
  /** List of missing blob IDs */
  missingBlobs?: string[];
  
  /** Whether the issue can potentially be recovered */
  canRecover?: boolean;
}
