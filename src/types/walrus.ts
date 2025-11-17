// Walrus Tracking Types
// Comprehensive type definitions for Walrus blob tracking and analytics

/**
 * Content type categories for file classification
 */
export type ContentTypeCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

/**
 * Walrus blob reference
 */
export interface WalrusBlob {
  blobId: string;
  walrusUrl: string;
  originalUrl?: string;
  walrusResponse?: WalrusUploadResponse;
}

/**
 * Blob storage status
 */
export type BlobStatus = 'active' | 'expiring' | 'expired' | 'failed';

/**
 * Blob verification status
 */
export type VerificationStatus = 'verified' | 'failed' | 'pending';

/**
 * Walrus upload response structure
 */
export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
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

/**
 * Image-specific metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string; // 'jpeg', 'png', 'gif', 'webp', etc.
  hasAlpha: boolean;
  exif?: {
    camera?: string;
    dateTaken?: Date;

    location?: {
      lat: number;
      lng: number;
    };
    orientation?: number;
  };
}

/**
 * Video-specific metadata
 */
export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  resolution: string; // '720p', '1080p', '4K', etc.
  codec: string; // 'h264', 'h265', 'vp9', etc.
  bitrate: number;
  frameRate: number;
  audioCodec?: string;
}

/**
 * Audio-specific metadata
 */
export interface AudioMetadata {
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
  codec: string;
}

/**
 * Comprehensive blob metadata for tracking
 */
export interface BlobMetadata {
  // Core identifiers
  blobId: string;
  fileId: string; // Link to Sui FileObject
  objectId: string; // Sui object ID
  
  // File information
  fileName: string;
  originalSize: number; // Size before encryption
  encryptedSize: number; // Size after encryption
  encodedSize: number; // Size after Walrus encoding
  mimeType: string;
  contentType: ContentTypeCategory;
  
  // Walrus specific
  walrusResponse: WalrusUploadResponse;
  storageCost: number; // In SUI tokens
  storageEpochs: number;
  uploadEpoch: number;
  expirationEpoch: number;
  transactionDigest?: string;
  
  // URLs
  aggregatorUrl: string;
  walrusScanUrl: string;
  
  // Timestamps
  uploadedAt: Date;
  expiresAt: Date;
  lastVerified?: Date;
  
  // Status
  status: BlobStatus;
  verificationStatus?: VerificationStatus;
  
  // Content-specific metadata
  imageMetadata?: ImageMetadata;
  videoMetadata?: VideoMetadata;
  audioMetadata?: AudioMetadata;
  
  // Usage tracking
  downloadCount: number;
  lastAccessed?: Date;
  reuseCount: number; // How many files share this blob
  contentHash?: string; // For duplicate detection
}

/**
 * Verification result for a single blob
 */
export interface VerificationResult {
  success: boolean;
  responseTime?: number;
  size?: number;
  error?: string;
}

/**
 * Batch verification report
 */
export interface VerificationReport {
  totalBlobs: number;
  verified: number;
  failed: number;
  pending: number;
  failedBlobs: Array<{
    blobId: string;
    fileName: string;
    error: string;
  }>;
}

/**
 * Storage analytics summary
 */
export interface StorageAnalytics {
  summary: {
    totalBlobs: number;
    totalStorage: number; // bytes
    totalCost: number; // SUI
    activeBlobs: number;
    expiringBlobs: number;
    expiredBlobs: number;
  };
  
  byContentType: Array<{
    type: ContentTypeCategory;
    count: number;
    storage: number;
    cost: number;
    percentage: number;
  }>;
  
  bySizeRange: Array<{
    range: string; // '< 1MB', '1-10MB', etc.
    count: number;
    storage: number;
  }>;
  
  uploadTrend: Array<{
    date: Date;
    count: number;
    storage: number;
    cost: number;
  }>;
  
  topFiles: Array<{
    blobId: string;
    fileName: string;
    size: number;
    percentage: number;
  }>;
  
  costProjection: {
    currentMonthly: number;
    projectedMonthly: number;
    averagePerBlob: number;
    averagePerGB: number;
  };
}

/**
 * Storage optimization recommendation
 */
export interface OptimizationRecommendation {
  type: 'compress' | 'deduplicate' | 'remove_expired' | 'extend_storage';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSavings: number; // in SUI
  affectedBlobs: string[];
  action: () => Promise<void>;
}

/**
 * Storage report for export
 */
export interface StorageReport {
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: StorageAnalytics['summary'];
  details: {
    byContentType: StorageAnalytics['byContentType'];
    topFiles: StorageAnalytics['topFiles'];
    costProjection: StorageAnalytics['costProjection'];
  };
  blobList: Array<{
    fileName: string;
    blobId: string;
    size: number;
    cost: number;
    uploadedAt: Date;
    status: string;
  }>;
}
