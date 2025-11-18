# Design Document: Seal Integration for Decentralized File Storage

## Overview

This design document outlines the architecture and implementation approach for integrating Mysten Labs' Seal library into WalrusBox. Seal provides client-side encryption, chunking, and integrity verification for files stored on the Walrus network. The integration will be built as an enhancement layer on top of the existing Walrus service, providing users with the option to encrypt their files while maintaining backward compatibility.

### Key Design Principles

1. **Security First**: All encryption operations happen client-side or in a secure backend environment
2. **Backward Compatibility**: Existing unencrypted files remain accessible
3. **Progressive Enhancement**: Encryption is optional and can be enabled per-file
4. **Minimal Dependencies**: Leverage existing infrastructure where possible
5. **User Experience**: Seamless integration with existing upload/download flows

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ File Upload  │  │ File List    │  │ File Preview │      │
│  │ Component    │  │ Component    │  │ Component    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  Seal Service   │                        │
│                   │  (Client-side)  │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Sui RPC       │
                    │   (Testnet)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Walrus Network  │
                    │  (Publisher &   │
                    │   Aggregator)   │
                    └─────────────────┘
```

### Component Architecture

```
src/services/
├── seal/
│   ├── sealClient.ts          # Seal client initialization
│   ├── sealEncryption.ts      # Encryption/decryption logic
│   ├── sealChunking.ts        # File chunking operations
│   ├── sealStorage.ts         # Seal-Walrus integration
│   └── sealTypes.ts           # Seal-specific types
├── walrus.ts                  # Existing Walrus service
├── walrusIntegration.ts       # Enhanced with Seal support
└── storage.ts                 # Unified storage interface

src/types/
└── seal.ts                    # Seal type definitions

src/components/
├── FileUploadArea.tsx         # Enhanced with encryption toggle
├── FileListTable.tsx          # Shows encryption status
└── FilePreviewModal.tsx       # Handles encrypted previews
```

## Components and Interfaces

### 1. Seal Client Service

**Purpose**: Initialize and manage the Seal client connection to Sui RPC.

**Interface**:
```typescript
interface SealClientConfig {
  rpcUrl: string;
  network: 'testnet' | 'mainnet';
  publisherUrl: string;
  aggregatorUrl: string;
}

class SealClientService {
  private client: WalrusClient | null;
  
  initialize(config: SealClientConfig): Promise<void>;
  getClient(): WalrusClient;
  isInitialized(): boolean;
  disconnect(): void;
}
```

**Key Responsibilities**:
- Initialize Seal's WalrusClient with Sui RPC endpoint
- Manage client lifecycle and connection state
- Provide singleton access to the client instance
- Handle RPC endpoint fallbacks

### 2. Seal Encryption Service

**Purpose**: Handle file encryption and decryption operations.

**Interface**:
```typescript
interface EncryptionOptions {
  algorithm?: 'AES-GCM';
  keySize?: 256;
  generateKey?: boolean;
  key?: CryptoKey;
}

interface EncryptionResult {
  encryptedData: Uint8Array;
  key: CryptoKey;
  iv: Uint8Array;
  metadata: EncryptionMetadata;
}

class SealEncryptionService {
  async encryptFile(
    file: File,
    options?: EncryptionOptions
  ): Promise<EncryptionResult>;
  
  async decryptFile(
    encryptedData: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<Blob>;
  
  async generateKey(): Promise<CryptoKey>;
  async exportKey(key: CryptoKey): Promise<string>;
  async importKey(keyData: string): Promise<CryptoKey>;
}
```

**Key Responsibilities**:
- Encrypt files using Web Crypto API
- Generate and manage encryption keys
- Decrypt files for download/preview
- Export/import keys for storage

### 3. Seal Chunking Service

**Purpose**: Split files into chunks for distributed storage.

**Interface**:
```typescript
interface ChunkingOptions {
  chunkSize?: number; // Default: 10MB
  maxChunks?: number;
}

interface ChunkMetadata {
  index: number;
  size: number;
  hash: string;
  blobId?: string;
  objectId?: string;
}

class SealChunkingService {
  async chunkFile(
    data: Uint8Array,
    options?: ChunkingOptions
  ): Promise<Uint8Array[]>;
  
