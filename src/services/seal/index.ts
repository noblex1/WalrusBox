// Seal Services Index
// Central export point for all Seal-related services

// Client
export { sealClientService, SealClientService } from './sealClient';

// Configuration
export { sealConfig, validateSealConfig } from './sealConfig';

// Types
export * from './sealTypes';

// Encryption
export {
  sealEncryptionService,
  encryptionMetadataHandler,
  keyDerivationService,
  SealEncryptionService,
  EncryptionMetadataHandler,
  KeyDerivationService,
  AlgorithmVersionTracker
} from './sealEncryption';

// Chunking
export { sealChunkingService, SealChunkingService } from './sealChunking';

// Storage
export { sealStorageService, SealStorageService } from './sealStorage';

// Metadata
export {
  sealMetadataService,
  SealMetadataService,
  type BlobVerificationResult
} from './sealMetadata';

// File Type Detection
export {
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
  validateMetadata,
  fileTypeDetection
} from './fileTypeDetection';

// Key Management
export {
  keyManagementService,
  KeyManagementService,
  type StoredEncryptionKey,
  type KeyBackup
} from './keyManagement';

// Wallet Key Derivation
export {
  walletKeyDerivationService,
  WalletKeyDerivationService,
  type KeyRotationMetadata,
  type WalletKeyDerivationOptions
} from './walletKeyDerivation';

// Key Security
export {
  keySecurityManager,
  KeySecurityManager,
  useKeySecurityCleanup,
  type CompromiseDetectionResult,
  type ReEncryptionTask,
  type KeySecurityConfig
} from './keySecurityManager';

// Error Handling
export {
  SealErrorHandler,
  sealErrorHandler,
  ErrorCategory,
  ERROR_MESSAGES,
  ERROR_CATEGORIES,
  type ErrorDetails
} from './sealErrorHandler';

export {
  SealErrorRecovery,
  RecoveryStateManager,
  DEFAULT_RETRY_CONFIG,
  type PartialUploadState
} from './sealErrorRecovery';

export {
  SealErrorLogger,
  sealErrorLogger,
  LogLevel,
  type ErrorLogEntry,
  type ErrorStatistics
} from './sealErrorLogger';

export {
  SealTimeoutHandler,
  sealTimeoutHandler,
  DEFAULT_TIMEOUTS,
  type TimeoutConfig,
  type TimeoutResult
} from './sealTimeout';
