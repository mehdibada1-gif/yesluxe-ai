
'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * This component acts as a router guard for the /dashboard route.
 * It checks the user's role and redirects them to the appropriate dashboard.
 */
export default function DashboardRouterGuard() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    const checkRoleAndRedirect = async () => {
        if (isUserLoading) {
            return; // Wait until user object is loaded
        }
        
        if (!user) {
            router.replace('/login');
            return;
        }

        try {
            // Force a refresh of the ID token to get the latest custom claims.
            const idTokenResult = await user.getIdTokenResult(true);
            const isSuperAdmin = idTokenResult.claims.superAdmin === true;

            if (isSuperAdmin) {
                router.replace('/dashboard/admin');
            } else {
                router.replace('/dashboard/owner');
            }
        } catch (error) {
            console.error("Error getting user token or claims:", error);
            // Default to owner dashboard on error
            router.replace('/dashboard/owner');
        }
    };
    
    checkRoleAndRedirect();

  }, [user, isUserLoading, router]);

  // Display a loading indicator while the authentication and role checks are in progress.
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
