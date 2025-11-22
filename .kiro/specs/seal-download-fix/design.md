# Design Document

## Overview

This design addresses the critical issue where encrypted files uploaded via Seal cannot be downloaded or previewed because the system attempts to fetch blob IDs that don't exist on the Walrus network. The root cause is a mismatch between how Seal metadata is stored during upload and how it's retrieved during download.

The solution involves:
1. Fixing the metadata retrieval logic to correctly locate Seal metadata
2. Implementing proper blob verification before download attempts
3. Adding comprehensive error handling with actionable user feedback
4. Ensuring consistent metadata storage patterns across upload and download flows

## Architecture

### Current Flow (Broken)

```
User clicks download/preview
  → Retrieves file metadata from localStorage
  → Attempts to load Seal metadata using file.id
  → Downloads using blob ID from Seal metadata
  → Walrus returns 404 (blob doesn't exist)
  → Error displayed to user
```

### Proposed Flow (Fixed)

```
User clicks download/preview
  → Retrieves file metadata from localStorage
  → Loads Seal metadata using correct key format
  → Verifies blob existence (optional HEAD request)
  → If blob exists:
      → Downloads chunks from Walrus
      → Reassembles and decrypts
      → Presents to user
  → If blob missing:
      → Logs detailed error information
      → Shows user-friendly error with recovery options
```

## Components and Interfaces

### 1. Seal Metadata Service Enhancement

**Location:** `src/services/seal/sealMetadata.ts` (new file)

**Purpose:** Centralize all Seal metadata storage and retrieval operations

**Interface:**
```typescript
interface SealMetadataService {
  // Storage
  saveSealMetadata(fileId: string, metadata: SealFileMetadata): Promise<void>;
  
  // Retrieval
  getSealMetadata(fileId: string): Promise<SealFileMetadata | null>;
  
  // Validation
  validateSealMetadata(metadata: SealFileMetadata): boolean;
  
  // Verification
  verifyBlobsExist(metadata: SealFileMetadata): Promise<BlobVerificationResult>;
  
  // Repair
  repairSealMetadata(fileId: string): Promise<boolean>;
  
  // Migration
  migrateOldMetadata(): Promise<number>;
}

interface BlobVerificationResult {
  allBlobsExist: boolean;
  missingBlobs: string[];
  verifiedBlobs: string[];
  errors: Array<{ blobId: string; error: string }>;
}
```

### 2. Download Service Refactoring

**Location:** `src/services/files.ts` and Dashboard components

**Changes:**
- Extract download logic into dedicated service method
- Add pre-download blob verification
- Implement proper error categorization
- Add progress tracking for multi-chunk downloads

**Interface:**
```typescript
interface DownloadService {
  // Main download method
  downloadEncryptedFile(
    fileId: string,
    options?: DownloadOptions
  ): Promise<Blob>;
  
  // Preview method
  previewEncryptedFile(
    fileId: string,
    options?: PreviewOptions
  ): Promise<PreviewResult>;
  
  // Verification
  verifyFileAvailability(fileId: string): Promise<AvailabilityResult>;
}

interface DownloadOptions {
  verifyBeforeDownload?: boolean;
  onProgress?: (progress: DownloadProgress) => void;
  timeout?: number;
}

interface AvailabilityResult {
  available: boolean;
  reason?: string;
  missingBlobs?: string[];
  canRecover?: boolean;
}
```

### 3. Error Handler Enhancement

**Location:** `src/services/seal/sealErrorHandler.ts`

**Changes:**
- Add specific error types for missing blobs
- Implement error recovery suggestions
- Add detailed logging for debugging

**New Error Types:**
```typescript
enum SealErrorType {
  // Existing types...
  BLOB_NOT_FOUND = 'BLOB_NOT_FOUND',
  METADATA_CORRUPTED = 'METADATA_CORRUPTED',
  METADATA_MISSING = 'METADATA_MISSING',
  PARTIAL_DOWNLOAD_FAILURE = 'PARTIAL_DOWNLOAD_FAILURE',
}

interface BlobNotFoundError extends SealError {
  type: SealErrorType.BLOB_NOT_FOUND;
  blobId: string;
  fileId: string;
  chunkIndex?: number;
  recoveryOptions: RecoveryOption[];
}

interface RecoveryOption {
  action: 'retry' | 'report' | 'delete';
  label: string;
  description: string;
}
```

## Data Models

### Seal Metadata Storage Format

**Key Format:** `seal_metadata_{fileId}`

**Value Structure:**
```typescript
interface SealFileMetadata {
  // Core identifiers
  blobId: string;              // Primary blob ID
  fileId: string;              // Unique file identifier
  objectId: string;            // Sui object ID
  
  // File information
  fileName: string;
  originalSize: number;
  encryptedSize: number;
  mimeType: string;
  
  // Encryption details
  isEncrypted: boolean;
  encryptionAlgorithm: string;
  encryptionKeyId: string;
  initializationVector: string;
  
  // Chunking information
  isChunked: boolean;
  chunkCount: number;
  chunkSize: number;
  chunks: ChunkMetadata[];
  
  // Walrus details
  aggregatorUrl: string;
  walrusScanUrl: string;
  
  // Timestamps
  uploadedAt: Date;
  expiresAt: Date;
  
  // Status
  status: 'active' | 'expired' | 'deleted';
  
  // Verification
  contentHash: string;
  lastVerified?: Date;
}

interface ChunkMetadata {
  index: number;
  blobId: string;           // Walrus blob ID for this chunk
  objectId: string;         // Sui object ID
  size: number;
  hash: string;             // SHA-256 hash for verification
}
```

### Local File Metadata Enhancement

