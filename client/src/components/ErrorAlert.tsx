import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, X, RefreshCw } from "lucide-react";

interface ErrorAlertProps {
  title: string;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export default function ErrorAlert({
  title,
  message,
  onDismiss,
  onRetry,
}: ErrorAlertProps) {
  return (
    <Card className="p-4 border-l-4 border-l-destructive bg-destructive/5">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground mb-3">{message}</p>
          <div className="flex gap-2">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="gap-1"
              >
                <X className="w-3 h-3" />
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
