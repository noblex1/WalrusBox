# Key Management System Usage Guide

This guide explains how to use the Seal key management system for secure encryption key handling.

## Overview

The key management system consists of three main components:

1. **KeyManagementService** - Core key storage and retrieval
2. **WalletKeyDerivationService** - Wallet-based key derivation and rotation
3. **KeySecurityManager** - Security measures including automatic cleanup and compromise detection

## Basic Usage

### 1. Initialize Key Management

```typescript
import { keyManagementService } from './services/seal';

// Initialize the service (generates or retrieves master key)
await keyManagementService.initialize();
```

### 2. Generate and Store Keys

```typescript
// Generate a new encryption key
const { keyId, key } = await keyManagementService.generateKey(256);

// Associate the key with a file
await keyManagementService.associateFileWithKey(keyId, 'file-123');

// Retrieve the key later
const retrievedKey = await keyManagementService.getKey(keyId);
```

### 3. Export and Import Keys (Backup/Restore)

```typescript
// Export keys for backup
const backup = await keyManagementService.exportKeys('user-password-123');

// Save backup to file or cloud storage
localStorage.setItem('key-backup', JSON.stringify(backup));

// Import keys from backup
const backupData = JSON.parse(localStorage.getItem('key-backup')!);
await keyManagementService.importKeys(backupData, 'user-password-123');
```

## Wallet-Based Key Derivation

### 1. Derive Key from Wallet

```typescript
import { walletKeyDerivationService } from './services/seal';
import { useWallet } from './hooks/useWallet';

// In your component
const { address } = useWallet();

// Function to sign messages with wallet
const signMessage = async (message: string) => {
  // Use your wallet's sign message function
  return await wallet.signMessage(message);
};

// Derive a key from wallet signature
const { keyId, key } = await walletKeyDerivationService.deriveKeyFromWallet(
  address,
  signMessage,
  { context: 'my-app-encryption' }
);
```

### 2. Derive File-Specific Keys

```typescript
// Derive a unique key for each file
const { keyId, key } = await walletKeyDerivationService.deriveFileKey(
  address,
  signMessage,
  'file-123'
);
```

### 3. Key Rotation

```typescript
// Rotate a key (creates new version)
const { newKeyId, newKey, rotationMetadata } = 
  await walletKeyDerivationService.rotateKey(
    address,
    signMessage,
    currentKeyId,
    'scheduled' // or 'manual' or 'compromise'
  );

// Get rotation history
const history = await walletKeyDerivationService.getRotationHistory(keyId);

// Check if key should be rotated (based on age)
const shouldRotate = await walletKeyDerivationService.shouldRotateKey(
  keyId,
  90 // max age in days
);
```

## Key Security Management

### 1. Initialize Security Manager

```typescript
import { keySecurityManager } from './services/seal';

// Initialize with custom config
await keySecurityManager.initialize({
  autoCleanupInterval: 300000, // 5 minutes
  maxKeyAge: 90, // days
  compromiseCheckInterval: 3600000, // 1 hour
  enableAutoRotation: true
});
```

### 2. Manual Memory Cleanup

```typescript
// Manually clear keys from memory
keySecurityManager.performMemoryCleanup();
```

### 3. Compromise Detection and Re-encryption

```typescript
// Mark a key as compromised
const result = await keySecurityManager.markKeyAsCompromised(
  keyId,
  'Suspected unauthorized access'
);

console.log('Affected files:', result.affectedFiles);
console.log('Recommended action:', result.recommendedAction);

// Re-encrypt files with new key
const tasks = await keySecurityManager.reEncryptFilesAfterCompromise(
  oldKeyId,
  newKeyId,
  async (fileId, oldKey, newKey) => {
    // Your re-encryption logic here
    // 1. Download file encrypted with oldKey
    // 2. Decrypt with oldKey
    // 3. Re-encrypt with newKey
    // 4. Upload new version
  }
);

// Check task status
tasks.forEach(task => {
  console.log(`File ${task.fileId}: ${task.status}`);
});
```

### 4. Automatic Key Rotation for Long-term Files

```typescript
// Rotate keys for files older than 90 days
const results = await keySecurityManager.rotateKeysForLongTermFiles(
  address,
  signMessage,
  90 // max age in days
);

results.forEach(result => {
  if (result.rotated) {
    console.log(`Key ${result.keyId} rotated to ${result.newKeyId}`);
  }
});
```

