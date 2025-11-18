// Seal Error Recovery
// Error recovery mechanisms with retry logic and fallback strategies

import { SealError, SealErrorType, RetryConfig } from './sealTypes';
import { sealErrorHandler } from './sealErrorHandler';
import { sealClient } from './sealClient';

/**
 * Default retry configuration with exponential backoff
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    SealErrorType.NETWORK_ERROR,
    SealErrorType.RPC_ERROR,
    SealErrorType.UPLOAD_ERROR,
    SealErrorType.DOWNLOAD_ERROR,
    SealErrorType.TIMEOUT_ERROR
  ]
};

/**
 * Partial upload state for recovery
 */
export interface PartialUploadState {
  fileId: string;
  fileName: string;
  totalChunks: number;
  uploadedChunks: Array<{
    index: number;
    blobId: string;
    objectId: string;
    transactionDigest: string;
  }>;
  failedChunks: number[];
  encryptionKey?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Recovery state manager
 */
class RecoveryStateManager {
  private static readonly STORAGE_KEY = 'seal_recovery_state';

  /**
   * Save partial upload state
   * @param state - Partial upload state
   */
  static saveUploadState(state: PartialUploadState): void {
    try {
      const existing = this.getAllUploadStates();
      existing[state.fileId] = state;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
      console.log('💾 Saved recovery state for:', state.fileName);
    } catch (error) {
      console.error('Failed to save recovery state:', error);
    }
  }

  /**
   * Get partial upload state
   * @param fileId - File ID
   * @returns Partial upload state or null
   */
  static getUploadState(fileId: string): PartialUploadState | null {
    try {
      const states = this.getAllUploadStates();
      return states[fileId] || null;
    } catch (error) {
      console.error('Failed to get recovery state:', error);
      return null;
    }
  }

  /**
   * Get all upload states
   * @returns Map of file ID to upload state
   */
  static getAllUploadStates(): Record<string, PartialUploadState> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return {};
      
      const states = JSON.parse(stored);
      
      // Convert timestamp strings back to Date objects
      Object.values(states).forEach((state: any) => {
        state.timestamp = new Date(state.timestamp);
      });
      
      return states;
    } catch (error) {
      console.error('Failed to get all recovery states:', error);
      return {};
    }
  }

  /**
   * Remove upload state
   * @param fileId - File ID
   */
  static removeUploadState(fileId: string): void {
    try {
      const states = this.getAllUploadStates();
      delete states[fileId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(states));
      console.log('🗑️ Removed recovery state for:', fileId);
    } catch (error) {
      console.error('Failed to remove recovery state:', error);
    }
  }

  /**
   * Clear old recovery states (older than 24 hours)
   */
  static clearOldStates(): void {
    try {
      const states = this.getAllUploadStates();
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      let cleared = 0;
      Object.entries(states).forEach(([fileId, state]) => {
        const age = now - state.timestamp.getTime();
        if (age > maxAge) {
          delete states[fileId];
          cleared++;
        }
      });

      if (cleared > 0) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(states));
        console.log(`🗑️ Cleared ${cleared} old recovery states`);
      }
    } catch (error) {
      console.error('Failed to clear old recovery states:', error);
    }
  }
}

/**
 * Error recovery service
 */
