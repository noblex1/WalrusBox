// Seal Error Handling - Main Export
// Centralized export for all error handling utilities

export {
  SealErrorHandler,
  sealErrorHandler,
  ErrorCategory,
  ERROR_MESSAGES,
  ERROR_CATEGORIES,
  type ErrorDetails
} from './sealErrorHandler';

export {
  SealErrorRecovery,
  RecoveryStateManager,
  DEFAULT_RETRY_CONFIG,
  type PartialUploadState
} from './sealErrorRecovery';

export {
  SealErrorLogger,
  sealErrorLogger,
  LogLevel,
  type ErrorLogEntry,
  type ErrorStatistics
} from './sealErrorLogger';

export {
  SealTimeoutHandler,
  sealTimeoutHandler,
  DEFAULT_TIMEOUTS,
  type TimeoutConfig,
  type TimeoutResult
} from './sealTimeout';

export {
  SealError,
  SealErrorType,
  type RetryConfig
} from './sealTypes';
