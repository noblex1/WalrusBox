// Error Recovery Button Component
// Provides manual retry functionality for failed operations

import { useState } from 'react';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { sealErrorHandler } from '../services/seal/sealErrorHandler';

interface ErrorRecoveryButtonProps {
  error: unknown;
  onRetry: () => Promise<void>;
  operationName?: string;
  className?: string;
}

export function ErrorRecoveryButton({
  error,
  onRetry,
  operationName = 'operation',
  className = ''
}: ErrorRecoveryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const errorDetails = sealErrorHandler.getErrorDetails(error);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);

    try {
      await onRetry();
      console.log(`✅ ${operationName} retry succeeded`);
    } catch (err) {
      const message = sealErrorHandler.getUserMessage(err);
      setRetryError(message);
      console.error(`❌ ${operationName} retry failed:`, err);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!errorDetails.retryable) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {errorDetails.userMessage}
        </AlertDescription>
      </Alert>

      {errorDetails.suggestions.length > 0 && (
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium">Suggestions:</p>
          <ul className="list-disc list-inside space-y-1">
            {errorDetails.suggestions.slice(0, 3).map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={handleRetry}
        disabled={isRetrying}
        variant="outline"
        className="w-full"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Retrying...' : 'Retry'}
      </Button>

      {retryError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{retryError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
