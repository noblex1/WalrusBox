// Seal Timeout Handler
// Timeout management for long-running operations

import { SealError, SealErrorType } from './sealTypes';
import { sealErrorHandler } from './sealErrorHandler';
import { sealErrorLogger } from './sealErrorLogger';

/**
 * Timeout configuration for different operations
 */
export interface TimeoutConfig {
  duration: number; // milliseconds
  operation: string;
  showProgress?: boolean;
  onTimeout?: () => void;
}

/**
 * Default timeout durations for operations (in milliseconds)
 */
export const DEFAULT_TIMEOUTS = {
  ENCRYPTION: 60000, // 1 minute
  DECRYPTION: 60000, // 1 minute
  CHUNKING: 30000, // 30 seconds
  CHUNK_UPLOAD: 120000, // 2 minutes per chunk
  CHUNK_DOWNLOAD: 120000, // 2 minutes per chunk
  FILE_UPLOAD: 600000, // 10 minutes total
  FILE_DOWNLOAD: 600000, // 10 minutes total
  VERIFICATION: 30000, // 30 seconds
  RPC_CALL: 30000, // 30 seconds
  KEY_GENERATION: 10000, // 10 seconds
  KEY_DERIVATION: 30000 // 30 seconds
};

/**
 * Timeout result
 */
export interface TimeoutResult<T> {
  success: boolean;
  result?: T;
  timedOut: boolean;
  duration: number;
  error?: Error;
}

/**
 * Timeout handler service
 */
