// Timeout Error Alert Component
// Displays timeout errors with clear messages and retry options

import { useState } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Clock, RefreshCw } from 'lucide-react';
import { sealTimeoutHandler } from '../services/seal/sealTimeout';
import { sealErrorHandler } from '../services/seal/sealErrorHandler';

interface TimeoutErrorAlertProps {
  error: unknown;
  operation: string;
  onRetry?: () => Promise<void>;
  className?: string;
}

export function TimeoutErrorAlert({
  error,
  operation,
  onRetry,
  className = ''
}: TimeoutErrorAlertProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  // Check if this is a timeout error
  const isTimeout = sealTimeoutHandler.isTimeoutError(error);
  
  if (!isTimeout) {
    return null;
  }

  const errorDetails = sealErrorHandler.getErrorDetails(error);
  const timeout = errorDetails.context?.timeout as number | undefined;
  const duration = errorDetails.context?.duration as number | undefined;

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    setRetryError(null);

    try {
      await onRetry();
      console.log(`✅ ${operation} retry succeeded`);
    } catch (err) {
      const message = sealErrorHandler.getUserMessage(err);
      setRetryError(message);
      console.error(`❌ ${operation} retry failed:`, err);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Alert variant="destructive">
        <Clock className="h-4 w-4" />
        <AlertTitle>Operation Timed Out</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>{errorDetails.userMessage}</p>
            {timeout && (
              <p className="text-sm">
                Timeout limit: {sealTimeoutHandler.formatTimeout(timeout)}
              </p>
            )}
            {duration && (
              <p className="text-sm">
                Time elapsed: {sealTimeoutHandler.formatTimeout(duration)}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {errorDetails.suggestions.length > 0 && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium">What you can try:</p>
          <ul className="list-disc list-inside space-y-1">
            {errorDetails.suggestions.slice(0, 3).map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {onRetry && (
        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          variant="outline"
          className="w-full"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
      )}

      {retryError && (
        <Alert variant="destructive">
          <AlertDescription>{retryError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