**Changes to LocalFileMetadata:**
```typescript
interface LocalFileMetadata {
  // Existing fields...
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  visibility: 'public' | 'private';
  allowedWallets: string[];
  
  // New fields
  isEncrypted: boolean;
  hasSealMetadata: boolean;
  sealMetadataKey?: string;  // Reference to Seal metadata
  lastVerified?: Date;
  verificationStatus?: 'verified' | 'failed' | 'pending';
}
```

## Error Handling

### Error Categories

1. **Missing Blob Errors (404)**
   - User Message: "This file is no longer available on the storage network"
   - Recovery: Offer to remove from list or report issue
   - Logging: Log blob ID, file ID, and metadata for investigation

2. **Network Errors (Timeout, Connection)**
   - User Message: "Network error while downloading. Please try again"
   - Recovery: Automatic retry with exponential backoff
   - Logging: Log network conditions and retry attempts

3. **Metadata Errors (Missing/Corrupted)**
   - User Message: "File metadata is corrupted. Unable to download"
   - Recovery: Attempt metadata repair or offer deletion
   - Logging: Log metadata state and corruption details

4. **Decryption Errors**
   - User Message: "Unable to decrypt file. Encryption key may be missing"
   - Recovery: Check key storage, offer re-upload
   - Logging: Log encryption details (without exposing keys)

### Error Flow Diagram

```
Download Attempt
  ↓
Load Seal Metadata
  ↓
Metadata Found? ──No──→ METADATA_MISSING Error
  ↓ Yes                  → Show "File metadata not found"
  ↓                      → Offer to remove file
Validate Metadata
  ↓
Valid? ──No──→ METADATA_CORRUPTED Error
  ↓ Yes        → Show "File data is corrupted"
  ↓            → Offer repair or deletion
Verify Blobs (optional)
  ↓
All Exist? ──No──→ BLOB_NOT_FOUND Error
  ↓ Yes             → Show "File not available"
  ↓                 → Log missing blob IDs
Download Chunks
  ↓
Success? ──No──→ PARTIAL_DOWNLOAD_FAILURE
  ↓ Yes           → Retry failed chunks
  ↓               → Show progress
Decrypt
  ↓
Success? ──No──→ DECRYPTION_ERROR
  ↓ Yes           → Show "Decryption failed"
  ↓               → Check key availability
Return File
```

## Testing Strategy

### Unit Tests

1. **Seal Metadata Service**
   - Test metadata storage with various key formats
   - Test metadata retrieval with missing/corrupted data
   - Test validation logic for incomplete metadata
   - Test blob verification with mock responses

2. **Download Service**
   - Test download flow with valid metadata
   - Test error handling for 404 responses
   - Test progress tracking during multi-chunk downloads
   - Test timeout handling

3. **Error Handler**
   - Test error categorization
   - Test recovery option generation
   - Test error logging without sensitive data

### Integration Tests

1. **End-to-End Download Flow**
   - Upload file with Seal encryption
   - Verify metadata is stored correctly
   - Download file and verify content matches
   - Test preview functionality

2. **Error Scenarios**
   - Simulate missing blob (404)
   - Simulate network timeout
   - Simulate corrupted metadata
   - Verify user sees appropriate error messages

3. **Blob Verification**
   - Test verification with all blobs present
   - Test verification with missing blobs
   - Test verification caching

### Manual Testing Checklist

- [ ] Upload encrypted file and verify metadata storage
- [ ] Download encrypted file successfully
- [ ] Preview encrypted image file
- [ ] Preview encrypted PDF file
- [ ] Trigger 404 error and verify error message
- [ ] Verify blob verification UI feedback
- [ ] Test with multi-chunk files
- [ ] Test with single-chunk files
- [ ] Verify error logging in console
- [ ] Test recovery options (retry, delete)

## Implementation Notes

### Key Design Decisions

1. **Metadata Key Format**
   - Use consistent `seal_metadata_{fileId}` format
   - Document format in code comments
   - Add migration utility for old formats

2. **Blob Verification**
   - Make verification optional (performance vs reliability trade-off)
   - Cache verification results for 5 minutes
   - Use HEAD requests to minimize bandwidth

3. **Error Recovery**
   - Provide actionable recovery options
   - Don't auto-delete files (user decision)
   - Log all errors for debugging

4. **Progress Tracking**
   - Show progress for multi-chunk downloads
   - Update UI during verification
   - Provide cancel option for long operations

### Performance Considerations

1. **Caching**
   - Cache Seal metadata in memory after first load
   - Cache blob verification results
   - Clear cache on file deletion

2. **Parallel Downloads**
   - Download chunks sequentially (simpler error handling)
   - Consider parallel downloads for large files (future enhancement)

3. **Lazy Verification**
   - Don't verify on file list load
   - Verify only when user initiates download/preview
   - Batch verification for multiple files (future enhancement)

### Security Considerations

1. **Key Handling**
   - Never log encryption keys
   - Clear keys from memory after use
   - Validate key format before use

2. **Metadata Integrity**
   - Validate all metadata fields before use
   - Check content hash after download
   - Detect tampering attempts

3. **Error Messages**
   - Don't expose internal system details
   - Provide user-friendly messages
   - Log technical details separately

## Migration Plan

### Phase 1: Add Metadata Service
- Create sealMetadata.ts service
- Implement storage and retrieval methods
- Add validation logic
- Write unit tests

### Phase 2: Refactor Download Logic
- Extract download logic from components
- Integrate metadata service
- Add blob verification
- Update error handling

### Phase 3: Update UI Components
- Update FileListTable download handler
- Update FilePreviewModal
- Add progress indicators
- Add error recovery UI

### Phase 4: Testing and Validation
- Run integration tests
- Perform manual testing
- Fix any issues found
- Document known limitations

### Phase 5: Deployment
- Deploy to staging
- Monitor error logs
- Gather user feedback
- Deploy to production
