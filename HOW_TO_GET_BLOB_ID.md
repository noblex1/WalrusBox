# 🔍 How to Get Blob ID - Complete Guide

## 3 Easy Ways to Find Your Blob ID

---

## ✅ **Method 1: Browser Console (Easiest)**

### Steps:
1. **Upload a file** through your app
2. **Open browser console:**
   - Press `F12` or
   - Press `Ctrl + Shift + I` (Windows/Linux) or
   - Press `Cmd + Option + I` (Mac)
3. **Look for the blob ID** in the console output

### What You'll See:
```
🐋 Uploading to Walrus network...
Walrus response: { newlyCreated: { ... } }
✅ New blob created: abc123def456789...
📊 Storage cost: 1000
📦 Encoded size: 2048 bytes
🔗 Walrus URL: https://aggregator.walrus-testnet.walrus.space/v1/abc123...
🔍 Walrus Scan: https://walrus-testnet-explorer.walrus.space/blob/abc123...
💾 Stored metadata for blob: abc123def456789...
```

### The Blob ID:
**The long string after "✅ New blob created:"**

Example: `abc123def456789...`

### Quick Actions:
- **Copy the blob ID** from the console
- **Click the Walrus Scan URL** to view on explorer
- **Click the Walrus URL** to download the blob

---

## 💾 **Method 2: Local Storage (Developer Tools)**

### Steps:
1. **Open DevTools:** Press `F12`
2. **Go to Application tab** (Chrome) or **Storage tab** (Firefox)
3. **Click Local Storage** → `http://localhost:8081`
4. **Look for keys** starting with `walrus_blob_`

### What You'll Find:

**Individual Blob Metadata:**
```
Key: walrus_blob_abc123def456
Value: {
  "blobId": "abc123def456789...",
  "fileName": "document.pdf",
  "fileSize": 2048,
  "fileType": "application/pdf",
  "uploadedAt": "2024-01-01T00:00:00.000Z",
  "walrusUrl": "https://aggregator.walrus-testnet.walrus.space/v1/abc123...",
  "scanUrl": "https://walrus-testnet-explorer.walrus.space/blob/abc123..."
}
```

**List of All Blob IDs:**
```
Key: walrus_blob_list
Value: ["abc123...", "def456...", "ghi789..."]
```

### Quick Actions:
- **Copy the blobId** value
- **Copy the scanUrl** to visit Walrus Scan
- **Copy the walrusUrl** to download the blob

---

## 🌐 **Method 3: Blob List Page (NEW!)**

### Steps:
1. **Visit:** http://localhost:8081/blobs
2. **See all your uploaded blobs** with their IDs
3. **Click "Copy" button** to copy blob ID
4. **Click links** to view on Walrus or Walrus Scan

### Features:
- ✅ See all uploaded blobs
- ✅ View blob IDs
- ✅ Copy blob ID with one click
- ✅ Direct links to Walrus and Walrus Scan
- ✅ File information (name, size, date)
- ✅ Beautiful 3D UI

### Quick Access:
```
http://localhost:8081/blobs
```

---

## 💻 **Method 4: Programmatically (For Developers)**

### Using WalrusBlob Service:

```typescript
import WalrusBlob from '@/services/WalrusBlob';

// Get all blob IDs
const allBlobIds = WalrusBlob.getAllBlobIds();
console.log('All blob IDs:', allBlobIds);
// Output: ["abc123...", "def456...", "ghi789..."]

// Get specific blob metadata
const metadata = WalrusBlob.getBlobMetadata('abc123...');
console.log('Blob ID:', metadata.blobId);
console.log('File Name:', metadata.fileName);
console.log('Scan URL:', metadata.scanUrl);

// Get all blob metadata
const allMetadata = WalrusBlob.getAllBlobMetadata();
allMetadata.forEach(blob => {
  console.log(`File: ${blob.fileName}`);
  console.log(`Blob ID: ${blob.blobId}`);
  console.log(`Scan URL: ${blob.scanUrl}`);
  console.log('---');
});
```

### Using Storage Service:

```typescript
import { storageService } from '@/services/storage';

// After upload
const walrusHash = await storageService.uploadToWalrus(blob, fileName);

// Convert to blob ID string
const blobId = Array.from(walrusHash)
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');

console.log('Blob ID:', blobId);

// Get metadata
const metadata = storageService.getBlobMetadata(blobId);
console.log('Walrus URL:', metadata.walrusUrl);
console.log('Scan URL:', metadata.scanUrl);
```

---

## 🎯 **Quick Test Right Now**

### Test Upload:
1. Go to http://localhost:8081/dashboard
2. Click "Upload" tab
3. Upload any file
4. Open console (F12)
5. See blob ID logged

### View All Blobs:
1. Go to http://localhost:8081/blobs
2. See all your uploaded blobs
3. Copy blob IDs
4. Click links to Walrus Scan

---

## 🔗 **What to Do With Blob ID**

### 1. View on Walrus Scan
```
https://walrus-testnet-explorer.walrus.space/blob/{blobId}
```
Replace `{blobId}` with your actual blob ID.

### 2. Download from Walrus
```
https://aggregator.walrus-testnet.walrus.space/v1/{blobId}
```
Replace `{blobId}` with your actual blob ID.

### 3. Share with Others
- Share the blob ID
- Share the Walrus Scan URL
- Share the Walrus download URL

---

## 📊 **Example Blob ID**

### Format:
```
abc123def456789ghi012jkl345mno678pqr901stu234vwx567yz890
```

### Characteristics:
- **Length:** 64 characters (hex string)
- **Format:** Hexadecimal (0-9, a-f)
- **Unique:** Each file has a unique blob ID
- **Permanent:** Blob ID never changes

---

## ✅ **Verification**

### How to Verify Your Blob ID:

1. **Copy the blob ID** from console or blob list page
2. **Visit Walrus Scan:**
   ```
   https://walrus-testnet-explorer.walrus.space/blob/{blobId}
   ```
3. **You should see:**
   - Blob details
   - Storage information
   - Transaction history
   - Download link

---

## 🚀 **Quick Reference**

### Console Output:
```
✅ New blob created: {BLOB_ID_HERE}
🔍 Walrus Scan: {SCAN_URL_HERE}
```

### Local Storage Key:
```
walrus_blob_{BLOB_ID}
```

### Blob List Page:
```
http://localhost:8081/blobs
```

### Walrus Scan URL:
```
https://walrus-testnet-explorer.walrus.space/blob/{BLOB_ID}
```

---

## 🎉 **Summary**

**Easiest Way:** Open console (F12) after uploading a file

**Most Convenient:** Visit http://localhost:8081/blobs

**For Developers:** Use WalrusBlob.getAllBlobIds()

**To Verify:** Visit Walrus Scan with your blob ID

---

## 📞 **Need Help?**

### If you don't see blob ID in console:
1. Make sure you uploaded a file
2. Check console is open (F12)
3. Look for "✅ New blob created:" message
4. Scroll up if needed

### If blob list page is empty:
1. Upload a file first
2. Refresh the page
3. Check localStorage in DevTools

### If Walrus Scan doesn't work:
1. Verify blob ID is correct
2. Check you're using testnet URL
3. Wait a few seconds for propagation

---

**You now have 4 different ways to get your blob ID! Choose the one that works best for you.** 🎉

---

**Last Updated:** [Current Date]
**Status:** ✅ COMPLETE
**Methods:** 4 ways to get blob ID
**New Feature:** Blob List Page at /blobs