export class SealTimeoutHandler {
  /**
   * Execute operation with timeout
   * @param operation - Operation to execute
   * @param config - Timeout configuration
   * @returns Operation result or timeout error
   */
  static async withTimeout<T>(
    operation: () => Promise<T>,
    config: TimeoutConfig
  ): Promise<T> {
    const startTime = Date.now();
    
    return new Promise<T>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      let completed = false;

      // Create timeout
      timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          
          const duration = Date.now() - startTime;
          const error = new SealError(
            SealErrorType.TIMEOUT_ERROR,
            `Operation "${config.operation}" timed out after ${config.duration}ms`,
            undefined,
            true,
            {
              operation: config.operation,
              timeout: config.duration,
              duration
            }
          );

          // Log timeout
          sealErrorLogger.logError(error, config.operation, {
            timeout: config.duration,
            duration
          });

          // Call timeout callback if provided
          if (config.onTimeout) {
            try {
              config.onTimeout();
            } catch (callbackError) {
              console.error('Timeout callback error:', callbackError);
            }
          }

          reject(error);
        }
      }, config.duration);

      // Execute operation
      operation()
        .then(result => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            
            const duration = Date.now() - startTime;
            console.log(`✅ ${config.operation} completed in ${duration}ms`);
            
            resolve(result);
          }
        })
        .catch(error => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            
            const duration = Date.now() - startTime;
            console.error(`❌ ${config.operation} failed after ${duration}ms:`, error);
            
            reject(error);
          }
        });
    });
  }

  /**
   * Execute operation with timeout and return result object
   * @param operation - Operation to execute
   * @param config - Timeout configuration
   * @returns Timeout result with success/failure info
   */
  static async withTimeoutResult<T>(
    operation: () => Promise<T>,
    config: TimeoutConfig
  ): Promise<TimeoutResult<T>> {
    const startTime = Date.now();

    try {
      const result = await this.withTimeout(operation, config);
      const duration = Date.now() - startTime;

      return {
        success: true,
        result,
        timedOut: false,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const sealError = sealErrorHandler.toSealError(error);
      const timedOut = sealError.type === SealErrorType.TIMEOUT_ERROR;

      return {
        success: false,
        timedOut,
        duration,
        error: sealError
      };
    }
  }

  /**
   * Execute operation with adaptive timeout based on file size
   * @param operation - Operation to execute
   * @param fileSize - File size in bytes
   * @param baseTimeout - Base timeout in milliseconds
   * @param operationName - Operation name for logging
   * @returns Operation result
   */
  static async withAdaptiveTimeout<T>(
    operation: () => Promise<T>,
    fileSize: number,
    baseTimeout: number,
    operationName: string
  ): Promise<T> {
    // Calculate timeout based on file size
    // Add 1 second per MB, with minimum of base timeout
    const fileSizeMB = fileSize / (1024 * 1024);
    const adaptiveTimeout = Math.max(
      baseTimeout,
      baseTimeout + (fileSizeMB * 1000)
    );

    console.log(`⏱️ ${operationName} timeout: ${adaptiveTimeout}ms (file size: ${fileSizeMB.toFixed(2)}MB)`);

    return this.withTimeout(operation, {
      duration: adaptiveTimeout,
      operation: operationName
    });
  }

  /**
   * Execute multiple operations with individual timeouts
   * @param operations - Array of operations with configs
   * @returns Array of results
   */
  static async withTimeoutBatch<T>(
    operations: Array<{
      operation: () => Promise<T>;
      config: TimeoutConfig;
    }>
  ): Promise<TimeoutResult<T>[]> {
    const promises = operations.map(({ operation, config }) =>
      this.withTimeoutResult(operation, config)
    );

    return Promise.all(promises);
  }

  /**
   * Create a timeout error with user-friendly message
   * @param operation - Operation that timed out
   * @param duration - Timeout duration
   * @param context - Additional context
   * @returns Timeout error
   */
  static createTimeoutError(
    operation: string,
    duration: number,
    context?: Record<string, unknown>
  ): SealError {
    return new SealError(
      SealErrorType.TIMEOUT_ERROR,
      `Operation "${operation}" timed out after ${duration}ms`,
      undefined,
      true,
      {
        operation,
        timeout: duration,
        ...context
      }
    );
  }

  /**
   * Check if error is a timeout error
   * @param error - Error to check
   * @returns True if timeout error
   */
  static isTimeoutError(error: unknown): boolean {
    if (error instanceof SealError) {
      return error.type === SealErrorType.TIMEOUT_ERROR;
    }

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return message.includes('timeout') || message.includes('timed out');
  }

  /**
   * Get recommended timeout for operation
   * @param operation - Operation type
   * @param fileSize - Optional file size for adaptive timeout
   * @returns Recommended timeout in milliseconds
   */
  static getRecommendedTimeout(
    operation: keyof typeof DEFAULT_TIMEOUTS,
    fileSize?: number
  ): number {
    const baseTimeout = DEFAULT_TIMEOUTS[operation];

    if (fileSize && (operation === 'FILE_UPLOAD' || operation === 'FILE_DOWNLOAD')) {
      // Adaptive timeout for file operations
      const fileSizeMB = fileSize / (1024 * 1024);
      return Math.max(baseTimeout, baseTimeout + (fileSizeMB * 1000));
    }

    return baseTimeout;
  }

  /**
   * Format timeout duration for display
   * @param milliseconds - Duration in milliseconds
   * @returns Formatted string
   */
  static formatTimeout(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }

    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }

    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Create a progress tracker with timeout
   * @param operation - Operation name
   * @param timeout - Timeout duration
   * @param onProgress - Progress callback
   * @returns Progress tracker
   */
  static createProgressTracker(
    operation: string,
    timeout: number,
    onProgress?: (elapsed: number, remaining: number, percentage: number) => void
  ): {
    start: () => void;
    stop: () => void;
    isRunning: () => boolean;
  } {
    let intervalId: NodeJS.Timeout | null = null;
    let startTime: number = 0;
    let running = false;

    return {
      start: () => {
        if (running) return;

        running = true;
        startTime = Date.now();

        intervalId = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, timeout - elapsed);
          const percentage = Math.min(100, (elapsed / timeout) * 100);

          if (onProgress) {
            onProgress(elapsed, remaining, percentage);
          }

          if (remaining === 0 && intervalId) {
            clearInterval(intervalId);
            running = false;
          }
        }, 100); // Update every 100ms
      },

      stop: () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        running = false;
      },

      isRunning: () => running
    };
  }
}

// Export singleton instance
export const sealTimeoutHandler = SealTimeoutHandler;
