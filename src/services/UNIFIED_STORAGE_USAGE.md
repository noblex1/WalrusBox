# Unified Storage Service Usage Guide

The Unified Storage Service provides a single interface for both encrypted (Seal) and unencrypted (Walrus) file operations, automatically routing to the appropriate service based on encryption status.

## Features

- **Automatic Routing**: Detects encryption status and routes to the correct service (Seal or Walrus)
- **Backward Compatibility**: Seamlessly handles both encrypted and unencrypted files
- **Type Safety**: Full TypeScript support with proper type guards
- **Unified Interface**: Single API for all storage operations

## Basic Usage

### Uploading Files

```typescript
import { unifiedStorageService } from '@/services/unifiedStorage';

// Upload with encryption
const encryptedResult = await unifiedStorageService.uploadFile(file, {
  useEncryption: true,
  userAddress: '0x123...',
  epochs: 5,
  onProgress: (progress) => {
    console.log(`Upload progress: ${progress.percentage}%`);
  }
});

console.log('Encryption key:', encryptedResult.encryptionKey);
console.log('Blob IDs:', encryptedResult.blobIds);

// Upload without encryption
const unencryptedResult = await unifiedStorageService.uploadFile(file, {
  useEncryption: false,
  userAddress: '0x123...',
  epochs: 5
});

console.log('Blob ID:', unencryptedResult.blobIds[0]);
```

### Downloading Files

```typescript
// Download automatically detects encryption status
const blob = await unifiedStorageService.downloadFile(blobId, {
  encryptionKey: 'your-encryption-key', // Only needed for encrypted files
  onProgress: (progress) => {
    console.log(`Download progress: ${progress.percentage}%`);
  },
  verifyIntegrity: true // Verify content hash for encrypted files
});

// Convert to file for download
const file = new File([blob], 'downloaded-file.pdf');
```

### Verifying Files

```typescript
// Verify file exists and is intact
const result = await unifiedStorageService.verifyFile(blobId, true);

if (result.exists) {
  console.log('File exists on network');
  
  if (result.encrypted) {
    console.log('File is encrypted');
    console.log('Content hash match:', result.details?.contentHashMatch);
    console.log('All chunks present:', result.details?.allChunksPresent);
  }
} else {
  console.error('File not found:', result.error);
}
```

### Checking Encryption Status

```typescript
// Check if a file is encrypted
const isEncrypted = await unifiedStorageService.isFileEncrypted(blobId);

if (isEncrypted) {
  console.log('File requires encryption key for download');
}

// Get service type
const serviceType = await unifiedStorageService.getServiceType(blobId);
console.log('Service:', serviceType); // 'seal' or 'walrus'
```

### Getting File Metadata

```typescript
// Get metadata with encryption information
const metadata = await unifiedStorageService.getFileMetadata(blobId);

if (metadata) {
  console.log('File name:', metadata.fileName);
  console.log('Size:', metadata.originalSize);
  console.log('Uploaded:', metadata.uploadedAt);
  
  // Check if encrypted using type guard
  if (isEncrypted(metadata)) {
    console.log('Encryption algorithm:', metadata.encryptionAlgorithm);
    console.log('Chunk count:', metadata.chunkCount);
  }
}
```

### Deleting Files

```typescript
// Delete file (removes from tracking, blob expires based on epochs)
const deleted = await unifiedStorageService.deleteFile(blobId);

if (deleted) {
  console.log('File deleted from tracking');
}
```

## File Type Detection Utilities

The service includes utilities for detecting and validating file types:

```typescript
import { 
  isEncrypted, 
  getServiceType, 
  validateMetadata,
  getFileTypeSummary,
  canMigrateToEncrypted
} from '@/services/unifiedStorage';

// Type guard for encrypted files
if (isEncrypted(metadata)) {
  // TypeScript knows this is SealFileMetadata
  console.log('Chunks:', metadata.chunks);
}

// Get service type
const service = getServiceType(metadata); // 'seal' or 'walrus'

// Validate metadata before operations
const validation = validateMetadata(metadata, 'download');
if (!validation.valid) {
  console.error('Invalid metadata:', validation.error);
}

// Get human-readable summary
const summary = getFileTypeSummary(metadata);
console.log('File type:', summary); // e.g., "Encrypted (3 chunks)"

// Check if file can be migrated
if (canMigrateToEncrypted(metadata)) {
  console.log('File can be migrated to encrypted storage');
}
```