export class SealErrorRecovery {
  /**
   * Execute operation with retry logic and exponential backoff
   * @param operation - Operation to execute
   * @param config - Retry configuration
   * @param operationName - Name for logging
   * @returns Operation result
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = config.initialDelay;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Execute operation
        const result = await operation();
        
        // Log success if this was a retry
        if (attempt > 0) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const sealError = sealErrorHandler.toSealError(error);
        
        // Check if error is retryable
        const isRetryable = this.isRetryableError(sealError, config);
        
        // If not retryable or last attempt, handle final failure
        if (!isRetryable || attempt === config.maxRetries) {
          console.error(`❌ ${operationName} failed after ${attempt + 1} attempts:`, lastError);
          
          // Try RPC fallback for RPC errors
          if (sealError.type === SealErrorType.RPC_ERROR && sealClient.isInitialized()) {
            console.log('🔄 Attempting RPC fallback...');
            try {
              await this.attemptRpcFallback();
              
              // Retry operation one more time with fallback RPC
              console.log(`🔄 Retrying ${operationName} with fallback RPC...`);
              return await operation();
            } catch (fallbackError) {
              console.error('❌ RPC fallback also failed:', fallbackError);
              throw sealError;
            }
          }
          
          throw sealError;
        }

        // Log retry attempt
        console.warn(
          `⚠️ ${operationName} failed (attempt ${attempt + 1}/${config.maxRetries + 1}), ` +
          `retrying in ${delay}ms...`,
          { error: lastError.message, type: sealError.type }
        );

        // Wait before retry
        await this.sleep(delay);

        // Exponential backoff
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }

    throw lastError || new Error(`${operationName} failed after retries`);
  }

  /**
   * Resume partial upload from saved state
   * @param fileId - File ID to resume
   * @param uploadChunkFn - Function to upload a single chunk
   * @returns Completed upload result
   */
  static async resumePartialUpload<T>(
    fileId: string,
    uploadChunkFn: (chunkIndex: number) => Promise<{
      blobId: string;
      objectId: string;
      transactionDigest: string;
    }>
  ): Promise<{
    resumed: boolean;
    uploadedChunks: Array<{
      index: number;
      blobId: string;
      objectId: string;
      transactionDigest: string;
    }>;
  }> {
    const state = RecoveryStateManager.getUploadState(fileId);
    
    if (!state) {
      return { resumed: false, uploadedChunks: [] };
    }

    console.log(`🔄 Resuming upload for ${state.fileName}:`, {
      totalChunks: state.totalChunks,
      uploaded: state.uploadedChunks.length,
      failed: state.failedChunks.length
    });

    const uploadedChunks = [...state.uploadedChunks];

    // Upload failed chunks
    for (const chunkIndex of state.failedChunks) {
      try {
        console.log(`📤 Uploading failed chunk ${chunkIndex + 1}/${state.totalChunks}...`);
        
        const result = await this.withRetry(
          () => uploadChunkFn(chunkIndex),
          DEFAULT_RETRY_CONFIG,
          `chunk ${chunkIndex + 1}`
        );

        uploadedChunks.push({
          index: chunkIndex,
          ...result
        });

        // Update recovery state
        state.uploadedChunks = uploadedChunks;
        state.failedChunks = state.failedChunks.filter(i => i !== chunkIndex);
        RecoveryStateManager.saveUploadState(state);
        
        console.log(`✅ Chunk ${chunkIndex + 1} uploaded successfully`);
      } catch (error) {
        console.error(`❌ Failed to upload chunk ${chunkIndex + 1}:`, error);
        throw sealErrorHandler.toSealError(
          error,
          SealErrorType.UPLOAD_ERROR,
          { chunkIndex, fileId }
        );
      }
    }

    // Clear recovery state on success
    RecoveryStateManager.removeUploadState(fileId);

    console.log(`✅ Upload resumed and completed for ${state.fileName}`);

    return {
      resumed: true,
      uploadedChunks: uploadedChunks.sort((a, b) => a.index - b.index)
    };
  }

  /**
   * Attempt RPC endpoint fallback
   */
  private static async attemptRpcFallback(): Promise<void> {
    try {
      await sealClient.withRpcFallback(async () => {
        // Just test the connection
        return Promise.resolve();
      });
    } catch (error) {
      throw new SealError(
        SealErrorType.RPC_ERROR,
        'All RPC endpoints failed',
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Check if error is retryable based on configuration
   * @param error - Error to check
   * @param config - Retry configuration
   * @returns True if retryable
   */
  private static isRetryableError(error: SealError, config: RetryConfig): boolean {
    // Check if error type is in retryable list
    if (config.retryableErrors && !config.retryableErrors.includes(error.type)) {
      return false;
    }

    // Check error's retryable flag
    return error.retryable;
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get list of recoverable uploads
   * @returns Array of partial upload states
   */
  static getRecoverableUploads(): PartialUploadState[] {
    const states = RecoveryStateManager.getAllUploadStates();
    return Object.values(states).filter(state => state.failedChunks.length > 0);
  }

  /**
   * Clear all recovery states
   */
  static clearAllRecoveryStates(): void {
    try {
      localStorage.removeItem(RecoveryStateManager['STORAGE_KEY']);
      console.log('🗑️ Cleared all recovery states');
    } catch (error) {
      console.error('Failed to clear recovery states:', error);
    }
  }

  /**
   * Initialize recovery service (clear old states)
   */
  static initialize(): void {
    RecoveryStateManager.clearOldStates();
  }
}

// Export recovery state manager
export { RecoveryStateManager };

// Initialize on module load
SealErrorRecovery.initialize();
