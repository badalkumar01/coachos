'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced by Sentry capture once monitoring is wired up (Phase 1).
    console.error(error);
  }, [error]);

  const isConfigError = error.message.includes('environment variable');

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="bg-muted text-muted-foreground mx-auto mb-4 flex size-10 items-center justify-center rounded-full">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          {isConfigError
            ? error.message
            : 'We hit an unexpected error. Trying again usually helps — if it does not, the error has been logged.'}
        </p>
        {error.digest ? (
          <p className="text-muted-foreground mt-2 font-mono text-xs">Reference: {error.digest}</p>
        ) : null}
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