## Integration with Existing Code

The unified storage service is designed to work alongside existing Walrus integration:

```typescript
import { walrusIntegration } from '@/services/walrusIntegration';
import { unifiedStorageService } from '@/services/unifiedStorage';

// Use walrusIntegration for high-level operations with tracking
const result = await walrusIntegration.uploadAndTrackFile(file, userAddress, {
  useEncryption: true,
  epochs: 5
});

// Use unifiedStorageService for direct storage operations
const blob = await unifiedStorageService.downloadFile(result.blobId, {
  encryptionKey: result.encryptionKey
});
```

## Error Handling

```typescript
try {
  const result = await unifiedStorageService.uploadFile(file, {
    useEncryption: true,
    userAddress: '0x123...'
  });
} catch (error) {
  if (error instanceof Error) {
    console.error('Upload failed:', error.message);
    
    // Check if it's a Seal-specific error
    if ('type' in error) {
      console.error('Error type:', error.type);
      console.error('Retryable:', error.retryable);
    }
  }
}
```

## Progress Tracking

Both upload and download operations support progress callbacks:

```typescript
const result = await unifiedStorageService.uploadFile(file, {
  useEncryption: true,
  onProgress: (progress) => {
    console.log(`Stage: ${progress.stage}`);
    console.log(`Progress: ${progress.percentage}%`);
    
    if (progress.currentChunk && progress.totalChunks) {
      console.log(`Chunk: ${progress.currentChunk}/${progress.totalChunks}`);
    }
    
    if (progress.estimatedTimeRemaining) {
      console.log(`ETA: ${progress.estimatedTimeRemaining}ms`);
    }
  }
});
```

## Best Practices

1. **Always store encryption keys securely** - Never log or expose encryption keys
2. **Use progress callbacks** - Provide user feedback for long operations
3. **Verify integrity** - Enable integrity verification for critical files
4. **Handle errors gracefully** - Provide clear error messages to users
5. **Check encryption status** - Use type guards before accessing encrypted-specific fields
6. **Validate metadata** - Always validate metadata before operations

## Migration from Direct Walrus/Seal Usage

If you're currently using Walrus or Seal services directly, migration is straightforward:

```typescript
// Before (direct Walrus)
const walrusBlob = await walrusService.uploadFile(file, userAddress);
const blob = await walrusService.downloadBlob(walrusBlob.blobId);

// After (unified)
const result = await unifiedStorageService.uploadFile(file, {
  useEncryption: false,
  userAddress
});
const blob = await unifiedStorageService.downloadFile(result.blobIds[0]);

// Before (direct Seal)
const sealResult = await sealStorageService.uploadFile(file, {
  encrypt: true,
  userAddress
});
const blob = await sealStorageService.downloadFile(sealResult.metadata, {
  decrypt: true,
  encryptionKey: sealResult.encryptionKey
});

// After (unified)
const result = await unifiedStorageService.uploadFile(file, {
  useEncryption: true,
  userAddress
});
const blob = await unifiedStorageService.downloadFile(result.blobIds[0], {
  encryptionKey: result.encryptionKey
});
```

## Type Definitions

```typescript
interface UnifiedUploadOptions {
  useEncryption: boolean;
  userAddress?: string;
  epochs?: number;
  onProgress?: (progress: UploadProgress) => void;
}

interface UnifiedUploadResult {
  mode: 'encrypted' | 'unencrypted';
  blobIds: string[];
  objectIds: string[];
  metadata: BlobMetadata | SealFileMetadata;
  encryptionKey?: string;
}

interface UnifiedDownloadOptions {
  encryptionKey?: string;
  onProgress?: (progress: DownloadProgress) => void;
  verifyIntegrity?: boolean;
}

interface UnifiedVerificationResult {
  exists: boolean;
  encrypted: boolean;
  size?: number;
  responseTime?: number;
  error?: string;
  details?: {
    contentHashMatch?: boolean;
    allChunksPresent?: boolean;
    chunkCount?: number;
  };
}
```
