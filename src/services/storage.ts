// Walrus Storage Service - Decentralized object storage for encrypted files
// Uses fetch API to interact with Walrus storage endpoint
// Falls back to IndexedDB for local testing when Walrus is unavailable

import type { BlobMetadata, WalrusUploadResponse, ContentTypeCategory, ImageMetadata, VideoMetadata, AudioMetadata } from '@/types/walrus';
import { blobTrackingService } from './blobTracking';
import { imageProcessor, videoProcessor, audioProcessor } from './contentProcessors';

// Walrus API endpoint configuration - Updated January 2025
// Using Tudor's working endpoint with CORS support
const WALRUS_PUBLISHER_URL = import.meta.env.VITE_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-01.tududes.com';
const WALRUS_AGGREGATOR_URL = import.meta.env.VITE_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
const WALRUS_ENDPOINT = WALRUS_PUBLISHER_URL; // For backward compatibility
const USE_MOCK_STORAGE = WALRUS_ENDPOINT.includes('example.com'); // Auto-detect mock mode

/**
 * Upload encrypted file blob to Walrus and return object hash (CID-like reference)
 * @param blob - Encrypted file blob
 * @param fileName - Original file name
 * @returns Walrus object hash (vector<u8> format for Sui contract)
 */
export class StorageService {
  private lastWalrusResponse: WalrusUploadResponse | null = null;
  private lastOriginalSize: number = 0;
  private lastOriginalFile: File | null = null;

  /**
   * Upload encrypted blob to Walrus
   * @param blob - Encrypted file blob
   * @param fileName - Original file name (for metadata)
   * @param originalSize - Size before encryption (optional)
   * @param originalFile - Original file before encryption (for metadata extraction)
   * @returns Object hash as Uint8Array (for Sui contract)
   */
  async uploadToWalrus(blob: Blob, fileName: string, originalSize?: number, originalFile?: File): Promise<Uint8Array> {
    // Store original size and file for tracking
    this.lastOriginalSize = originalSize || blob.size;
    this.lastOriginalFile = originalFile || null;
    // Use mock storage for local testing if Walrus endpoint is not configured
    if (USE_MOCK_STORAGE) {
      console.log('📦 Using mock storage (IndexedDB) for local testing');
      return await this.uploadToMockStorage(blob, fileName);
    }

    try {
      console.log('🐋 Uploading to Walrus network...');
      
      // Walrus HTTP API uses PUT method with binary data
      // Endpoint: /v1/blobs?epochs=<number>
      const epochs = 5; // Store for 5 epochs (adjust as needed)
      const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${epochs}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: blob, // Send blob directly as binary data
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Walrus API error:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Walrus response:', result);
      
      // Store response for tracking
      this.lastWalrusResponse = result;
      
      // Walrus returns either newlyCreated or alreadyCertified
      // Extract blob ID from the response
      let blobId: string;
      
      if (result.newlyCreated) {
        blobId = result.newlyCreated.blobObject.blobId;
        console.log('✅ New blob created:', blobId);
        console.log(`📊 Storage cost: ${result.newlyCreated.cost}`);
        console.log(`📦 Encoded size: ${result.newlyCreated.encodedLength} bytes`);
        console.log(`🔗 Walrus URL: https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`);
        console.log(`🔍 Walrus Scan: https://walrus-testnet-explorer.walrus.space/blob/${blobId}`);
      } else if (result.alreadyCertified) {
        blobId = result.alreadyCertified.blobId;
        console.log('✅ Blob already exists:', blobId);
        console.log(`📝 Transaction: ${result.alreadyCertified.event.txDigest}`);
        console.log(`🔗 Walrus URL: https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`);
        console.log(`🔍 Walrus Scan: https://walrus-testnet-explorer.walrus.space/blob/${blobId}`);
      } else {
        throw new Error('Unexpected Walrus response format');
      }
      
      // Track comprehensive blob metadata
      await this.trackBlobMetadata(blobId, fileName, blob.size, blob.type, result, epochs);
      
      // Store blob ID metadata for tracking (legacy)
      this.storeBlobMetadata(blobId, fileName, blob.size, blob.type);
      
      // Convert blob ID to Uint8Array for Sui contract
      const hashBytes = this.hashToBytes(blobId);
      
      return hashBytes;
    } catch (error) {
      console.error('Walrus upload error:', error);
      
      // If Walrus fails, fall back to mock storage
      console.warn('⚠️ Walrus upload failed, falling back to mock storage');
      return await this.uploadToMockStorage(blob, fileName);
    }
  }

