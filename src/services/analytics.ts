/**
 * Analytics Service - Aggregate and analyze file storage data
 * Provides insights into storage usage, costs, activity, and sharing statistics
 */

import { FileMetadata, filesService } from './files';
import { shareService } from './share';
import { localFilesService } from './localFiles';
import { storageService } from './storage';

// Cache configuration
const CACHE_KEY = 'walrusbox_analytics_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Walrus pricing (testnet estimates - adjust for mainnet)
const WALRUS_COST_PER_GB_PER_EPOCH = 0.001; // SUI per GB per epoch
const EPOCHS_PER_MONTH = 30; // Approximate epochs per month

export interface TimeSeriesData {
  date: Date;
  count: number;
}

export interface AnalyticsData {
  storage: {
    totalBytes: number;
    fileCount: number;
    folderCount: number;
    byType: Record<string, number>; // MIME type -> bytes
  };
  activity: {
    uploads: TimeSeriesData[];
    downloads: TimeSeriesData[];
    shares: TimeSeriesData[];
  };
  costs: {
    totalSpent: number; // in SUI
    storageEpochs: number;
    transactionFees: number;
    projectedMonthly: number;
  };
  sharing: {
    totalLinks: number;
    activeLinks: number;
    totalAccesses: number;
    topFiles: Array<{ fileId: string; fileName: string; accessCount: number }>;
  };
}

interface CachedAnalytics {
  data: AnalyticsData;
  timestamp: number;
}

