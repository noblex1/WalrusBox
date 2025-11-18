// Seal Storage Service
// Orchestrates encryption, chunking, and upload/download operations with Walrus

import axios from 'axios';
import { sealClient } from './sealClient';
import { sealEncryptionService } from './sealEncryption';
import { sealChunkingService } from './sealChunking';
import { getSealConfig } from './sealConfig';
import type {
  SealUploadOptions,
  SealUploadResult,
  SealDownloadOptions,
  SealFileMetadata,
  FileVerificationResult,
  ChunkMetadata,
  SealErrorType,
  RetryConfig
} from './sealTypes';
import { SealError as SealErrorClass } from './sealTypes';
import { sealErrorLogger } from './sealErrorLogger';

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

/**
 * Seal Storage Service
 * Provides encrypted file storage on Walrus with chunking support
 */
export class SealStorageService {
  private config = getSealConfig();

  /**
   * Upload a file with encryption and chunking
   * @param file - File to upload
   * @param options - Upload options
   * @returns Upload result with blob IDs and metadata
   */
  async uploadFile(
    file: File,
    options: SealUploadOptions
  ): Promise<SealUploadResult> {
    const startTime = Date.now();
    
    try {
      // Validate file size
      if (file.size > this.config.maxFileSize) {
        throw new SealErrorClass(
          'UPLOAD_ERROR' as SealErrorType,
          `File size ${file.size} exceeds maximum ${this.config.maxFileSize}`,
          undefined,
          false,
          { fileSize: file.size, maxSize: this.config.maxFileSize }
        );
      }

      // Initialize Seal client if not already done
      if (!sealClient.isInitialized()) {
        await sealClient.initialize();
      }

      // Step 1: Encryption
      options.onProgress?.({
        stage: 'encrypting',
        bytesUploaded: 0,
        totalBytes: file.size,
        percentage: 0
      });

      const encryptionResult = await sealEncryptionService.encryptFile(
        file,
        options.encryptionOptions
      );

      // Export key for storage
      const exportedKey = await sealEncryptionService.exportKey(encryptionResult.key);

      // Step 2: Chunking
      options.onProgress?.({
        stage: 'chunking',
        bytesUploaded: 0,
        totalBytes: encryptionResult.encryptedData.length,
        percentage: 10
      });

      const chunks = await sealChunkingService.chunkFile(
        encryptionResult.encryptedData,
        options.chunkingOptions
      );

      const chunkMetadata = await sealChunkingService.generateChunkMetadata(chunks, true);

      // Step 3: Upload chunks
      options.onProgress?.({
        stage: 'uploading',
        currentChunk: 0,
        totalChunks: chunks.length,
        bytesUploaded: 0,
        totalBytes: encryptionResult.encryptedData.length,
        percentage: 20
      });

      const uploadResults = await this.uploadChunks(
        chunks,
        chunkMetadata,
        options
      );

      // Calculate content hash for integrity verification
      const contentHash = await this.generateContentHash(encryptionResult.encryptedData);

      // Create metadata
      const metadata: SealFileMetadata = {
        // Core identifiers
        blobId: uploadResults.blobIds[0], // Primary blob ID
        fileId: crypto.randomUUID(),
        objectId: uploadResults.objectIds[0],
        
        // File information
        fileName: file.name,
        originalSize: file.size,
        encryptedSize: encryptionResult.encryptedData.length,
        encodedSize: encryptionResult.encryptedData.length,
        mimeType: file.type || 'application/octet-stream',
        contentType: this.categorizeContentType(file.type),
        
        // Walrus specific
        walrusResponse: {} as any, // Will be populated by caller
        storageCost: 0,
        storageEpochs: options.epochs || 5,
        uploadEpoch: 0,
        expirationEpoch: 0,
        transactionDigest: uploadResults.transactionDigests[0],
        
        // URLs
        aggregatorUrl: `${this.config.aggregatorUrl}/v1/${uploadResults.blobIds[0]}`,
        walrusScanUrl: `https://walrus-testnet-explorer.walrus.space/blob/${uploadResults.blobIds[0]}`,
        
        // Timestamps
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + (options.epochs || 5) * 24 * 60 * 60 * 1000),
        
        // Status
        status: 'active',
        
        // Usage tracking
        downloadCount: 0,
        reuseCount: 0,
        
        // Encryption fields
        isEncrypted: true,
        encryptionAlgorithm: encryptionResult.metadata.algorithm,
        encryptionKeyId: crypto.randomUUID(),
        initializationVector: encryptionResult.metadata.iv,
        
        // Chunking fields
        isChunked: chunks.length > 1,
        chunkCount: chunks.length,
        chunkSize: options.chunkingOptions?.chunkSize || this.config.chunkSize,
        chunks: chunkMetadata.map((chunk, index) => ({
          ...chunk,
          blobId: uploadResults.blobIds[index],
          objectId: uploadResults.objectIds[index]
        })),
        
        // Seal-specific fields
        sealVersion: '1.0.0',
        contentHash,
        
        // Sui blockchain fields
        objectIds: uploadResults.objectIds,
        transactionDigests: uploadResults.transactionDigests
      };

      options.onProgress?.({
        stage: 'complete',
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        bytesUploaded: encryptionResult.encryptedData.length,
        totalBytes: encryptionResult.encryptedData.length,
        percentage: 100
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Seal upload complete in ${duration}ms:`, {
        fileName: file.name,
        chunks: chunks.length,
        encrypted: true
      });

      return {
        blobIds: uploadResults.blobIds,
        objectIds: uploadResults.objectIds,
        encryptionKey: exportedKey,
        metadata,
        transactionDigests: uploadResults.transactionDigests
      };
    } catch (error) {
      // Log error
      sealErrorLogger.logError(error, 'uploadFile', { fileName: file.name, fileSize: file.size });

      options.onProgress?.({
        stage: 'error',
        bytesUploaded: 0,
        totalBytes: file.size,
        percentage: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof SealErrorClass) {
        throw error;
      }

      throw new SealErrorClass(
        'UPLOAD_ERROR' as SealErrorType,
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        true,
        { fileName: file.name, fileSize: file.size }
      );
    }
  }

  /**
   * Upload chunks to Walrus with retry logic
   * @param chunks - Array of chunks to upload
   * @param metadata - Chunk metadata
   * @param options - Upload options
   * @returns Upload results with blob IDs and object IDs
   */
  private async uploadChunks(
    chunks: Uint8Array[],
    metadata: ChunkMetadata[],
    options: SealUploadOptions
  ): Promise<{
    blobIds: string[];
    objectIds: string[];
    transactionDigests: string[];
  }> {
    const blobIds: string[] = [];
    const objectIds: string[] = [];
    const transactionDigests: string[] = [];
    let bytesUploaded = 0;
    const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Upload chunk with retry logic
      const result = await this.uploadChunkWithRetry(
        chunk,
        i,
        options.userAddress,
        options.epochs || 5
      );

      blobIds.push(result.blobId);
      objectIds.push(result.objectId);
      transactionDigests.push(result.transactionDigest);

      bytesUploaded += chunk.length;

      // Report progress
      options.onProgress?.({
        stage: 'uploading',
        currentChunk: i + 1,
        totalChunks: chunks.length,
        bytesUploaded,
        totalBytes,
        percentage: 20 + Math.floor((bytesUploaded / totalBytes) * 70)
      });
    }

    return { blobIds, objectIds, transactionDigests };
  }

  /**
   * Upload a single chunk with retry logic
   * @param chunk - Chunk data
   * @param index - Chunk index
   * @param userAddress - User's Sui address
   * @param epochs - Storage epochs
   * @returns Upload result
   */
  private async uploadChunkWithRetry(
    chunk: Uint8Array,
    index: number,
    userAddress?: string,
    epochs: number = 5
  ): Promise<{
    blobId: string;
    objectId: string;
    transactionDigest: string;
  }> {
    return this.withRetry(
      async () => {
        // Construct upload URL
        let uploadUrl = `${this.config.publisherUrl}/v1/blobs?epochs=${epochs}`;
        if (userAddress) {
          uploadUrl += `&send_object_to=${userAddress}`;
        }

        console.log(`📤 Uploading chunk ${index + 1}...`);

        const response = await axios.put(
          uploadUrl,
          chunk,
          {
            headers: {
              'Content-Type': 'application/octet-stream',
            },
            timeout: 60000, // 60 seconds
          }
        );

        // Extract blob ID and object ID from response
        const blobId = response.data.newlyCreated?.blobObject.blobId || 
                       response.data.alreadyCertified?.blobId;
        
        const objectId = response.data.newlyCreated?.blobObject.id || '';
        const transactionDigest = response.data.alreadyCertified?.event?.txDigest || '';

        if (!blobId) {
          throw new Error('Failed to get blob ID from Walrus response');
        }

        console.log(`✅ Chunk ${index + 1} uploaded: ${blobId}`);

        return { blobId, objectId, transactionDigest };
      },
      DEFAULT_RETRY_CONFIG,
      `chunk ${index + 1}`
    );
  }


  /**
   * Download and decrypt a file from Walrus
   * @param metadata - File metadata with chunk information
   * @param options - Download options
   * @returns Decrypted file as Blob
   */
  async downloadFile(
    metadata: SealFileMetadata,
    options: SealDownloadOptions
  ): Promise<Blob> {
    const startTime = Date.now();
    
    try {
      // Initialize Seal client if not already done
      if (!sealClient.isInitialized()) {
        await sealClient.initialize();
      }

      // Step 1: Download chunks
      options.onProgress?.({
        stage: 'downloading',
        currentChunk: 0,
        totalChunks: metadata.chunkCount || 1,
        bytesDownloaded: 0,
        totalBytes: metadata.encryptedSize,
        percentage: 0
      });

      const chunks = await this.downloadChunks(metadata, options);

      // Step 2: Reassemble chunks
      options.onProgress?.({
        stage: 'reassembling',
        bytesDownloaded: metadata.encryptedSize,
        totalBytes: metadata.encryptedSize,
        percentage: 70
      });

      const reassembledData = await sealChunkingService.reassembleChunks(chunks);

      // Step 3: Verify integrity if requested
      if (options.verifyIntegrity !== false && metadata.contentHash) {
        const actualHash = await this.generateContentHash(reassembledData);
        if (actualHash !== metadata.contentHash) {
          throw new SealErrorClass(
            'VERIFICATION_ERROR' as SealErrorType,
            'Content hash mismatch - file may be corrupted',
            undefined,
            false,
            { expected: metadata.contentHash, actual: actualHash }
          );
        }
      }

      // Step 4: Decrypt if needed
      if (options.decrypt && metadata.isEncrypted) {
        options.onProgress?.({
          stage: 'decrypting',
          bytesDownloaded: metadata.encryptedSize,
          totalBytes: metadata.encryptedSize,
          percentage: 85
        });

        if (!options.encryptionKey) {
          throw new SealErrorClass(
            'DECRYPTION_ERROR' as SealErrorType,
            'Encryption key required for decryption',
            undefined,
            false
          );
        }

        // Import key
        const key = await sealEncryptionService.importKey(
          options.encryptionKey,
          metadata.encryptionAlgorithm === 'AES-GCM' ? 256 : 256
        );

        // Import IV
        const iv = this.base64ToUint8Array(metadata.initializationVector || '');

        // Decrypt
        const decryptedBlob = await sealEncryptionService.decryptFile(
          reassembledData,
          key,
          iv,
          metadata.encryptionAlgorithm
        );

        options.onProgress?.({
          stage: 'complete',
          bytesDownloaded: metadata.encryptedSize,
          totalBytes: metadata.encryptedSize,
          percentage: 100
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Seal download complete in ${duration}ms:`, {
          fileName: metadata.fileName,
          chunks: metadata.chunkCount,
          decrypted: true
        });

        return decryptedBlob;
      }

      // Return encrypted data as blob
      options.onProgress?.({
        stage: 'complete',
        bytesDownloaded: metadata.encryptedSize,
        totalBytes: metadata.encryptedSize,
        percentage: 100
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Seal download complete in ${duration}ms:`, {
        fileName: metadata.fileName,
        chunks: metadata.chunkCount,
        decrypted: false
      });

      return new Blob([new Uint8Array(reassembledData)]);
    } catch (error) {
      // Log error
      sealErrorLogger.logError(error, 'downloadFile', { fileName: metadata.fileName, fileId: metadata.fileId });

      options.onProgress?.({
        stage: 'error',
        bytesDownloaded: 0,
        totalBytes: metadata.encryptedSize,
        percentage: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof SealErrorClass) {
        throw error;
      }

      throw new SealErrorClass(
        'DOWNLOAD_ERROR' as SealErrorType,
        `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined,
        true,
        { fileName: metadata.fileName }
      );
    }
  }

