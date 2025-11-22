import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface BatchVerificationProgressProps {
  total: number;
  verified: number;
  failed: number;
  current: number;
  isComplete: boolean;
}

/**
 * Batch Verification Progress Component
 * 
 * Displays real-time progress for batch verification operations with detailed statistics.
 * Shows progress bar, status counts, and completion summary.
 * 
 * Features:
 * - Real-time progress bar with percentage
 * - Status breakdown (verified, failed, pending)
 * - Visual indicators with color-coded badges
 * - Completion summary with success/failure status
 * 
 * @param total - Total number of files to verify
 * @param verified - Number of files successfully verified
 * @param failed - Number of files that failed verification
 * @param current - Current file being processed (1-indexed)
 * @param isComplete - Whether the batch verification is complete
 * 
 * @example
 * ```tsx
 * <BatchVerificationProgress
 *   total={10}
 *   verified={7}
 *   failed={1}
 *   current={8}
 *   isComplete={false}
 * />
 * ```
 */
export const BatchVerificationProgress = ({
  total,
  verified,
  failed,
  current,
  isComplete,
}: BatchVerificationProgressProps) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const pending = total - verified - failed;

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {isComplete ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Verification Complete
            </>
          ) : (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Verifying Files...
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isComplete
            ? `Verified ${verified} of ${total} files`
            : `Processing ${current} of ${total} files`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentage}% complete</span>
            <span>{current} / {total}</span>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Verified</span>
              <span className="text-sm font-semibold text-green-500">{verified}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <XCircle className="h-4 w-4 text-destructive" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Failed</span>
              <span className="text-sm font-semibold text-destructive">{failed}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-muted">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Pending</span>
              <span className="text-sm font-semibold">{pending}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        {isComplete && (
          <div className="flex justify-center pt-2">
            {failed === 0 ? (
              <Badge variant="default" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                All files verified successfully
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-2">
                <XCircle className="h-4 w-4" />
                {failed} file(s) failed verification
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
