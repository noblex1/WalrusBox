// Seal Type Definitions
// Type definitions for Seal encryption, chunking, and storage operations

import type { BlobMetadata } from '../../types/walrus';

/**
 * Seal client configuration
 */
export interface SealClientConfig {
  rpcUrl: string;
  network: 'testnet' | 'mainnet';
  publisherUrl: string;
  aggregatorUrl: string;
  fallbackRpcUrls?: string[];
}

/**
 * Encryption algorithm options
 */
export type EncryptionAlgorithm = 'AES-GCM';

/**
 * Encryption options for file operations
 */
export interface EncryptionOptions {
  algorithm?: EncryptionAlgorithm;
  keySize?: 128 | 192 | 256;
  generateKey?: boolean;
  key?: CryptoKey;
}

/**
 * Encryption metadata stored with file
 */
export interface EncryptionMetadata {
  algorithm: EncryptionAlgorithm;
  keySize: number;
  iv: string; // Base64 encoded initialization vector
  version: string; // Encryption version for future compatibility
  timestamp: Date;
}

/**
 * Result of encryption operation
 */
export interface EncryptionResult {
  encryptedData: Uint8Array;
  key: CryptoKey;
  iv: Uint8Array;
  metadata: EncryptionMetadata;
}

/**
 * Chunk metadata for distributed storage
 */
export interface ChunkMetadata {
  index: number;
  size: number;
  hash: string; // SHA-256 hash of chunk content
  blobId?: string; // Walrus blob ID after upload
  objectId?: string; // Sui object ID after upload
}

/**
 * Extended blob metadata with Seal-specific fields
 */
export interface SealFileMetadata extends BlobMetadata {
  // Encryption fields
  isEncrypted: boolean;
  encryptionAlgorithm?: EncryptionAlgorithm;
  encryptionKeyId?: string; // Reference to stored key
  initializationVector?: string; // Base64 encoded IV
  
  // Chunking fields
  isChunked: boolean;
  chunkCount?: number;
  chunkSize?: number;
  chunks?: ChunkMetadata[];
  
  // Seal-specific fields
  sealVersion: string;
  contentHash: string; // SHA-256 hash for integrity verification
  
  // Sui blockchain fields (array for chunked files)
  objectIds: string[];
  transactionDigests: string[];
}

/**
 * Upload progress stages
 */
export type UploadStage = 'encrypting' | 'chunking' | 'uploading' | 'complete' | 'error';

/**
 * Upload progress information
 */
export interface UploadProgress {
  stage: UploadStage;
  currentChunk?: number;
  totalChunks?: number;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  estimatedTimeRemaining?: number; // in milliseconds
  error?: string;
}

/**
 * Download progress stages
 */
export type DownloadStage = 'downloading' | 'decrypting' | 'reassembling' | 'complete' | 'error';

/**
 * Download progress information
 */
export interface DownloadProgress {
  stage: DownloadStage;
  currentChunk?: number;
  totalChunks?: number;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  estimatedTimeRemaining?: number; // in milliseconds
  error?: string;
}

/**
 * Seal error types
 */
export enum SealErrorType {
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  CHUNKING_ERROR = 'CHUNKING_ERROR',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  DOWNLOAD_ERROR = 'DOWNLOAD_ERROR',
  VERIFICATION_ERROR = 'VERIFICATION_ERROR',
  KEY_MANAGEMENT_ERROR = 'KEY_MANAGEMENT_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CONFIG_ERROR = 'INVALID_CONFIG_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  BLOB_NOT_FOUND = 'BLOB_NOT_FOUND',
  METADATA_CORRUPTED = 'METADATA_CORRUPTED',
  METADATA_MISSING = 'METADATA_MISSING',
  PARTIAL_DOWNLOAD_FAILURE = 'PARTIAL_DOWNLOAD_FAILURE'
}

/**
 * Custom error class for Seal operations
 */
export class SealError extends Error {
  constructor(
    public type: SealErrorType,
    message: string,
    public originalError?: Error,
    public retryable: boolean = false,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SealError';
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SealError);
    }
  }
}

/**
 * Recovery action types
 */
export type RecoveryAction = 'retry' | 'report' | 'delete' | 'dismiss';

/**
 * Recovery option for error handling
 */
export interface RecoveryOption {
  action: RecoveryAction;
  label: string;
  description: string;
  primary?: boolean;
}

/**
 * Blob not found error with recovery options
 */
export interface BlobNotFoundError extends SealError {
  type: SealErrorType.BLOB_NOT_FOUND;
  blobId: string;
  fileId: string;
  fileName?: string;
  chunkIndex?: number;
  recoveryOptions: RecoveryOption[];
}

/**
 * Retry configuration for operations
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
  retryableErrors?: SealErrorType[];
}

/**
 * Chunking options
 */
export interface ChunkingOptions {
  chunkSize?: number; // Default: 10MB
  maxChunks?: number;
  generateHashes?: boolean;
}

/**
 * Upload options for Seal storage
 */
export interface SealUploadOptions {
  encrypt: boolean;
  userAddress?: string;
  epochs?: number;
  onProgress?: (progress: UploadProgress) => void;
  chunkingOptions?: ChunkingOptions;
  encryptionOptions?: EncryptionOptions;
}

/**
 * Result of Seal upload operation
 */
export interface SealUploadResult {
  blobIds: string[];
  objectIds: string[];
  encryptionKey?: string; // Exported key for storage
  metadata: SealFileMetadata;
  transactionDigests: string[];
}

/**
 * Download options for Seal storage
 */
export interface SealDownloadOptions {
  decrypt: boolean;
  encryptionKey?: string;
  onProgress?: (progress: DownloadProgress) => void;
  verifyIntegrity?: boolean;
}

/**
 * Verification result for file integrity
 */
export interface FileVerificationResult {
  success: boolean;
  contentHashMatch: boolean;
  allChunksPresent: boolean;
  chunkVerifications: Array<{
    index: number;
    blobId: string;
    verified: boolean;
    error?: string;
  }>;
  verifiedAt?: Date;
  error?: string;
}

/**
 * Storage mode for unified interface
 */
export type StorageMode = 'encrypted' | 'unencrypted';

/**
 * Unified upload options supporting both modes
 */
export interface UnifiedUploadOptions {
  useEncryption: boolean;
  userAddress?: string;
  epochs?: number;
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Unified upload result
 */
export interface UnifiedUploadResult {
  mode: StorageMode;
  blobIds: string[];
  objectIds: string[];
  metadata: BlobMetadata | SealFileMetadata;
  encryptionKey?: string;
}
