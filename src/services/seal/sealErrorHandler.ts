// Seal Error Handler
// Comprehensive error handling utilities for Seal operations

import { SealError, SealErrorType } from './sealTypes';

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
  [SealErrorType.TIMEOUT_ERROR]: 'Operation timed out. The network may be slow or unavailable. Please try again.'
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
  [SealErrorType.TIMEOUT_ERROR]: ErrorCategory.TIMEOUT
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
      SealErrorType.TIMEOUT_ERROR
    ];

    return retryableTypes.includes(type);
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