  /**
   * Download chunks from Walrus
   * @param metadata - File metadata with chunk information
   * @param options - Download options
   * @returns Array of downloaded chunks
   */
  private async downloadChunks(
    metadata: SealFileMetadata,
    options: SealDownloadOptions
  ): Promise<Uint8Array[]> {
    const chunks: Uint8Array[] = [];
    let bytesDownloaded = 0;
    const totalBytes = metadata.encryptedSize;

    // Get chunk metadata
    const chunkMetadata = metadata.chunks || [];
    
    if (chunkMetadata.length === 0) {
      // Single blob, not chunked
      const chunk = await this.downloadChunkWithRetry(metadata.blobId, 0);
      return [chunk];
    }

    // Download each chunk
    for (let i = 0; i < chunkMetadata.length; i++) {
      const chunkMeta = chunkMetadata[i];
      
      if (!chunkMeta.blobId) {
        throw new SealErrorClass(
          'DOWNLOAD_ERROR' as SealErrorType,
          `Missing blob ID for chunk ${i}`,
          undefined,
          false,
          { chunkIndex: i }
        );
      }

      const chunk = await this.downloadChunkWithRetry(chunkMeta.blobId, i);
      
      // Verify chunk hash if available
      if (chunkMeta.hash) {
        const isValid = await sealChunkingService.verifyChunkHash(chunk, chunkMeta.hash);
        if (!isValid) {
          throw new SealErrorClass(
            'VERIFICATION_ERROR' as SealErrorType,
            `Chunk ${i} hash verification failed`,
            undefined,
            false,
            { chunkIndex: i, blobId: chunkMeta.blobId }
          );
        }
      }

      chunks.push(chunk);
      bytesDownloaded += chunk.length;

      // Report progress
      options.onProgress?.({
        stage: 'downloading',
        currentChunk: i + 1,
        totalChunks: chunkMetadata.length,
        bytesDownloaded,
        totalBytes,
        percentage: Math.floor((bytesDownloaded / totalBytes) * 70)
      });
    }

    return chunks;
  }

