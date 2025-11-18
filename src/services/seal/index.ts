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
