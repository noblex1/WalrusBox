// Walrus Service - Direct integration with Walrus network
// Handles file uploads, downloads, and blob management

import axios from 'axios';
import type { WalrusBlob } from '@/types/walrus';

// Working Walrus testnet endpoints - Updated January 2025
// Publisher: Tudor's endpoint with confirmed CORS support
// Aggregator: Multiple fallback options
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-01.tududes.com';
const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
const BACKUP_AGGREGATOR_URL = 'https://wal-aggregator-testnet.staketab.org';

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string;
      blobId: string;
      storage: {
        id: string;
        startEpoch: string;
        endEpoch: string;
      };
      encodedSize: string;
    };
    encodedLength: string;
    cost: string;
  };
  alreadyCertified?: {
    blobId: string;
    event: {
      txDigest: string;
      eventSeq: string;
    };
    endEpoch: string;
  };
}

export class WalrusService {
  /**
   * Upload a file directly to Walrus
   * @param file The file to upload
   * @param userAddress The user's Sui address to own the resulting blob object
   * @param epochs Number of epochs to store (default: 5)
   */
  static async uploadFile(
    file: File,
    userAddress?: string,
    epochs: number = 5
  ): Promise<WalrusBlob> {
    try {
      console.log(`🐋 Uploading ${file.name} to Walrus...`);
      
      // Convert file to raw binary data
      const fileData = await file.arrayBuffer();
      
      // Construct URL with send_object_to parameter if userAddress is provided
      let uploadUrl = `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${epochs}`;
      if (userAddress) {
        uploadUrl += `&send_object_to=${userAddress}`;
      }
      
      const response = await axios.put<WalrusUploadResponse>(
        uploadUrl,
        fileData,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          // Add timeout for large files
          timeout: 60000, // 60 seconds
        }
      );
      
      // Extract blob ID from response
      const blobId = response.data.newlyCreated?.blobObject.blobId || 
                     response.data.alreadyCertified?.blobId;
      
      if (!blobId) {
        throw new Error('Failed to get blob ID from Walrus response');
      }
      
      console.log(`✅ Uploaded to Walrus: ${blobId}`);
      
      return {
        blobId,
        walrusUrl: this.getBlobUrl(blobId),
        walrusResponse: response.data
      };
    } catch (error) {
      console.error('Walrus upload failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 413) {
          throw new Error(
            'File too large for Walrus publisher (HTTP 413). Max ~5 MB. Please compress or choose a smaller file.'
          );
        }
        
        // Check for specific error types
        if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
          throw new Error(
            'Network error: Unable to connect to Walrus. Please check your internet connection and try again.'
          );
        }
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error(
            'Upload timeout: The file is too large or the connection is slow. Please try again.'
          );
        }
        
        if (error.response?.status === 403) {
          throw new Error(
            'Access denied: CORS or authentication error. Please contact support.'
          );
        }
        
        if (error.response?.status === 404) {
          throw new Error(
            'Service unavailable: Walrus endpoint not found. The service may be temporarily down.'
          );
        }
        
        if (error.response && error.response.status >= 500) {
          throw new Error(
            'Server error: Walrus service is experiencing issues. Please try again later.'
          );
        }
        
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to upload to Walrus: ${message}`);
      }
      
      throw new Error(
        `Failed to upload to Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  /**
   * Download a blob from Walrus by blob ID
   * @param blobId The Walrus blob ID
   * @param useBackup Whether to use backup aggregator
   */
  static async downloadBlob(blobId: string, useBackup: boolean = false): Promise<Blob> {
    try {
      const aggregatorUrl = useBackup ? BACKUP_AGGREGATOR_URL : WALRUS_AGGREGATOR_URL;
      const url = `${aggregatorUrl}/v1/${blobId}`;
      
      console.log(`🐋 Downloading blob ${blobId} from Walrus...`);
      
      const response = await axios.get(url, {
        responseType: 'blob',
        timeout: 30000, // 30 seconds
      });
      
      console.log(`✅ Downloaded blob ${blobId}`);
      
      return response.data;
    } catch (error) {
      console.error('Walrus download failed:', error);
      
      // Try backup aggregator if primary fails
      if (!useBackup) {
        console.log('⚠️ Trying backup aggregator...');
        return this.downloadBlob(blobId, true);
      }
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Blob not found on Walrus network. It may have expired or been deleted.');
        }
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('Download timeout: The blob is too large or the connection is slow.');
        }
        
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to download from Walrus: ${message}`);
      }
      
      throw new Error(
        `Failed to download from Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  /**
   * Verify if a blob exists on Walrus
   * @param blobId The Walrus blob ID
   */
  static async verifyBlob(blobId: string): Promise<boolean> {
    try {
      const url = `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`;
      
      const response = await axios.head(url, {
        timeout: 10000, // 10 seconds
      });
      
      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      
      // Try backup aggregator
      try {
        const backupUrl = `${BACKUP_AGGREGATOR_URL}/v1/${blobId}`;
        const response = await axios.head(backupUrl, {
          timeout: 10000,
        });
        return response.status === 200;
      } catch {
        return false;
      }
    }
  }
  
  /**
   * Get the full URL for a blob
   * @param blobId The Walrus blob ID
   */
  static getBlobUrl(blobId: string): string {
    return `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`;
  }
  
  /**
   * Get the Walrus Scan URL for a blob
   * @param blobId The Walrus blob ID
   */
  static getWalrusScanUrl(blobId: string): string {
    return `https://walrus-testnet-explorer.walrus.space/blob/${blobId}`;
  }
  
  /**
   * Check if a URL is a Walrus URL
   * @param url The URL to check
   */
  static isWalrusUrl(url: string): boolean {
    return url.includes('walrus') && url.includes('/v1/');
  }
  
  /**
   * Extract blob ID from a Walrus URL
   * @param url The Walrus URL
   */
  static extractBlobId(url: string): string | null {
    const match = url.match(/\/v1\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }
  
  /**
   * Fetch content from URL and upload to Walrus
   * Note: This method may fail due to CORS restrictions when fetching from external URLs
   * @param url The URL to fetch and upload
   * @param userAddress The user's Sui address to own the resulting blob object
   */
  static async uploadFromUrl(url: string, userAddress?: string): Promise<WalrusBlob> {
    try {
      // First, check if this is already a Walrus URL
      if (this.isWalrusUrl(url)) {
        const blobId = this.extractBlobId(url);
        if (blobId) {
          return {
            blobId,
            walrusUrl: this.getBlobUrl(blobId),
            originalUrl: url
          };
        }
      }
      
      // Fetch the content
      console.log(`📥 Fetching content from ${url}...`);
      const response = await axios.get(url, {
        responseType: 'blob',
        timeout: 30000,
      });
      
      // Convert blob to File
      const filename = url.split('/').pop() || 'downloaded-file';
      const file = new File([response.data], filename, {
        type: response.headers['content-type'] || 'application/octet-stream'
      });
      
      // Upload to Walrus
      const result = await this.uploadFile(file, userAddress);
      
      return {
        ...result,
        originalUrl: url
      };
    } catch (error) {
      console.error('Failed to upload from URL:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.message.includes('CORS')) {
          throw new Error(
            'CORS error: Cannot fetch from this URL due to browser security restrictions. Please download the file and upload it directly.'
          );
        }
        
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to fetch and upload: ${message}`);
      }
      
      throw new Error(
        `Failed to upload from URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  /**
   * Get blob metadata from Walrus (if available)
   * @param blobId The Walrus blob ID
   */
  static async getBlobMetadata(blobId: string): Promise<{
    size?: number;
    contentType?: string;
    exists: boolean;
  }> {
    try {
      const url = `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`;
      
      const response = await axios.head(url, {
        timeout: 10000,
      });
      
      return {
        size: response.headers['content-length'] 
          ? parseInt(response.headers['content-length']) 
          : undefined,
        contentType: response.headers['content-type'],
        exists: true
      };
    } catch (error) {
      return {
        exists: false
      };
    }
  }
}

// Export singleton instance
export const walrusService = WalrusService;
