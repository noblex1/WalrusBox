// Seal Error Logger
// Comprehensive error logging for development and production

import { SealError, SealErrorType } from './sealTypes';
import { sealErrorHandler, ErrorCategory } from './sealErrorHandler';

/**
 * Log level for error logging
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  type: SealErrorType;
  category: ErrorCategory;
  message: string;
  operation?: string;
  fileId?: string;
  fileName?: string;
  context?: Record<string, unknown>;
  stack?: string;
  userAgent?: string;
  url?: string;
}

/**
 * Error statistics
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<SealErrorType, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  recentErrors: ErrorLogEntry[];
  mostCommonError: SealErrorType | null;
}

/**
 * Error logger service
 */
export class SealErrorLogger {
  private static readonly STORAGE_KEY = 'seal_error_logs';
  private static readonly MAX_LOGS = 100; // Keep last 100 errors
  private static readonly isDevelopment = import.meta.env.DEV;

  /**
   * Log an error
   * @param error - Error to log
   * @param operation - Operation that failed
   * @param context - Additional context
   */
  static logError(
    error: unknown,
    operation?: string,
    context?: Record<string, unknown>
  ): void {
    const sealError = sealErrorHandler.toSealError(error);
    const details = sealErrorHandler.getErrorDetails(sealError);
    
    // Determine log level
    const level = this.getLogLevel(sealError);

    // Create log entry
    const entry: ErrorLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      type: sealError.type,
      category: details.category,
      message: sealError.message,
      operation,
      fileId: context?.fileId as string | undefined,
      fileName: context?.fileName as string | undefined,
      context: {
        ...context,
        ...sealError.context
      },
      stack: sealError.originalError?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Log to console in development
    if (this.isDevelopment) {
      this.logToConsole(entry);
    }

    // Store log entry
    this.storeLogEntry(entry);

    // Send to analytics in production
    if (!this.isDevelopment) {
      this.sendToAnalytics(entry);
    }
  }

