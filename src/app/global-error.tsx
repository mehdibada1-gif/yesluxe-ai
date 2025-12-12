
'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold font-headline mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. You can try to reload the page or return home.
            </p>
            {error?.message && (
                <div className="bg-destructive/10 text-destructive/80 p-4 rounded-md my-4 text-left">
                    <p className="font-mono text-sm">{error.message}</p>
                </div>
            )}
            <Button onClick={() => window.location.reload()}>Try again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
