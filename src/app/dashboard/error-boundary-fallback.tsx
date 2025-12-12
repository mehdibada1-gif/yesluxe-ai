'use client';

import { Button } from '@/components/ui/button';

export function DashboardErrorBoundaryFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex h-full flex-col items-center justify-center p-8"
    >
      <h2 className="text-lg font-semibold">Oops, something went wrong.</h2>
      <p className="my-2 text-muted-foreground">{error.message}</p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}