  /**
   * Log to console with formatting
   * @param entry - Log entry
   */
  private static logToConsole(entry: ErrorLogEntry): void {
    const emoji = this.getLogEmoji(entry.level);
    const timestamp = entry.timestamp.toISOString();
    
    const logMessage = [
      `${emoji} [${entry.level}] ${timestamp}`,
      `Type: ${entry.type}`,
      `Category: ${entry.category}`,
      `Message: ${entry.message}`,
      entry.operation ? `Operation: ${entry.operation}` : null,
      entry.fileName ? `File: ${entry.fileName}` : null,
    ].filter(Boolean).join('\n');

    // Log with appropriate console method
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.context);
        break;
      case LogLevel.INFO:
        console.info(logMessage, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.context);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logMessage, entry.context);
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  /**
   * Store log entry in localStorage
   * @param entry - Log entry
   */
  private static storeLogEntry(entry: ErrorLogEntry): void {
    try {
      const logs = this.getStoredLogs();
      logs.unshift(entry);

      // Keep only the most recent logs
      const trimmedLogs = logs.slice(0, this.MAX_LOGS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('Failed to store error log:', error);
    }
  }

  /**
   * Get stored logs from localStorage
   * @returns Array of log entries
   */
  private static getStoredLogs(): ErrorLogEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const logs = JSON.parse(stored);
      
      // Convert timestamp strings back to Date objects
      return logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      console.error('Failed to get stored logs:', error);
      return [];
    }
  }

  /**
   * Send error to analytics service
   * @param entry - Log entry
   */
  private static sendToAnalytics(entry: ErrorLogEntry): void {
    try {
      // Create analytics event
      const event = {
        event: 'seal_error',
        timestamp: entry.timestamp.toISOString(),
        error_type: entry.type,
        error_category: entry.category,
        error_level: entry.level,
        operation: entry.operation,
        file_id: entry.fileId,
        retryable: this.isRetryableError(entry.type),
        // Don't send sensitive data
        context: this.sanitizeContext(entry.context)
      };

      // Store in localStorage for batch sending
      const analyticsQueue = this.getAnalyticsQueue();
      analyticsQueue.push(event);
      localStorage.setItem('seal_analytics_queue', JSON.stringify(analyticsQueue));

      console.log('📊 Error logged to analytics queue');
    } catch (error) {
      console.error('Failed to send error to analytics:', error);
    }
  }

  /**
   * Get analytics queue
   * @returns Array of analytics events
   */
  private static getAnalyticsQueue(): any[] {
    try {
      const stored = localStorage.getItem('seal_analytics_queue');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get error statistics
   * @returns Error statistics
   */
  static getStatistics(): ErrorStatistics {
    const logs = this.getStoredLogs();
    
    const errorsByType: Record<SealErrorType, number> = {} as any;
    const errorsByCategory: Record<ErrorCategory, number> = {} as any;

    logs.forEach(log => {
      errorsByType[log.type] = (errorsByType[log.type] || 0) + 1;
      errorsByCategory[log.category] = (errorsByCategory[log.category] || 0) + 1;
    });

    // Find most common error
    let mostCommonError: SealErrorType | null = null;
    let maxCount = 0;
    Object.entries(errorsByType).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonError = type as SealErrorType;
      }
    });

    return {
      totalErrors: logs.length,
      errorsByType,
      errorsByCategory,
      recentErrors: logs.slice(0, 10),
      mostCommonError
    };
  }

  /**
   * Get logs filtered by criteria
   * @param filter - Filter criteria
   * @returns Filtered logs
   */
  static getLogs(filter?: {
    type?: SealErrorType;
    category?: ErrorCategory;
    operation?: string;
    fileId?: string;
    startDate?: Date;
    endDate?: Date;
  }): ErrorLogEntry[] {
    let logs = this.getStoredLogs();

    if (filter) {
      if (filter.type) {
        logs = logs.filter(log => log.type === filter.type);
      }
      if (filter.category) {
        logs = logs.filter(log => log.category === filter.category);
      }
      if (filter.operation) {
        logs = logs.filter(log => log.operation === filter.operation);
      }
      if (filter.fileId) {
        logs = logs.filter(log => log.fileId === filter.fileId);
      }
      if (filter.startDate) {
        logs = logs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(log => log.timestamp <= filter.endDate!);
      }
    }

    return logs;
  }

  /**
   * Clear all logs
   */
  static clearLogs(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Error logs cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Export logs as JSON
   * @returns JSON string of logs
   */
  static exportLogs(): string {
    const logs = this.getStoredLogs();
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Download logs as file
   */
  static downloadLogs(): void {
    const json = this.exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `seal-error-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 Error logs downloaded');
  }

  /**
   * Get log level for error
   * @param error - Seal error
   * @returns Log level
   */
  private static getLogLevel(error: SealError): LogLevel {
    switch (error.type) {
      case SealErrorType.INITIALIZATION_ERROR:
      case SealErrorType.INVALID_CONFIG_ERROR:
        return LogLevel.FATAL;
      
      case SealErrorType.ENCRYPTION_ERROR:
      case SealErrorType.DECRYPTION_ERROR:
      case SealErrorType.KEY_MANAGEMENT_ERROR:
      case SealErrorType.VERIFICATION_ERROR:
        return LogLevel.ERROR;
      
      case SealErrorType.UPLOAD_ERROR:
      case SealErrorType.DOWNLOAD_ERROR:
      case SealErrorType.CHUNKING_ERROR:
        return error.retryable ? LogLevel.WARN : LogLevel.ERROR;
      
      case SealErrorType.NETWORK_ERROR:
      case SealErrorType.RPC_ERROR:
      case SealErrorType.TIMEOUT_ERROR:
        return LogLevel.WARN;
      
      default:
        return LogLevel.ERROR;
    }
  }

  /**
   * Get emoji for log level
   * @param level - Log level
   * @returns Emoji
   */
  private static getLogEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🐛';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      case LogLevel.FATAL:
        return '💀';
      default:
        return '❓';
    }
  }

  /**
   * Check if error type is retryable
   * @param type - Error type
   * @returns True if retryable
   */
  private static isRetryableError(type: SealErrorType): boolean {
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
   * Sanitize context to remove sensitive data
   * @param context - Context object
   * @returns Sanitized context
   */
  private static sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> {
    if (!context) return {};

    const sanitized = { ...context };
    
    // Remove sensitive keys
    const sensitiveKeys = ['key', 'password', 'token', 'secret', 'encryptionKey'];
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

// Export singleton instance
export const sealErrorLogger = SealErrorLogger;
