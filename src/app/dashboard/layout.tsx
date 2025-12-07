import AppSidebar from '@/components/layout/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

function DashboardErrorBoundaryFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center h-full p-8">
      <h2 className="text-lg font-semibold">Oops, something went wrong.</h2>
      <p className="text-muted-foreground my-2">{error.message}</p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset>
            <ErrorBoundary FallbackComponent={DashboardErrorBoundaryFallback}>
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    {children}
                </Suspense>
            </ErrorBoundary>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
