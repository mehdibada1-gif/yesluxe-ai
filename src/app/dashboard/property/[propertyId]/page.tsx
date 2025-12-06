'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// This page is now a redirector to the default management page.
export default function OwnerPropertyDashboard() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.propertyId as string;

  useEffect(() => {
    if (propertyId) {
        // Redirect to the "edit" page by default when accessing the property hub.
        router.replace(`/dashboard/property/${propertyId}/edit`);
    }
  }, [router, propertyId]);

  // Render nothing while redirecting
  return null;
}
