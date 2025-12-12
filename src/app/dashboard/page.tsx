
'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * This component acts as a router guard for the /dashboard route.
 * It redirects all authenticated users to their main dashboard page.
 */
export default function DashboardRouterGuard() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user object is loaded
    }
    
    if (!user) {
      router.replace('/login');
    } else {
      // All authenticated users are owners, so redirect to the owner dashboard.
      router.replace('/dashboard/owner');
    }
  }, [user, isUserLoading, router]);

  // Display a loading indicator while the authentication check is in progress.
  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-center h-full min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    </main>
  );
}