  /**
   * Mock storage upload (uses IndexedDB for local testing)
   * @param blob - Encrypted file blob
   * @param fileName - Original file name
   * @returns Mock hash as Uint8Array
   */
  private async uploadToMockStorage(blob: Blob, fileName: string): Promise<Uint8Array> {
    try {
      // Initialize IndexedDB if needed
      if (!this.db) await this.init();

      // Generate a unique hash for this file
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const mockHash = `mock_${timestamp}_${random}`;

      // Store blob in IndexedDB
      await this.storeBlob(mockHash, blob);

      // Store metadata
      const metadata = {
        fileName,
        contentType: blob.type,
        size: blob.size,
        uploadedAt: new Date().toISOString(),
      };
      localStorage.setItem(`metadata_${mockHash}`, JSON.stringify(metadata));

      console.log(`✅ Mock upload successful: ${mockHash}`);

      // Convert hash to Uint8Array
      return this.hashToBytes(mockHash);
    } catch (error) {
      console.error('Mock storage upload error:', error);
      throw new Error('Failed to upload file to mock storage');
    }
  }

  /**
   * Download file from Walrus using object hash
   * @param objectHash - Walrus object hash (from Sui contract)
   * @returns File blob
   */
  async downloadFromWalrus(objectHash: Uint8Array): Promise<Blob> {
    // Convert Uint8Array back to hash string (blob ID)
    const blobId = this.bytesToHash(objectHash);

    // Use mock storage for local testing
    if (USE_MOCK_STORAGE || blobId.startsWith('mock_')) {
      console.log('📦 Using mock storage (IndexedDB) for download');
      return await this.downloadFromMockStorage(blobId);
    }

    try {
      console.log('🐋 Downloading from Walrus network...');
      
      // Walrus HTTP API download endpoint: /v1/{blob_id}
      // Use aggregator endpoint for downloads
      const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/${blobId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Walrus download error:', errorText);
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Downloaded from Walrus');
      
      // Track download
      await this.trackDownload(blobId);
      
      // Return as blob
      return await response.blob();
    } catch (error) {
      console.error('Walrus download error:', error);
      
      // Try to fall back to mock storage if available
      try {
        console.warn('⚠️ Trying mock storage fallback...');
        return await this.downloadFromMockStorage(blobId);
      } catch {
        throw new Error('Failed to download file from Walrus storage');
      }
    }
  }

  /**
   * Mock storage download (uses IndexedDB for local testing)
   * @param hashString - Mock hash string
   * @returns File blob
   */
  private async downloadFromMockStorage(hashString: string): Promise<Blob> {
    try {
      // Initialize IndexedDB if needed
      if (!this.db) await this.init();

      // Retrieve blob from IndexedDB
      const blob = await this.getBlob(hashString);
      
      if (!blob) {
        throw new Error('File not found in mock storage');
      }

      console.log(`✅ Mock download successful: ${hashString}`);
      return blob;
    } catch (error) {
      console.error('Mock storage download error:', error);
      throw new Error('Failed to download file from mock storage');
    }
  }

  /**
   * Delete file from Walrus (if supported)
   * @param objectHash - Walrus object hash
   */
  async deleteFromWalrus(objectHash: Uint8Array): Promise<void> {
    const hashString = this.bytesToHash(objectHash);

    // Use mock storage for local testing
    if (USE_MOCK_STORAGE || hashString.startsWith('mock_')) {
      console.log('📦 Using mock storage (IndexedDB) for delete');
      await this.deleteFromMockStorage(hashString);
      return;
    }

    try {
      const response = await fetch(`${WALRUS_ENDPOINT}/delete/${hashString}`, {
        method: 'DELETE',
        // Note: In production, you may need to add authentication headers
        // headers: {
        //   'Authorization': `Bearer ${token}`,
        // },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Walrus delete error:', error);
      throw new Error('Failed to delete file from Walrus storage');
    }
  }

  /**
   * Mock storage delete (uses IndexedDB for local testing)
   * @param hashString - Mock hash string
   */
  private async deleteFromMockStorage(hashString: string): Promise<void> {
    try {
      // Initialize IndexedDB if needed
      if (!this.db) await this.init();

      // Delete blob from IndexedDB
      await this.deleteBlob(hashString);

      // Delete metadata
      localStorage.removeItem(`metadata_${hashString}`);

      console.log(`✅ Mock delete successful: ${hashString}`);
    } catch (error) {
      console.error('Mock storage delete error:', error);
      throw new Error('Failed to delete file from mock storage');
    }
  }

  /**
   * Track comprehensive blob metadata using new tracking system
   */
  private async trackBlobMetadata(
    blobId: string,
    fileName: string,
    encryptedSize: number,
    mimeType: string,
    walrusResponse: WalrusUploadResponse,
    storageEpochs: number
  ): Promise<void> {
    try {
      // Extract data from Walrus response
      let storageCost = 0;
      let encodedSize = encryptedSize;
      let uploadEpoch = 0;
      let expirationEpoch = storageEpochs;
      let transactionDigest: string | undefined;

      if (walrusResponse.newlyCreated) {
        storageCost = parseFloat(walrusResponse.newlyCreated.cost);
        encodedSize = parseInt(walrusResponse.newlyCreated.encodedLength);
        uploadEpoch = parseInt(walrusResponse.newlyCreated.blobObject.storage.startEpoch);
        expirationEpoch = parseInt(walrusResponse.newlyCreated.blobObject.storage.endEpoch);
      } else if (walrusResponse.alreadyCertified) {
        transactionDigest = walrusResponse.alreadyCertified.event.txDigest;
        expirationEpoch = parseInt(walrusResponse.alreadyCertified.endEpoch);
      }

      // Calculate expiration date (approximate: 1 epoch = 1 day)
      const epochDurationMs = 24 * 60 * 60 * 1000; // 1 day in milliseconds
      const expiresAt = new Date(Date.now() + (expirationEpoch - uploadEpoch) * epochDurationMs);

      // Extract content-specific metadata
      let imageMetadata: ImageMetadata | undefined;
      let videoMetadata: VideoMetadata | undefined;
      let audioMetadata: AudioMetadata | undefined;

      if (this.lastOriginalFile) {
        const contentType = this.categorizeContentType(mimeType);
        
        if (contentType === 'image') {
          console.log('📸 Extracting image metadata...');
          imageMetadata = await imageProcessor.extractMetadata(this.lastOriginalFile);
        } else if (contentType === 'video') {
          console.log('🎥 Extracting video metadata...');
          videoMetadata = await videoProcessor.extractMetadata(this.lastOriginalFile);
        } else if (contentType === 'audio') {
          console.log('🎵 Extracting audio metadata...');
          audioMetadata = await audioProcessor.extractMetadata(this.lastOriginalFile);
        }
      }

      // Create blob metadata
      const metadata: BlobMetadata = {
        blobId,
        fileId: '', // Will be set after FileObject creation
        objectId: '', // Will be set after FileObject creation
        fileName,
        originalSize: this.lastOriginalSize,
        encryptedSize,
        encodedSize,
        mimeType,
        contentType: this.categorizeContentType(mimeType),
        walrusResponse,
        storageCost,
        storageEpochs,
        uploadEpoch,
        expirationEpoch,
        transactionDigest,
        aggregatorUrl: `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`,
        walrusScanUrl: `https://walrus-testnet-explorer.walrus.space/blob/${blobId}`,
        uploadedAt: new Date(),
        expiresAt,
        status: 'active',
        imageMetadata,
        videoMetadata,
        audioMetadata,
        downloadCount: 0,
        reuseCount: 0
      };

      // Track in new system
      await blobTrackingService.trackBlob(metadata);
    } catch (error) {
      console.error('Failed to track blob metadata:', error);
      // Don't throw - tracking failure shouldn't break upload
    }
  }

  /**
   * Categorize MIME type into content type category
   */
  private categorizeContentType(mimeType: string): ContentTypeCategory {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive';
    return 'other';
  }

  /**
   * Get last Walrus response (for external use)
   */
  getLastWalrusResponse(): WalrusUploadResponse | null {
    return this.lastWalrusResponse;
  }

  /**
   * Track blob download
   */
  private async trackDownload(blobId: string): Promise<void> {
    try {
      const metadata = await blobTrackingService.getBlobMetadata(blobId);
      if (metadata) {
        await blobTrackingService.updateBlobMetadata(blobId, {
          downloadCount: metadata.downloadCount + 1,
          lastAccessed: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to track download:', error);
      // Don't throw - tracking failure shouldn't break download
    }
  }

  /**
   * Store blob metadata for tracking and Walrus Scan integration (legacy)
   * @param blobId - Walrus blob ID
   * @param fileName - Original file name
   * @param fileSize - File size in bytes
   * @param fileType - MIME type
   */
  private storeBlobMetadata(blobId: string, fileName: string, fileSize: number, fileType: string): void {
    try {
      const metadata = {
        blobId,
        fileName,
        fileSize,
        fileType,
        uploadedAt: new Date().toISOString(),
        walrusUrl: `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`,
        scanUrl: `https://walrus-testnet-explorer.walrus.space/blob/${blobId}`,
      };

      // Store individual blob metadata
      localStorage.setItem(`walrus_blob_${blobId}`, JSON.stringify(metadata));

      // Maintain a list of all blob IDs
      const blobList = this.getAllBlobIds();
      if (!blobList.includes(blobId)) {
        blobList.push(blobId);
        localStorage.setItem('walrus_blob_list', JSON.stringify(blobList));
      }

      console.log(`💾 Stored metadata for blob: ${blobId}`);
    } catch (error) {
      console.error('Failed to store blob metadata:', error);
    }
  }

  /**
   * Get all stored blob IDs
   * @returns Array of blob IDs
   */
  private getAllBlobIds(): string[] {
    try {
      const data = localStorage.getItem('walrus_blob_list');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get blob metadata by ID
   * @param blobId - Walrus blob ID
   * @returns Blob metadata or null
   */
  getBlobMetadata(blobId: string): any {
    try {
      const data = localStorage.getItem(`walrus_blob_${blobId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Convert hash string to Uint8Array for Sui contract
   * @param hash - Hash string (hex or base58)
   * @returns Uint8Array
   */
  private hashToBytes(hash: string): Uint8Array {
    // If hash is hex string, convert to bytes
    if (hash.startsWith('0x')) {
      hash = hash.slice(2);
    }
    
    // Try hex decoding first
    if (/^[0-9a-fA-F]+$/.test(hash) && hash.length % 2 === 0) {
      const bytes = new Uint8Array(hash.length / 2);
      for (let i = 0; i < hash.length; i += 2) {
        bytes[i / 2] = parseInt(hash.substr(i, 2), 16);
      }
      return bytes;
    }
    
    // Otherwise, convert string to UTF-8 bytes
    return new TextEncoder().encode(hash);
  }

  /**
   * Convert Uint8Array back to hash string
   * @param bytes - Hash bytes
   * @returns Hash string
   */
  private bytesToHash(bytes: Uint8Array): string {
    // Try to decode as UTF-8 string first (for blob IDs stored as text)
    try {
      const decoded = new TextDecoder().decode(bytes);
      // Check if it looks like a valid blob ID (contains alphanumeric and special chars)
      if (decoded && /^[A-Za-z0-9_\-]+$/.test(decoded)) {
        console.log('📝 Decoded blob ID as UTF-8:', decoded);
        return decoded;
      }
    } catch (e) {
      // If UTF-8 decoding fails, fall through to hex
    }
    
    // Fall back to hex string for binary data
    const hexString = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    console.log('📝 Converted bytes to hex:', hexString);
    return hexString;
  }

  /**
   * Legacy IndexedDB methods for backward compatibility during migration
   * These can be removed once fully migrated to Walrus
   */
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'web3_file_storage';
  private readonly STORE_NAME = 'files';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async storeBlob(id: string, blob: Blob): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put({ id, blob });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a file to IndexedDB for caching (convenience method)
   * @param id - File/object ID
   * @param file - File object to cache
   */
  async saveToIndexedDB(id: string, file: File): Promise<void> {
    return this.storeBlob(id, file);
  }

  async getBlob(id: string): Promise<Blob | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBlob(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const storageService = new StorageService();
