// Seal Error Handler
// Comprehensive error handling utilities for Seal operations

import { SealError, SealErrorType, RecoveryOption, BlobNotFoundError } from './sealTypes';

/**
 * Error category for grouping related errors
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  ENCRYPTION = 'ENCRYPTION',
  STORAGE = 'STORAGE',
  CONFIGURATION = 'CONFIGURATION',
  VALIDATION = 'VALIDATION',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * User-friendly error messages for each error type
 */
export const ERROR_MESSAGES: Record<SealErrorType, string> = {
  [SealErrorType.INITIALIZATION_ERROR]: 'Failed to initialize the encryption service. Please check your configuration and try again.',
  [SealErrorType.ENCRYPTION_ERROR]: 'Failed to encrypt your file. Please try again or contact support if the issue persists.',
  [SealErrorType.DECRYPTION_ERROR]: 'Failed to decrypt your file. The encryption key may be invalid or the file may be corrupted.',
  [SealErrorType.CHUNKING_ERROR]: 'Failed to process your file for upload. The file may be too large or corrupted.',
  [SealErrorType.UPLOAD_ERROR]: 'Failed to upload your file to the storage network. Please check your connection and try again.',
  [SealErrorType.DOWNLOAD_ERROR]: 'Failed to download your file from the storage network. Please check your connection and try again.',
  [SealErrorType.VERIFICATION_ERROR]: 'Failed to verify file integrity. The file may be corrupted or incomplete.',
  [SealErrorType.KEY_MANAGEMENT_ERROR]: 'Failed to manage encryption keys. Please ensure your wallet is connected properly.',
  [SealErrorType.RPC_ERROR]: 'Failed to connect to the blockchain network. Please check your connection and try again.',
  [SealErrorType.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection and try again.',
  [SealErrorType.INVALID_CONFIG_ERROR]: 'Invalid configuration detected. Please check your environment settings.',
  [SealErrorType.TIMEOUT_ERROR]: 'Operation timed out. The network may be slow or unavailable. Please try again.',
  [SealErrorType.BLOB_NOT_FOUND]: 'This file is no longer available on the storage network. The data may have expired or been removed.',
  [SealErrorType.METADATA_CORRUPTED]: 'File metadata is corrupted. Unable to download this file.',
  [SealErrorType.METADATA_MISSING]: 'File metadata not found. This file cannot be downloaded.',
  [SealErrorType.PARTIAL_DOWNLOAD_FAILURE]: 'Some parts of the file could not be downloaded. The file may be incomplete on the storage network.'
};

/**
 * Map error types to categories
 */
export const ERROR_CATEGORIES: Record<SealErrorType, ErrorCategory> = {
  [SealErrorType.INITIALIZATION_ERROR]: ErrorCategory.CONFIGURATION,
  [SealErrorType.ENCRYPTION_ERROR]: ErrorCategory.ENCRYPTION,
  [SealErrorType.DECRYPTION_ERROR]: ErrorCategory.ENCRYPTION,
  [SealErrorType.CHUNKING_ERROR]: ErrorCategory.STORAGE,
  [SealErrorType.UPLOAD_ERROR]: ErrorCategory.STORAGE,
  [SealErrorType.DOWNLOAD_ERROR]: ErrorCategory.STORAGE,
  [SealErrorType.VERIFICATION_ERROR]: ErrorCategory.STORAGE,
  [SealErrorType.KEY_MANAGEMENT_ERROR]: ErrorCategory.ENCRYPTION,
  [SealErrorType.RPC_ERROR]: ErrorCategory.NETWORK,
  [SealErrorType.NETWORK_ERROR]: ErrorCategory.NETWORK,
  [SealErrorType.INVALID_CONFIG_ERROR]: ErrorCategory.CONFIGURATION,
  [SealErrorType.TIMEOUT_ERROR]: ErrorCategory.TIMEOUT,
  [SealErrorType.BLOB_NOT_FOUND]: ErrorCategory.STORAGE,
  [SealErrorType.METADATA_CORRUPTED]: ErrorCategory.VALIDATION,
  [SealErrorType.METADATA_MISSING]: ErrorCategory.VALIDATION,
  [SealErrorType.PARTIAL_DOWNLOAD_FAILURE]: ErrorCategory.STORAGE
};

/**
 * Detailed error information for troubleshooting
 */
export interface ErrorDetails {
  type: SealErrorType;
  category: ErrorCategory;
  message: string;
  userMessage: string;
  retryable: boolean;
  context?: Record<string, unknown>;
  originalError?: Error;
  timestamp: Date;
  suggestions: string[];
}

/**
 * Error handler utility class
 */
export class SealErrorHandler {
  /**
   * Convert any error to a SealError
   * @param error - Error to convert
   * @param defaultType - Default error type if not a SealError
   * @param context - Additional context
   * @returns SealError instance
   */
  static toSealError(
    error: unknown,
    defaultType: SealErrorType = SealErrorType.NETWORK_ERROR,
    context?: Record<string, unknown>
  ): SealError {
    if (error instanceof SealError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to infer error type from message
      const inferredType = this.inferErrorType(error);
      const isRetryable = this.isRetryableErrorType(inferredType);

      return new SealError(
        inferredType,
        error.message,
        error,
        isRetryable,
        context
      );
    }

    return new SealError(
      defaultType,
      String(error),
      undefined,
      true,
      context
    );
  }

  /**
   * Get detailed error information
   * @param error - Error to analyze
   * @returns Detailed error information
   */
  static getErrorDetails(error: unknown): ErrorDetails {
    const sealError = this.toSealError(error);
    const category = ERROR_CATEGORIES[sealError.type];
    const userMessage = ERROR_MESSAGES[sealError.type];
    const suggestions = this.getErrorSuggestions(sealError);

    return {
      type: sealError.type,
      category,
      message: sealError.message,
      userMessage,
      retryable: sealError.retryable,
      context: sealError.context,
      originalError: sealError.originalError,
      timestamp: new Date(),
      suggestions
    };
  }

  /**
   * Get user-friendly error message
   * @param error - Error to format
   * @returns User-friendly message
   */
  static getUserMessage(error: unknown): string {
    const sealError = this.toSealError(error);
    return ERROR_MESSAGES[sealError.type] || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get error category
   * @param error - Error to categorize
   * @returns Error category
   */
  static getCategory(error: unknown): ErrorCategory {
    const sealError = this.toSealError(error);
    return ERROR_CATEGORIES[sealError.type] || ErrorCategory.UNKNOWN;
  }

  /**
   * Check if error is retryable
   * @param error - Error to check
   * @returns True if error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof SealError) {
      return error.retryable;
    }

    const sealError = this.toSealError(error);
    return sealError.retryable;
  }

  /**
   * Get actionable suggestions for resolving the error
   * @param error - Error to analyze
   * @returns Array of suggestions
   */
  static getErrorSuggestions(error: SealError): string[] {
    const suggestions: string[] = [];

    switch (error.type) {
      case SealErrorType.INITIALIZATION_ERROR:
        suggestions.push('Check that all required environment variables are set');
        suggestions.push('Verify your network configuration');
        suggestions.push('Try refreshing the page');
        break;

      case SealErrorType.ENCRYPTION_ERROR:
        suggestions.push('Ensure the file is not corrupted');
        suggestions.push('Try uploading a smaller file');
        suggestions.push('Check that your browser supports Web Crypto API');
        break;

      case SealErrorType.DECRYPTION_ERROR:
        suggestions.push('Verify you have the correct encryption key');
        suggestions.push('Check that the file was not modified');
        suggestions.push('Try re-uploading the file');
        break;

      case SealErrorType.CHUNKING_ERROR:
        suggestions.push('The file may be too large');
        suggestions.push('Try uploading a smaller file');
        suggestions.push('Check available memory');
        break;

      case SealErrorType.UPLOAD_ERROR:
        suggestions.push('Check your internet connection');
        suggestions.push('Verify the storage network is available');
        suggestions.push('Try again in a few moments');
        if (error.retryable) {
          suggestions.push('The upload will be retried automatically');
        }
        break;

      case SealErrorType.DOWNLOAD_ERROR:
        suggestions.push('Check your internet connection');
        suggestions.push('Verify the file still exists on the network');
        suggestions.push('Try again in a few moments');
        if (error.retryable) {
          suggestions.push('The download will be retried automatically');
        }
        break;

      case SealErrorType.VERIFICATION_ERROR:
        suggestions.push('The file may be corrupted');
        suggestions.push('Try re-uploading the file');
        suggestions.push('Contact support if the issue persists');
        break;

      case SealErrorType.KEY_MANAGEMENT_ERROR:
        suggestions.push('Ensure your wallet is connected');
        suggestions.push('Check wallet permissions');
        suggestions.push('Try reconnecting your wallet');
        break;

      case SealErrorType.RPC_ERROR:
        suggestions.push('The blockchain network may be experiencing issues');
        suggestions.push('Try again in a few moments');
        suggestions.push('A fallback connection will be attempted automatically');
        break;

      case SealErrorType.NETWORK_ERROR:
        suggestions.push('Check your internet connection');
        suggestions.push('Verify firewall settings');
        suggestions.push('Try again in a few moments');
        break;

      case SealErrorType.INVALID_CONFIG_ERROR:
        suggestions.push('Check your environment configuration');
        suggestions.push('Verify all required settings are present');
        suggestions.push('Contact your administrator');
        break;

      case SealErrorType.TIMEOUT_ERROR:
        suggestions.push('The operation took too long to complete');
        suggestions.push('Check your internet connection speed');
        suggestions.push('Try uploading a smaller file');
        suggestions.push('Try again when the network is less busy');
        break;

      case SealErrorType.BLOB_NOT_FOUND:
        suggestions.push('The file data is no longer available on the storage network');
        suggestions.push('The file may have expired or been removed');
        suggestions.push('Consider removing this file from your list');
        suggestions.push('Contact support if you believe this is an error');
        break;

      case SealErrorType.METADATA_CORRUPTED:
        suggestions.push('The file metadata has been corrupted');
        suggestions.push('This file cannot be recovered');
        suggestions.push('Remove the file and re-upload if you have the original');
        break;

      case SealErrorType.METADATA_MISSING:
        suggestions.push('File metadata was not found in storage');
        suggestions.push('The file entry may be incomplete');
        suggestions.push('Remove this file entry from your list');
        break;

      case SealErrorType.PARTIAL_DOWNLOAD_FAILURE:
        suggestions.push('Some parts of the file could not be downloaded');
        suggestions.push('Try downloading again');
        suggestions.push('Check your internet connection');
        suggestions.push('The file may be incomplete on the storage network');
        break;

      default:
        suggestions.push('Try again');
        suggestions.push('Contact support if the issue persists');
    }

    return suggestions;
  }

  /**
   * Infer error type from error message
   * @param error - Error to analyze
   * @returns Inferred error type
   */
  private static inferErrorType(error: Error): SealErrorType {
    const message = error.message.toLowerCase();

    // Blob not found errors (check first as it's most specific)
    if (message.includes('404') || 
        message.includes('blob not found') ||
        message.includes('blob does not exist')) {
      return SealErrorType.BLOB_NOT_FOUND;
    }

    // Metadata errors
    if (message.includes('metadata')) {
      if (message.includes('corrupt') || message.includes('invalid')) {
        return SealErrorType.METADATA_CORRUPTED;
      }
      if (message.includes('missing') || message.includes('not found')) {
        return SealErrorType.METADATA_MISSING;
      }
    }

    // Partial download failure
    if (message.includes('partial') || 
        message.includes('incomplete download') ||
        message.includes('some chunks failed')) {
      return SealErrorType.PARTIAL_DOWNLOAD_FAILURE;
    }

    // Network errors
    if (message.includes('network') || 
        message.includes('connection') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')) {
      return SealErrorType.NETWORK_ERROR;
    }

    // RPC errors
    if (message.includes('rpc') || 
        message.includes('sui') ||
        message.includes('blockchain')) {
      return SealErrorType.RPC_ERROR;
    }

    // Timeout errors
    if (message.includes('timeout') || 
        message.includes('timed out') ||
        message.includes('etimedout')) {
      return SealErrorType.TIMEOUT_ERROR;
    }

    // Encryption errors
    if (message.includes('encrypt') || 
        message.includes('cipher') ||
        message.includes('crypto')) {
      return SealErrorType.ENCRYPTION_ERROR;
    }

    // Decryption errors
    if (message.includes('decrypt')) {
      return SealErrorType.DECRYPTION_ERROR;
    }

    // Key management errors
    if (message.includes('key') || 
        message.includes('wallet') ||
        message.includes('signature')) {
      return SealErrorType.KEY_MANAGEMENT_ERROR;
    }

    // Upload errors
    if (message.includes('upload') || 
        message.includes('publish')) {
      return SealErrorType.UPLOAD_ERROR;
    }

    // Download errors
    if (message.includes('download') || 
        message.includes('retrieve') ||
        message.includes('fetch')) {
      return SealErrorType.DOWNLOAD_ERROR;
    }

    // Verification errors
    if (message.includes('verify') || 
        message.includes('integrity') ||
        message.includes('hash') ||
        message.includes('corrupt')) {
      return SealErrorType.VERIFICATION_ERROR;
    }

    // Configuration errors
    if (message.includes('config') || 
        message.includes('invalid') ||
        message.includes('missing')) {
      return SealErrorType.INVALID_CONFIG_ERROR;
    }

    // Default to network error
    return SealErrorType.NETWORK_ERROR;
  }

  /**
   * Check if error type is retryable
   * @param type - Error type
   * @returns True if retryable
   */
  private static isRetryableErrorType(type: SealErrorType): boolean {
    const retryableTypes = [
      SealErrorType.NETWORK_ERROR,
      SealErrorType.RPC_ERROR,
      SealErrorType.UPLOAD_ERROR,
      SealErrorType.DOWNLOAD_ERROR,
      SealErrorType.TIMEOUT_ERROR,
      SealErrorType.PARTIAL_DOWNLOAD_FAILURE
    ];

    return retryableTypes.includes(type);
  }

  /**
   * Categorize error to distinguish network vs missing blob errors
   * @param error - Error to categorize
   * @param statusCode - HTTP status code if available
   * @returns Categorized error type
   */
  static categorizeDownloadError(error: unknown, statusCode?: number): SealErrorType {
    // 404 status code indicates blob not found
    if (statusCode === 404) {
      return SealErrorType.BLOB_NOT_FOUND;
    }

    // Check if it's already a SealError
    if (error instanceof SealError) {
      return error.type;
    }

    // Analyze error message for categorization
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Blob not found indicators
      if (message.includes('404') || 
          message.includes('not found') || 
          message.includes('does not exist')) {
        return SealErrorType.BLOB_NOT_FOUND;
      }

      // Metadata issues
      if (message.includes('metadata') && message.includes('corrupt')) {
        return SealErrorType.METADATA_CORRUPTED;
      }

      if (message.includes('metadata') && 
          (message.includes('missing') || message.includes('not found'))) {
        return SealErrorType.METADATA_MISSING;
      }

      // Partial download failure
      if (message.includes('partial') || 
          message.includes('incomplete') ||
          message.includes('some chunks')) {
        return SealErrorType.PARTIAL_DOWNLOAD_FAILURE;
      }

      // Network errors
      if (message.includes('network') || 
          message.includes('connection') ||
          message.includes('timeout')) {
        return SealErrorType.NETWORK_ERROR;
      }
    }

    // Default to download error
    return SealErrorType.DOWNLOAD_ERROR;
  }

  /**
   * Create a BlobNotFoundError with recovery options
   * @param blobId - Blob ID that was not found
   * @param fileId - File ID associated with the blob
   * @param fileName - Optional file name
   * @param chunkIndex - Optional chunk index for multi-chunk files
   * @returns BlobNotFoundError instance
   */
  static createBlobNotFoundError(
    blobId: string,
    fileId: string,
    fileName?: string,
    chunkIndex?: number
  ): BlobNotFoundError {
    const message = chunkIndex !== undefined
      ? `Blob not found for chunk ${chunkIndex} of file "${fileName || fileId}"`
      : `Blob not found for file "${fileName || fileId}"`;

    const recoveryOptions = this.generateRecoveryOptions(SealErrorType.BLOB_NOT_FOUND);

    const error = new SealError(
      SealErrorType.BLOB_NOT_FOUND,
      message,
      undefined,
      false, // Not retryable - blob doesn't exist
      {
        blobId,
        fileId,
        fileName,
        chunkIndex
      }
    ) as BlobNotFoundError;

    error.blobId = blobId;
    error.fileId = fileId;
    error.fileName = fileName;
    error.chunkIndex = chunkIndex;
    error.recoveryOptions = recoveryOptions;

    return error;
  }

  /**
   * Generate recovery options based on error type
   * @param errorType - Type of error
   * @param context - Additional context
   * @returns Array of recovery options
   */
  static generateRecoveryOptions(
    errorType: SealErrorType,
    context?: Record<string, unknown>
  ): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    switch (errorType) {
      case SealErrorType.BLOB_NOT_FOUND:
        options.push({
          action: 'delete',
          label: 'Remove File',
          description: 'Remove this file from your list since it is no longer available',
          primary: true
        });
        options.push({
          action: 'report',
          label: 'Report Issue',
          description: 'Report this issue to help us investigate'
        });
        break;

      case SealErrorType.METADATA_CORRUPTED:
        options.push({
          action: 'delete',
          label: 'Remove File',
          description: 'Remove this corrupted file from your list',
          primary: true
        });
        options.push({
          action: 'report',
          label: 'Report Issue',
          description: 'Report this corruption issue'
        });
        break;

      case SealErrorType.METADATA_MISSING:
        options.push({
          action: 'delete',
          label: 'Remove File',
          description: 'Remove this file entry since metadata is missing',
          primary: true
        });
        break;

      case SealErrorType.PARTIAL_DOWNLOAD_FAILURE:
        options.push({
          action: 'retry',
          label: 'Retry Download',
          description: 'Try downloading the file again',
          primary: true
        });
        options.push({
          action: 'delete',
          label: 'Remove File',
          description: 'Remove this file if the issue persists'
        });
        options.push({
          action: 'report',
          label: 'Report Issue',
          description: 'Report this download issue'
        });
        break;

      case SealErrorType.NETWORK_ERROR:
      case SealErrorType.TIMEOUT_ERROR:
      case SealErrorType.DOWNLOAD_ERROR:
        options.push({
          action: 'retry',
          label: 'Retry',
          description: 'Try the operation again',
          primary: true
        });
        options.push({
          action: 'dismiss',
          label: 'Dismiss',
          description: 'Close this error message'
        });
        break;

      case SealErrorType.DECRYPTION_ERROR:
        options.push({
          action: 'retry',
          label: 'Retry',
          description: 'Try decrypting again'
        });
        options.push({
          action: 'report',
          label: 'Report Issue',
          description: 'Report this decryption issue',
          primary: true
        });
        break;

      default:
        options.push({
          action: 'dismiss',
          label: 'Dismiss',
          description: 'Close this error message',
          primary: true
        });
        if (this.isRetryableErrorType(errorType)) {
          options.unshift({
            action: 'retry',
            label: 'Retry',
            description: 'Try the operation again',
            primary: true
          });
        }
    }

    return options;
  }

  /**
   * Check if error is a missing blob error (404)
   * @param error - Error to check
   * @returns True if blob not found
   */
  static isBlobNotFoundError(error: unknown): boolean {
    if (error instanceof SealError) {
      return error.type === SealErrorType.BLOB_NOT_FOUND;
    }
    return false;
  }

  /**
   * Check if error is a metadata error
   * @param error - Error to check
   * @returns True if metadata error
   */
  static isMetadataError(error: unknown): boolean {
    if (error instanceof SealError) {
      return error.type === SealErrorType.METADATA_CORRUPTED ||
             error.type === SealErrorType.METADATA_MISSING;
    }
    return false;
  }

  /**
   * Check if error is a network-related error
   * @param error - Error to check
   * @returns True if network error
   */
  static isNetworkError(error: unknown): boolean {
    if (error instanceof SealError) {
      return error.type === SealErrorType.NETWORK_ERROR ||
             error.type === SealErrorType.RPC_ERROR ||
             error.type === SealErrorType.TIMEOUT_ERROR;
    }
    return false;
  }

  /**
   * Format error for logging
   * @param error - Error to format
   * @param includeStack - Include stack trace
   * @returns Formatted error string
   */
  static formatForLogging(error: unknown, includeStack: boolean = true): string {
    const details = this.getErrorDetails(error);
    
    let formatted = `[${details.category}] ${details.type}: ${details.message}`;
    
    if (details.context && Object.keys(details.context).length > 0) {
      formatted += `\nContext: ${JSON.stringify(details.context, null, 2)}`;
    }

    if (includeStack && details.originalError?.stack) {
      formatted += `\nStack: ${details.originalError.stack}`;
    }

    return formatted;
  }

  /**
   * Create a user-friendly error notification object
   * @param error - Error to format
   * @returns Notification object
   */
  static createNotification(error: unknown): {
    title: string;
    message: string;
    type: 'error' | 'warning';
    actions: Array<{ label: string; action: string }>;
  } {
    const details = this.getErrorDetails(error);
    
    return {
      title: this.getCategoryTitle(details.category),
      message: details.userMessage,
      type: details.retryable ? 'warning' : 'error',
      actions: details.retryable 
        ? [{ label: 'Retry', action: 'retry' }]
        : [{ label: 'Dismiss', action: 'dismiss' }]
    };
  }

  /**
   * Get category title for notifications
   * @param category - Error category
   * @returns Category title
   */
  private static getCategoryTitle(category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Network Error';
      case ErrorCategory.ENCRYPTION:
        return 'Encryption Error';
      case ErrorCategory.STORAGE:
        return 'Storage Error';
      case ErrorCategory.CONFIGURATION:
        return 'Configuration Error';
      case ErrorCategory.VALIDATION:
        return 'Validation Error';
      case ErrorCategory.TIMEOUT:
        return 'Timeout Error';
      default:
        return 'Error';
    }
  }
}

// Export singleton instance
export const sealErrorHandler = SealErrorHandler;