export const analyticsService = {
  /**
   * Get comprehensive analytics data with caching
   * @param ownerAddress - Wallet address to analyze
   * @param forceRefresh - Skip cache and fetch fresh data
   * @returns Analytics data
   */
  getAnalytics: async (
    ownerAddress?: string,
    forceRefresh: boolean = false
  ): Promise<AnalyticsData> => {
    // Check cache first
    if (!forceRefresh) {
      const cached = analyticsService.getCachedAnalytics();
      if (cached) {
        console.log('📊 Using cached analytics data');
        return cached;
      }
    }

    console.log('📊 Generating fresh analytics data...');

    // Fetch all necessary data
    const [blockchainFiles, localFiles, shareLinks] = await Promise.all([
      ownerAddress ? filesService.getAllFiles(ownerAddress) : Promise.resolve([]),
      Promise.resolve(localFilesService.getAllFiles()),
      Promise.resolve(shareService.getAllShareLinks()),
    ]);

    // Combine blockchain and local files
    const allFiles = [...blockchainFiles, ...localFiles.map(lf => ({
      id: lf.id,
      file_id: lf.id,
      walrus_object_hash: new Uint8Array(),
      owner: ownerAddress || '',
      visibility: lf.visibility,
      allowedWallets: lf.allowedWallets,
      uploadedAt: lf.uploadedAt,
      fileName: lf.name,
      fileSize: lf.size,
      mimeType: lf.type,
    } as FileMetadata))];

    // Generate analytics
    const analytics: AnalyticsData = {
      storage: analyticsService.calculateStorageStats(allFiles),
      activity: analyticsService.calculateActivityStats(allFiles, shareLinks),
      costs: analyticsService.calculateCosts(allFiles),
      sharing: analyticsService.calculateSharingStats(allFiles, shareLinks),
    };

    // Cache the results
    analyticsService.cacheAnalytics(analytics);

    return analytics;
  },

  /**
   * Calculate storage statistics
   */
  calculateStorageStats: (files: FileMetadata[]): AnalyticsData['storage'] => {
    let totalBytes = 0;
    const byType: Record<string, number> = {};

    files.forEach(file => {
      const size = file.fileSize || 0;
      totalBytes += size;

      const mimeType = file.mimeType || 'unknown';
      byType[mimeType] = (byType[mimeType] || 0) + size;
    });

    // Count folders from localStorage
    const folderCount = analyticsService.getFolderCount();

    return {
      totalBytes,
      fileCount: files.length,
      folderCount,
      byType,
    };
  },

  /**
   * Calculate activity statistics over time
   */
  calculateActivityStats: (
    files: FileMetadata[],
    shareLinks: any[]
  ): AnalyticsData['activity'] => {
    // Group uploads by date (last 30 days)
    const uploads = analyticsService.groupByDate(
      files.map(f => f.uploadedAt),
      30
    );

    // Group shares by date
    const shares = analyticsService.groupByDate(
      shareLinks.map(s => s.createdAt),
      30
    );

    // Downloads are tracked via access logs (if available)
    const downloads = analyticsService.getDownloadActivity(30);

    return {
      uploads,
      downloads,
      shares,
    };
  },

  /**
   * Calculate storage costs
   */
  calculateCosts: (files: FileMetadata[]): AnalyticsData['costs'] => {
    const totalBytes = files.reduce((sum, f) => sum + (f.fileSize || 0), 0);
    const totalGB = totalBytes / (1024 * 1024 * 1024);

    // Estimate storage epochs (assume 5 epochs per file on average)
    const storageEpochs = files.length * 5;

    // Calculate storage cost
    const storageCost = totalGB * WALRUS_COST_PER_GB_PER_EPOCH * storageEpochs;

    // Estimate transaction fees (0.001 SUI per transaction, ~2 transactions per file)
    const transactionFees = files.length * 2 * 0.001;

    const totalSpent = storageCost + transactionFees;

    // Project monthly cost (assuming current usage continues)
    const projectedMonthly = totalGB * WALRUS_COST_PER_GB_PER_EPOCH * EPOCHS_PER_MONTH;

    return {
      totalSpent,
      storageEpochs,
      transactionFees,
      projectedMonthly,
    };
  },

  /**
   * Calculate sharing statistics
   */
  calculateSharingStats: (
    files: FileMetadata[],
    shareLinks: any[]
  ): AnalyticsData['sharing'] => {
    const now = new Date();
    const activeLinks = shareLinks.filter(link => new Date(link.expiresAt) > now);

    const totalAccesses = shareLinks.reduce((sum, link) => sum + (link.accessCount || 0), 0);

    // Group by file and count accesses
    const fileAccessMap = new Map<string, { fileName: string; accessCount: number }>();

    shareLinks.forEach(link => {
      const file = files.find(f => f.id === link.fileId || f.file_id === link.fileId);
      if (file) {
        const fileName = file.fileName || file.file_id || 'Unknown';
        const existing = fileAccessMap.get(link.fileId);
        
        if (existing) {
          existing.accessCount += link.accessCount || 0;
        } else {
          fileAccessMap.set(link.fileId, {
            fileName,
            accessCount: link.accessCount || 0,
          });
        }
      }
    });

    // Sort by access count and get top files
    const topFiles = Array.from(fileAccessMap.entries())
      .map(([fileId, data]) => ({
        fileId,
        fileName: data.fileName,
        accessCount: data.accessCount,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10); // Top 10 files

    return {
      totalLinks: shareLinks.length,
      activeLinks: activeLinks.length,
      totalAccesses,
      topFiles,
    };
  },

  /**
   * Group dates into time series data
   */
  groupByDate: (dates: Date[], days: number): TimeSeriesData[] => {
    const now = new Date();
    const result: TimeSeriesData[] = [];

    // Create buckets for each day
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const count = dates.filter(d => {
        const uploadDate = new Date(d);
        uploadDate.setHours(0, 0, 0, 0);
        return uploadDate.getTime() === date.getTime();
      }).length;

      result.push({ date, count });
    }

    return result;
  },

  /**
   * Get download activity from access logs
   */
  getDownloadActivity: (days: number): TimeSeriesData[] => {
    try {
      const accessLogs = localStorage.getItem('walrusbox_access_logs');
      if (!accessLogs) {
        return analyticsService.groupByDate([], days);
      }

      const logs = JSON.parse(accessLogs);
      const downloadDates = logs
        .filter((log: any) => log.action === 'download')
        .map((log: any) => new Date(log.timestamp));

      return analyticsService.groupByDate(downloadDates, days);
    } catch {
      return analyticsService.groupByDate([], days);
    }
  },

  /**
   * Get folder count from localStorage
   */
  getFolderCount: (): number => {
    try {
      const folders = localStorage.getItem('walrusbox_folders');
      if (!folders) return 0;
      return JSON.parse(folders).length;
    } catch {
      return 0;
    }
  },

  /**
   * Cache analytics data
   */
  cacheAnalytics: (data: AnalyticsData): void => {
    try {
      const cached: CachedAnalytics = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      console.log('💾 Analytics data cached');
    } catch (error) {
      console.error('Failed to cache analytics:', error);
    }
  },

  /**
   * Get cached analytics if still valid
   */
  getCachedAnalytics: (): AnalyticsData | null => {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (!stored) return null;

      const cached: CachedAnalytics = JSON.parse(stored);
      const age = Date.now() - cached.timestamp;

      if (age > CACHE_TTL) {
        console.log('⏰ Analytics cache expired');
        return null;
      }

      // Deserialize dates
      cached.data.activity.uploads = cached.data.activity.uploads.map(d => ({
        ...d,
        date: new Date(d.date),
      }));
      cached.data.activity.downloads = cached.data.activity.downloads.map(d => ({
        ...d,
        date: new Date(d.date),
      }));
      cached.data.activity.shares = cached.data.activity.shares.map(d => ({
        ...d,
        date: new Date(d.date),
      }));

      return cached.data;
    } catch (error) {
      console.error('Failed to get cached analytics:', error);
      return null;
    }
  },

  /**
   * Clear analytics cache
   */
  clearCache: (): void => {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Analytics cache cleared');
  },

  /**
   * Export analytics data as JSON
   */
  exportAnalytics: (data: AnalyticsData): void => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `walrusbox-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 Analytics data exported');
  },

  /**
   * Format bytes for display
   */
  formatBytes: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  },

  /**
   * Format SUI amount for display
   */
  formatSUI: (amount: number): string => {
    return `${amount.toFixed(4)} SUI`;
  },

  /**
   * Get file type category from MIME type
   */
  getFileTypeCategory: (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.startsWith('text/')) return 'Text';
    if (mimeType.includes('pdf')) return 'PDFs';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'Archives';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'Documents';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheets';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentations';
    return 'Other';
  },

  /**
   * Group storage by file type category
   */
  groupStorageByCategory: (byType: Record<string, number>): Record<string, number> => {
    const byCategory: Record<string, number> = {};

    Object.entries(byType).forEach(([mimeType, bytes]) => {
      const category = analyticsService.getFileTypeCategory(mimeType);
      byCategory[category] = (byCategory[category] || 0) + bytes;
    });

    return byCategory;
  },
};