  /**
   * Download a single chunk with retry logic
   * @param blobId - Blob ID to download
   * @param index - Chunk index
   * @returns Downloaded chunk data
   */
  private async downloadChunkWithRetry(
    blobId: string,
    index: number
  ): Promise<Uint8Array> {
    return this.withRetry(
      async () => {
        const url = `${this.config.aggregatorUrl}/v1/${blobId}`;
        
        console.log(`📥 Downloading chunk ${index + 1}: ${blobId}`);

        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30 seconds
        });

        console.log(`✅ Chunk ${index + 1} downloaded`);

        return new Uint8Array(response.data);
      },
      DEFAULT_RETRY_CONFIG,
      `chunk ${index + 1}`
    );
  }

  /**
   * Verify a single blob exists on Walrus network
   * @param blobId - Blob ID to verify
   * @returns Verification result with details
   */
  async verifyBlob(blobId: string): Promise<{
    exists: boolean;
    size?: number;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const url = `${this.config.aggregatorUrl}/v1/${blobId}`;
      
      const response = await axios.head(url, {
        timeout: 10000, // 10 seconds
      });

      const responseTime = Date.now() - startTime;
      const size = response.headers['content-length'] 
        ? parseInt(response.headers['content-length'], 10) 
        : undefined;

      return {
        exists: response.status === 200,
        size,
        responseTime
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          exists: false,
          responseTime: Date.now() - startTime,
          error: 'Blob not found'
        };
      }
      
      return {
        exists: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify file integrity with optional content hash verification
   * @param metadata - File metadata
   * @param verifyContentHash - Whether to download and verify content hash (default: false)
   * @returns Verification result
   */
  async verifyFile(
    metadata: SealFileMetadata, 
    verifyContentHash: boolean = false
  ): Promise<FileVerificationResult> {
    const startTime = Date.now();
    
    try {
      const chunkVerifications: FileVerificationResult['chunkVerifications'] = [];
      let allChunksPresent = true;
      let contentHashMatch = true;

      // Verify each chunk exists
      const chunks = metadata.chunks || [];
      
      if (chunks.length === 0) {
        // Single blob verification
        const result = await this.verifyBlob(metadata.blobId);
        chunkVerifications.push({
          index: 0,
          blobId: metadata.blobId,
          verified: result.exists,
          error: result.error
        });
        allChunksPresent = result.exists;
      } else {
        // Verify each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          if (!chunk.blobId) {
            chunkVerifications.push({
              index: i,
              blobId: '',
              verified: false,
              error: 'Missing blob ID'
            });
            allChunksPresent = false;
            continue;
          }

          const result = await this.verifyBlob(chunk.blobId);
          chunkVerifications.push({
            index: i,
            blobId: chunk.blobId,
            verified: result.exists,
            error: result.error
          });

          if (!result.exists) {
            allChunksPresent = false;
          }
        }
      }

      // Optionally verify content hash by downloading and checking
      if (verifyContentHash && allChunksPresent && metadata.contentHash) {
        try {
          console.log('🔍 Verifying content hash by downloading file...');
          
          // Download chunks
          const downloadedChunks = await this.downloadChunks(metadata, {
            decrypt: false,
            verifyIntegrity: false // Skip integrity check during verification
          });

          // Reassemble
          const reassembledData = await sealChunkingService.reassembleChunks(downloadedChunks);

          // Compute hash
          const actualHash = await this.generateContentHash(reassembledData);

          // Compare
          contentHashMatch = actualHash === metadata.contentHash;

          if (!contentHashMatch) {
            console.error('❌ Content hash mismatch:', {
              expected: metadata.contentHash,
              actual: actualHash
            });
          } else {
            console.log('✅ Content hash verified successfully');
          }
        } catch (error) {
          console.error('❌ Failed to verify content hash:', error);
          contentHashMatch = false;
        }
      }

      const success = allChunksPresent && contentHashMatch;
      const duration = Date.now() - startTime;

      console.log(`${success ? '✅' : '❌'} Verification complete in ${duration}ms:`, {
        fileName: metadata.fileName,
        allChunksPresent,
        contentHashMatch,
        verifiedContentHash: verifyContentHash
      });

      return {
        success,
        contentHashMatch,
        allChunksPresent,
        chunkVerifications,
        verifiedAt: new Date(),
        error: success ? undefined : 'Verification failed'
      };
    } catch (error) {
      return {
        success: false,
        contentHashMatch: false,
        allChunksPresent: false,
        chunkVerifications: [],
        verifiedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify if a blob exists on Walrus
   * @param blobId - Blob ID to verify
   * @returns True if blob exists
   */
  private async verifyBlobExists(blobId: string): Promise<boolean> {
    try {
      const url = `${this.config.aggregatorUrl}/v1/${blobId}`;
      
      const response = await axios.head(url, {
        timeout: 10000, // 10 seconds
      });

      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      
      // Try with retry on network errors
      try {
        return await this.withRetry(
          async () => {
            const url = `${this.config.aggregatorUrl}/v1/${blobId}`;
            const response = await axios.head(url, { timeout: 10000 });
            return response.status === 200;
          },
          { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
          `verify blob ${blobId}`
        );
      } catch {
        return false;
      }
    }
  }

  /**
   * Retry wrapper with exponential backoff
   * @param operation - Operation to retry
   * @param config - Retry configuration
   * @param operationName - Name for logging
   * @returns Operation result
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = config.initialDelay;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt === config.maxRetries) {
          console.error(`❌ ${operationName} failed after ${attempt + 1} attempts:`, lastError);
          
          // Try RPC fallback if it's an RPC error
          if (this.isRpcError(error) && sealClient.isInitialized()) {
            console.log('🔄 Attempting RPC fallback...');
            try {
              await sealClient.withRpcFallback(async () => {
                // Reinitialize connection
                return Promise.resolve();
              });
              
              // Retry operation one more time with fallback RPC
              return await operation();
            } catch (fallbackError) {
              console.error('❌ RPC fallback also failed:', fallbackError);
            }
          }
          
          throw lastError;
        }

        // Log retry attempt
        console.warn(`⚠️ ${operationName} failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms...`, {
          error: lastError.message
        });

        // Wait before retry
        await this.sleep(delay);

        // Exponential backoff
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }

    throw lastError || new Error(`${operationName} failed after retries`);
  }

  /**
   * Check if an error is retryable
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof SealErrorClass) {
      return error.retryable;
    }

    if (axios.isAxiosError(error)) {
      // Network errors are retryable
      if (error.code === 'ECONNABORTED' || 
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' ||
          error.message.includes('timeout') ||
          error.message.includes('network')) {
        return true;
      }

      // 5xx server errors are retryable
      if (error.response && error.response.status >= 500) {
        return true;
      }

      // 429 rate limit is retryable
      if (error.response?.status === 429) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an error is RPC-related
   * @param error - Error to check
   * @returns True if error is RPC-related
   */
  private isRpcError(error: unknown): boolean {
    if (error instanceof SealErrorClass) {
      return error.type === 'RPC_ERROR' || error.type === 'NETWORK_ERROR';
    }

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      errorMessage.includes('rpc') ||
      errorMessage.includes('sui') ||
      errorMessage.includes('connection refused')
    );
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate SHA-256 content hash
   * @param data - Data to hash
   * @returns Hash as hex string
   */
  private async generateContentHash(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Convert base64 string to Uint8Array
   * @param base64 - Base64 string
   * @returns Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
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
export const sealStorageService = new SealStorageService();