### 5. React Hook for Automatic Cleanup

```typescript
import { useKeySecurityCleanup } from './services/seal';

function MyComponent() {
  // Automatically cleanup keys on unmount and page visibility changes
  useKeySecurityCleanup();
  
  return <div>My Component</div>;
}
```

## Integration with File Upload/Download

### Upload with Wallet-Derived Key

```typescript
import { 
  walletKeyDerivationService,
  sealStorageService 
} from './services/seal';

async function uploadEncryptedFile(file: File, walletAddress: string, signMessage: Function) {
  // Derive file-specific key
  const { keyId, key } = await walletKeyDerivationService.deriveFileKey(
    walletAddress,
    signMessage,
    file.name
  );
  
  // Upload with encryption
  const result = await sealStorageService.uploadFile(file, {
    encrypt: true,
    userAddress: walletAddress,
    encryptionOptions: { key }
  });
  
  // Store keyId with file metadata
  return {
    ...result,
    encryptionKeyId: keyId
  };
}
```

### Download with Key Retrieval

```typescript
async function downloadEncryptedFile(fileMetadata: any) {
  // Retrieve the encryption key
  const key = await keyManagementService.getKey(fileMetadata.encryptionKeyId);
  
  if (!key) {
    throw new Error('Encryption key not found');
  }
  
  // Download and decrypt
  const blob = await sealStorageService.downloadFile(fileMetadata, {
    decrypt: true,
    encryptionKey: await sealEncryptionService.exportKey(key)
  });
  
  return blob;
}
```

## Best Practices

1. **Always initialize services before use**
   ```typescript
   await keyManagementService.initialize();
   await keySecurityManager.initialize();
   ```

2. **Use wallet-derived keys for user-specific encryption**
   - Provides deterministic key generation
   - No need to store keys separately
   - Keys are tied to user's wallet

3. **Implement regular key rotation**
   - Set up automatic rotation for long-term files
   - Rotate keys after 90 days by default
   - Rotate immediately if compromise is suspected

4. **Export keys for backup**
   - Provide users with key export functionality
   - Encrypt backups with strong passwords
   - Store backups securely (not in localStorage for production)

5. **Clear keys from memory**
   - Use automatic cleanup intervals
   - Clear on page unload and visibility changes
   - Clear immediately after marking as compromised

6. **Handle key compromise properly**
   - Mark compromised keys immediately
   - Re-encrypt all affected files
   - Delete old keys after successful re-encryption

7. **Associate keys with files**
   - Always track which files use which keys
   - Enables efficient key rotation and compromise handling
   - Helps with key lifecycle management

## Security Considerations

- **Master Key**: Stored in IndexedDB, used to encrypt all other keys
- **Key Cache**: Cleared automatically at regular intervals
- **Wallet Signatures**: Used for deterministic key derivation
- **Key Rotation**: Recommended every 90 days for long-term files
- **Compromise Detection**: Automatic monitoring with manual override
- **Memory Cleanup**: Automatic and manual options available

## Error Handling

All services throw `SealError` with specific error types:

```typescript
import { SealError, SealErrorType } from './services/seal';

try {
  await keyManagementService.generateKey();
} catch (error) {
  if (error instanceof SealError) {
    switch (error.type) {
      case SealErrorType.KEY_MANAGEMENT_ERROR:
        console.error('Key management error:', error.message);
        break;
      case SealErrorType.ENCRYPTION_ERROR:
        console.error('Encryption error:', error.message);
        break;
      // Handle other error types...
    }
  }
}
```

## Testing

The key management system can be tested with:

```typescript
// Test key generation
const { keyId, key } = await keyManagementService.generateKey();
console.assert(keyId && key, 'Key generation failed');

// Test key retrieval
const retrieved = await keyManagementService.getKey(keyId);
console.assert(retrieved !== null, 'Key retrieval failed');

// Test export/import
const backup = await keyManagementService.exportKeys('test-password');
await keyManagementService.deleteKey(keyId);
await keyManagementService.importKeys(backup, 'test-password');
const restored = await keyManagementService.getKey(keyId);
console.assert(restored !== null, 'Key restore failed');
```
