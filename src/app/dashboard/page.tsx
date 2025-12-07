
'use client';

import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';

/**
 * This component acts as a router guard for the /dashboard route.
 * It checks the user's role and redirects them to the appropriate dashboard.
 */
export default function DashboardRouterGuard() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  // ✅ CORRECT CODE: Only runs a safe GET operation
  const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);

  useEffect(() => {
    // Force a token refresh on user load to get latest custom claims.
    if (user) {
        user.getIdTokenResult(true);
    }
    
    // Wait until both the user and the superAdmin check are finished loading.
    if (isUserLoading || isSuperAdminLoading) {
      return;
    }

    // If there's no user after loading, redirect to login.
    if (!user) {
      router.replace('/login');
      return;
    }
    
    // Check if the document exists
    const isSuperAdmin = !!superAdminDoc;

    // 🔑 GUARANTEED REDIRECT LOGIC:
    // This logic ensures a clean and exclusive redirect based on role hierarchy.
    if (isSuperAdmin) {
      // A SuperAdmin is found, redirect to the admin dashboard immediately.
      router.replace('/dashboard/admin');
    } else {
      // If not a SuperAdmin, they must be a regular owner. Redirect to the owner dashboard.
      router.replace('/dashboard/owner');
    }
  }, [user, isUserLoading, superAdminDoc, isSuperAdminLoading, router]);

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
