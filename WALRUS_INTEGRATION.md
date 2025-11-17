# Walrus Integration Guide

## Overview

WalBox now includes comprehensive Walrus network integration with automatic blob tracking. This guide shows you how to upload files, download blobs, and check them on Walrus Scan.

## Quick Start

### 1. Upload a File

```typescript
import { walrusService } from '@/services/walrus';

// Upload a file
const file = /* your File object */;
const result = await walrusService.uploadFile(file);

console.log('Blob ID:', result.blobId);
console.log('Download URL:', result.walrusUrl);
```

### 2. Check Your Blob on Walrus

After uploading, you can view your blob in two ways:

**Walrus Scan (Block Explorer):**
```
https://walrus-testnet-explorer.walrus.space/blob/{YOUR_BLOB_ID}
```

**Direct Download URL:**
```
https://aggregator.walrus-testnet.walrus.space/v1/{YOUR_BLOB_ID}
```

### 3. Download a Blob

```typescript
import { walrusService } from '@/services/walrus';

// Download by blob ID
const blob = await walrusService.downloadBlob('your-blob-id');

// Create download link
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'filename.ext';
a.click();
```

## Complete Integration with Tracking

### Upload and Track

```typescript
import { walrusIntegration } from '@/services/walrusIntegration';

// Upload file and automatically track metadata
const result = await walrusIntegration.uploadAndTrackFile(file, userAddress);

console.log('Blob ID:', result.blobId);
console.log('Walrus URL:', result.walrusUrl);
console.log('Walrus Scan:', result.walrusScanUrl);
```

### View All Tracked Blobs

```typescript
import { walrusIntegration } from '@/services/walrusIntegration';

// Get all tracked blobs with their URLs
const blobs = await walrusIntegration.getAllTrackedBlobs();

blobs.forEach(blob => {
  console.log(`${blob.fileName}:`);
  console.log(`  Blob ID: ${blob.blobId}`);
  console.log(`  Download: ${blob.walrusUrl}`);
  console.log(`  Explorer: ${blob.walrusScanUrl}`);
  console.log(`  Status: ${blob.status}`);
});
```

### Verify Blob Exists

```typescript
import { walrusIntegration } from '@/services/walrusIntegration';

// Check if blob exists on Walrus
const exists = await walrusIntegration.verifyBlobExists('your-blob-id');

if (exists) {
  console.log('✅ Blob is available on Walrus');
} else {
  console.log('❌ Blob not found or expired');
}
```

## Walrus Service API

### Upload Methods

```typescript
// Basic upload
walrusService.uploadFile(file: File, userAddress?: string, epochs?: number)

// Upload from URL (may have CORS restrictions)
walrusService.uploadFromUrl(url: string, userAddress?: string)
```

### Download Methods

```typescript
// Download blob
walrusService.downloadBlob(blobId: string, useBackup?: boolean)

// Verify blob exists
walrusService.verifyBlob(blobId: string)

// Get blob metadata
walrusService.getBlobMetadata(blobId: string)
```

### URL Helpers

```typescript
// Get download URL
walrusService.getBlobUrl(blobId: string)

// Get Walrus Scan URL
walrusService.getWalrusScanUrl(blobId: string)

// Check if URL is a Walrus URL
walrusService.isWalrusUrl(url: string)

// Extract blob ID from URL
walrusService.extractBlobId(url: string)
```

## Blob Tracking

All uploads are automatically tracked with comprehensive metadata:

```typescript
import { blobTrackingService } from '@/services/blobTracking';

// Get blob metadata
const metadata = await blobTrackingService.getBlobMetadata('blob-id');

console.log('File name:', metadata.fileName);
console.log('Size:', metadata.encodedSize);
console.log('Cost:', metadata.storageCost, 'SUI');
console.log('Expires:', metadata.expiresAt);
console.log('Downloads:', metadata.downloadCount);
console.log('Walrus Scan:', metadata.walrusScanUrl);
```

## Example: Complete Upload Flow

```typescript
import { walrusService } from '@/services/walrus';
import { blobTrackingService } from '@/services/blobTracking';

async function uploadFile(file: File) {
  try {
    // 1. Upload to Walrus
    console.log('📤 Uploading to Walrus...');
    const result = await walrusService.uploadFile(file);
    
    // 2. Log URLs
    console.log('✅ Upload successful!');
    console.log('📦 Blob ID:', result.blobId);
    console.log('🔗 Download URL:', result.walrusUrl);
    console.log('🔍 Walrus Scan:', walrusService.getWalrusScanUrl(result.blobId));
    
    // 3. Track metadata (done automatically by storage service)
    const metadata = await blobTrackingService.getBlobMetadata(result.blobId);
    if (metadata) {
      console.log('💾 Metadata tracked:', {
        fileName: metadata.fileName,
        size: metadata.encodedSize,
        cost: metadata.storageCost,
        expires: metadata.expiresAt
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}
```

## Checking Files on Walrus Scan

### Step 1: Get Your Blob ID

After uploading, your blob ID will be logged in the console:
```
✅ Uploaded to Walrus: abc123xyz456
```

### Step 2: Visit Walrus Scan

Open this URL in your browser:
```
https://walrus-testnet-explorer.walrus.space/blob/abc123xyz456
```

### Step 3: View Blob Details

On Walrus Scan, you'll see:
- Blob ID and storage details
- Encoded size and cost
- Storage epochs (start and end)
- Transaction history
- Download button

### Step 4: Download Directly

You can also download directly from the aggregator:
```
https://aggregator.walrus-testnet.walrus.space/v1/abc123xyz456
```

## Error Handling

```typescript
try {
  const result = await walrusService.uploadFile(file);
} catch (error) {
  if (error.message.includes('413')) {
    console.error('File too large (max ~5MB)');
  } else if (error.message.includes('timeout')) {
    console.error('Upload timeout - file too large or slow connection');
  } else if (error.message.includes('Network error')) {
    console.error('No internet connection');
  } else {
    console.error('Upload failed:', error.message);
  }
}
```

## Configuration

Current endpoints (configured in `src/services/walrus.ts`):

- **Publisher:** `https://publisher.walrus-01.tududes.com`
- **Aggregator:** `https://aggregator.walrus-testnet.walrus.space`
- **Backup Aggregator:** `https://wal-aggregator-testnet.staketab.org`
- **Walrus Scan:** `https://walrus-testnet-explorer.walrus.space`

## Limits

- **Max file size:** ~5 MB (publisher limit)
- **Storage duration:** 5 epochs (default, ~5 days)
- **Timeout:** 60 seconds for upload, 30 seconds for download

## Tips

1. **Large files:** Compress before uploading or split into chunks
2. **Verification:** Always verify blob exists after upload
3. **Tracking:** Use the tracking system to monitor all your blobs
4. **Expiration:** Check expiration dates and re-upload before expiry
5. **Costs:** Monitor storage costs in the analytics dashboard

## Support

For issues or questions:
- Check Walrus Scan for blob status
- Verify network connectivity
- Check browser console for detailed errors
- Try backup aggregator if primary fails