  async reassembleChunks(
    chunks: Uint8Array[]
  ): Promise<Uint8Array>;
  
  calculateChunkCount(
    fileSize: number,
    chunkSize: number
  ): number;
}
```

**Key Responsibilities**:
- Split large files into manageable chunks
- Calculate optimal chunk sizes
- Reassemble chunks in correct order
- Generate chunk metadata

### 4. Seal Storage Service

**Purpose**: Integrate Seal with Walrus for encrypted storage operations.

**Interface**:
```typescript
interface SealUploadOptions {
  encrypt: boolean;
  userAddress?: string;
  epochs?: number;
  onProgress?: (progress: UploadProgress) => void;
}

interface SealUploadResult {
  blobIds: string[];
  objectIds: string[];
  encryptionKey?: string;
  metadata: SealFileMetadata;
}

interface SealDownloadOptions {
  decrypt: boolean;
  encryptionKey?: string;
  onProgress?: (progress: DownloadProgress) => void;
}

class SealStorageService {
  async uploadFile(
    file: File,
    options: SealUploadOptions
  ): Promise<SealUploadResult>;
  
  async downloadFile(
    metadata: SealFileMetadata,
    options: SealDownloadOptions
  ): Promise<Blob>;
  
  async verifyFile(
    metadata: SealFileMetadata
  ): Promise<VerificationResult>;
  
  async deleteFile(
    metadata: SealFileMetadata
  ): Promise<boolean>;
}
```

**Key Responsibilities**:
- Orchestrate encryption, chunking, and upload
- Handle chunk-by-chunk upload with progress tracking
- Download and reassemble encrypted files
- Verify file integrity using Seal's verification

### 5. Enhanced Walrus Integration

**Purpose**: Extend existing Walrus integration to support Seal.

**Interface**:
```typescript
interface UnifiedUploadOptions {
  useEncryption: boolean;
  userAddress?: string;
  epochs?: number;
  onProgress?: (progress: UploadProgress) => void;
}

class EnhancedWalrusIntegration {
  async uploadFile(
    file: File,
    options: UnifiedUploadOptions
  ): Promise<UnifiedUploadResult>;
  
  async downloadFile(
    fileId: string
  ): Promise<Blob>;
  
  async migrateToEncrypted(
    fileId: string
  ): Promise<void>;
}
```

**Key Responsibilities**:
- Provide unified interface for encrypted and unencrypted uploads
- Route operations to appropriate service (Seal or Walrus)
- Handle migration from unencrypted to encrypted storage
- Maintain backward compatibility

## Data Models

### Seal File Metadata

```typescript
interface SealFileMetadata extends BlobMetadata {
  // Encryption fields
  isEncrypted: boolean;
  encryptionAlgorithm?: 'AES-GCM';
  encryptionKeyId?: string; // Reference to stored key
  initializationVector?: string; // Base64 encoded IV
  
  // Chunking fields
  isChunked: boolean;
  chunkCount?: number;
  chunkSize?: number;
  chunks?: ChunkMetadata[];
  
  // Seal-specific fields
  sealVersion: string;
  contentHash: string; // SHA-256 hash for integrity
  
