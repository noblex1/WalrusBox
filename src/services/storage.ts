// Walrus Storage Service - Decentralized object storage for encrypted files
// Uses fetch API to interact with Walrus storage endpoint
// Falls back to IndexedDB for local testing when Walrus is unavailable

// Walrus API endpoint configuration
const WALRUS_ENDPOINT = import.meta.env.VITE_WALRUS_ENDPOINT || 'https://walrus-api.example.com';
const USE_MOCK_STORAGE = WALRUS_ENDPOINT.includes('example.com'); // Auto-detect mock mode

/**
 * Upload encrypted file blob to Walrus and return object hash (CID-like reference)
 * @param blob - Encrypted file blob
 * @param fileName - Original file name
 * @returns Walrus object hash (vector<u8> format for Sui contract)
 */
export class StorageService {
  /**
   * Upload encrypted blob to Walrus
   * @param blob - Encrypted file blob
   * @param fileName - Original file name (for metadata)
   * @returns Object hash as Uint8Array (for Sui contract)
   */
  async uploadToWalrus(blob: Blob, fileName: string): Promise<Uint8Array> {
    // Use mock storage for local testing if Walrus endpoint is not configured
    if (USE_MOCK_STORAGE) {
      console.log('📦 Using mock storage (IndexedDB) for local testing');
      return await this.uploadToMockStorage(blob, fileName);
    }

    try {
      console.log('🐋 Uploading to Walrus network...');
      
      // Walrus HTTP API uses PUT method with binary data
      // Endpoint: /v1/store?epochs=<number>
      const epochs = 5; // Store for 5 epochs (adjust as needed)
      const response = await fetch(`${WALRUS_ENDPOINT}/v1/store?epochs=${epochs}`, {
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
      
      // Walrus returns either newlyCreated or alreadyCertified
      // Extract blob ID from the response
      let blobId: string;
      
      if (result.newlyCreated) {
        blobId = result.newlyCreated.blobObject.blobId;
        console.log('✅ New blob created:', blobId);
        console.log(`📊 Storage cost: ${result.newlyCreated.cost}`);
        console.log(`📦 Encoded size: ${result.newlyCreated.encodedSize} bytes`);
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
      
      // Store blob ID metadata for tracking
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
      const aggregatorEndpoint = WALRUS_ENDPOINT.replace('publisher', 'aggregator');
      const response = await fetch(`${aggregatorEndpoint}/v1/${blobId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Walrus download error:', errorText);
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Downloaded from Walrus');
      
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
   * Store blob metadata for tracking and Walrus Scan integration
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
    // Convert bytes to hex string
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
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
