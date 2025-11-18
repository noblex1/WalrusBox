// Partial Upload Recovery Component
// Allows users to resume failed uploads

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { SealErrorRecovery, PartialUploadState } from '../services/seal/sealErrorRecovery';
import { Progress } from './ui/progress';

interface PartialUploadRecoveryProps {
  onResumeUpload?: (state: PartialUploadState) => Promise<void>;
  className?: string;
}

export function PartialUploadRecovery({
  onResumeUpload,
  className = ''
}: PartialUploadRecoveryProps) {
  const [recoverableUploads, setRecoverableUploads] = useState<PartialUploadState[]>([]);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecoverableUploads();
  }, []);

  const loadRecoverableUploads = () => {
    const uploads = SealErrorRecovery.getRecoverableUploads();
    setRecoverableUploads(uploads);
  };

  const handleResume = async (state: PartialUploadState) => {
    if (!onResumeUpload) {
      setError('Resume functionality not available');
      return;
    }

    setResumingId(state.fileId);
    setError(null);

    try {
      await onResumeUpload(state);
      loadRecoverableUploads(); // Refresh list
      console.log(`✅ Upload resumed for ${state.fileName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume upload';
      setError(message);
      console.error('❌ Failed to resume upload:', err);
    } finally {
      setResumingId(null);
    }
  };

  const handleRemove = (fileId: string) => {
    SealErrorRecovery.clearAllRecoveryStates();
    loadRecoverableUploads();
  };

  const calculateProgress = (state: PartialUploadState): number => {
    return Math.round((state.uploadedChunks.length / state.totalChunks) * 100);
  };

  if (recoverableUploads.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          Incomplete Uploads
        </CardTitle>
        <CardDescription>
          Resume uploads that were interrupted
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {recoverableUploads.map((state) => {
          const progress = calculateProgress(state);
          const isResuming = resumingId === state.fileId;

          return (
            <div
              key={state.fileId}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{state.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {state.uploadedChunks.length} of {state.totalChunks} chunks uploaded
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResume(state)}
                    disabled={isResuming || !onResumeUpload}
                  >
                    {isResuming ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Resuming...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(state.fileId)}
                    disabled={isResuming}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Progress value={progress} className="h-2" />

              {state.failedChunks.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {state.failedChunks.length} chunk{state.failedChunks.length !== 1 ? 's' : ''} failed
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