  // Sui blockchain fields
  objectIds: string[]; // Sui object IDs for each chunk
  transactionDigests: string[];
}
```

### Encryption Key Storage

```typescript
interface StoredEncryptionKey {
  keyId: string;
  encryptedKey: string; // Encrypted with master key
  algorithm: string;
  createdAt: Date;
  lastUsed: Date;
  associatedFiles: string[]; // File IDs using this key
}
```

### Upload Progress

```typescript
interface UploadProgress {
  stage: 'encrypting' | 'chunking' | 'uploading' | 'complete';
  currentChunk?: number;
  totalChunks?: number;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}
```

## Error Handling

### Error Types

```typescript
enum SealErrorType {
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  CHUNKING_ERROR = 'CHUNKING_ERROR',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  DOWNLOAD_ERROR = 'DOWNLOAD_ERROR',
  VERIFICATION_ERROR = 'VERIFICATION_ERROR',
  KEY_MANAGEMENT_ERROR = 'KEY_MANAGEMENT_ERROR',
  RPC_ERROR = 'RPC_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

class SealError extends Error {
  constructor(
    public type: SealErrorType,
    message: string,
    public originalError?: Error,
    public retryable: boolean = false
  ) {
    super(message);
  }
}
```

### Error Handling Strategy

1. **Retry Logic**: Implement exponential backoff for network errors
2. **Fallback RPC**: Switch to backup RPC endpoints on failure
3. **Partial Upload Recovery**: Resume failed chunk uploads
4. **User Feedback**: Clear error messages with actionable steps
5. **Logging**: Comprehensive error logging for debugging

### Error Recovery Flows

```typescript
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  // Exponential backoff retry logic
}
```

## Testing Strategy

### Unit Tests

1. **Encryption Service Tests**
   - Test encryption/decryption round-trip
   - Test key generation and export/import
   - Test error handling for invalid keys

2. **Chunking Service Tests**
   - Test file splitting and reassembly
   - Test chunk size calculations
   - Test edge cases (empty files, single byte files)

3. **Storage Service Tests**
   - Mock Seal client operations
   - Test upload flow with mocked chunks
   - Test download and verification

### Integration Tests

1. **End-to-End Encrypted Upload**
   - Upload a file with encryption enabled
   - Verify chunks are created and uploaded
   - Verify metadata is stored correctly

2. **End-to-End Encrypted Download**
   - Download an encrypted file
   - Verify decryption works correctly
   - Verify file integrity

3. **Migration Tests**
   - Migrate unencrypted file to encrypted
   - Verify old file is accessible during migration
   - Verify new encrypted file works correctly

### Performance Tests

1. **Large File Handling**
   - Test files up to 100MB
   - Measure encryption time
   - Measure chunking time
   - Measure upload time per chunk

2. **Concurrent Operations**
   - Test multiple simultaneous uploads
   - Test multiple simultaneous downloads
   - Verify no resource exhaustion

## Security Considerations

### Key Management

1. **Key Generation**: Use Web Crypto API for cryptographically secure key generation
2. **Key Storage**: Store keys encrypted with a master key derived from user wallet
3. **Key Rotation**: Implement periodic key rotation for long-term files
4. **Key Backup**: Provide secure key export for user backup

### Encryption Best Practices

1. **Algorithm**: Use AES-256-GCM for authenticated encryption
2. **IV Generation**: Generate unique IV for each encryption operation
3. **No Key Reuse**: Never reuse the same key+IV combination
4. **Secure Deletion**: Clear sensitive data from memory after use

### Frontend Security

1. **No Key Exposure**: Never log or expose encryption keys in console
2. **Secure Communication**: All API calls use HTTPS
3. **Input Validation**: Validate all user inputs before processing
4. **XSS Prevention**: Sanitize all user-generated content

## Implementation Phases

### Phase 1: Core Seal Integration (Requirements 1, 2, 3)
- Install @mysten/seal package
- Implement Seal client initialization
- Implement encryption service
- Implement chunking service
- Implement basic upload/download flows

### Phase 2: Frontend Integration (Requirements 5, 9)
- Add encryption toggle to upload UI
- Update file list to show encryption status
- Implement encrypted file preview
- Maintain backward compatibility

### Phase 3: Security & Key Management (Requirement 6)
- Implement secure key generation
- Implement key storage system
- Add key rotation capabilities
- Implement key backup/export

### Phase 4: Verification & Error Handling (Requirements 7, 8)
- Implement integrity verification
- Add comprehensive error handling
- Implement retry logic
- Add user-friendly error messages

### Phase 5: Testing & Documentation (Requirement 10)
- Write unit tests
- Write integration tests
- Write performance tests
- Create user documentation

## Configuration

### Environment Variables

```bash
# Sui Network Configuration
VITE_SUI_NETWORK=testnet
VITE_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Walrus Configuration
VITE_WALRUS_PUBLISHER_URL=https://publisher.walrus-01.tududes.com
VITE_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# Seal Configuration
VITE_SEAL_ENABLED=true
VITE_SEAL_CHUNK_SIZE=10485760  # 10MB
VITE_SEAL_MAX_FILE_SIZE=104857600  # 100MB

# Encryption Configuration
VITE_ENCRYPTION_ALGORITHM=AES-GCM
VITE_ENCRYPTION_KEY_SIZE=256
```

### Runtime Configuration

```typescript
interface SealConfig {
  enabled: boolean;
  rpcUrl: string;
  publisherUrl: string;
  aggregatorUrl: string;
  chunkSize: number;
  maxFileSize: number;
  encryptionAlgorithm: string;
  encryptionKeySize: number;
}

const sealConfig: SealConfig = {
  enabled: import.meta.env.VITE_SEAL_ENABLED === 'true',
  rpcUrl: import.meta.env.VITE_SUI_RPC_URL,
  publisherUrl: import.meta.env.VITE_WALRUS_PUBLISHER_URL,
  aggregatorUrl: import.meta.env.VITE_WALRUS_AGGREGATOR_URL,
  chunkSize: parseInt(import.meta.env.VITE_SEAL_CHUNK_SIZE),
  maxFileSize: parseInt(import.meta.env.VITE_SEAL_MAX_FILE_SIZE),
  encryptionAlgorithm: import.meta.env.VITE_ENCRYPTION_ALGORITHM,
  encryptionKeySize: parseInt(import.meta.env.VITE_ENCRYPTION_KEY_SIZE)
};
```

## API Endpoints (Future Backend Implementation)

While the initial implementation will be client-side only, these endpoints are designed for future backend integration:

### POST /api/seal/upload
- Request: Multipart file upload with encryption options
- Response: Upload result with blob IDs and metadata
- Purpose: Handle server-side encryption for enhanced security

### GET /api/seal/download/:fileId
- Request: File ID and decryption parameters
- Response: Decrypted file stream
- Purpose: Server-side decryption for sensitive files

### POST /api/seal/verify/:fileId
- Request: File ID
- Response: Verification result
- Purpose: Verify file integrity on Walrus

### POST /api/seal/migrate/:fileId
- Request: File ID to migrate
- Response: Migration result
- Purpose: Migrate unencrypted file to encrypted storage

## Monitoring and Observability

### Metrics to Track

1. **Upload Metrics**
   - Average upload time per file size
   - Chunk upload success rate
   - Encryption time per file size

2. **Download Metrics**
   - Average download time per file size
   - Decryption time per file size
   - Verification success rate

3. **Error Metrics**
   - Error rate by type
   - Retry success rate
   - RPC endpoint availability

### Logging Strategy

```typescript
interface SealLogEntry {
  timestamp: Date;
  operation: string;
  fileId?: string;
  blobIds?: string[];
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}
```

## Migration Path

### Migrating Existing Files

1. **Identify Unencrypted Files**: Query all files with `isEncrypted: false`
2. **Download Original**: Fetch from Walrus using existing blob ID
3. **Encrypt and Re-upload**: Use Seal to encrypt and upload
4. **Update Metadata**: Mark as encrypted with new blob IDs
5. **Verify**: Ensure new encrypted version is accessible
6. **Optional Cleanup**: Delete old unencrypted version

### User Communication

- Notify users about new encryption feature
- Provide migration tool in settings
- Show encryption status clearly in UI
- Offer bulk migration option
