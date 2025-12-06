'use client';

import { useMemo, useEffect, useState } from 'react';
import { useUser, initiateAnonymousSignIn, useAuth } from '@/firebase';
import AppHeader from '@/components/layout/app-header';
import { SidebarProvider } from '@/components/ui/sidebar';
import MediaGallery from '@/components/property/media-gallery';
import PropertyInfo from '@/components/property/property-info';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Home, Loader2 } from 'lucide-react';
import { Property, FirestoreFAQ } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import AIChatInterface from '@/components/property/ai-chat-interface';

/**
 * This is the UI for the property page. It is responsible for displaying the property
 * information and handling the anonymous user sign-in effect.
 */
function PropertyPageContent({ property }: { property: Property }) {
  const { user } = useUser();

  const isOwnerView = useMemo(() => {
    // A non-anonymous user is the owner if their UID matches the property's ownerId.
    return user && !user.isAnonymous && user.uid === property.ownerId;
  }, [user, property.ownerId]);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <AppHeader propertyName={property.name} />
        <main className="p-4 md:p-6 lg:p-8">
          {isOwnerView && (
            <Alert className="mb-6 bg-primary/5 border-primary/20">
              <Home className="h-4 w-4" />
              <AlertTitle className="font-semibold">
                You are viewing your own property.
              </AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                This is the public page your visitors will see.
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/property/${property.id}`}>
                    Go to Management Dashboard
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 xl:grid-cols-3 xl:gap-8 gap-6">
            <div className="xl:col-span-1 xl:row-start-1">
              {/* Pass the entire property object */}
              <AIChatInterface
                property={property}
              />
            </div>
            <div className="xl:col-span-2 space-y-6">
              <MediaGallery media={property.media} />
              <PropertyInfo property={property} />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

/**
 * This parent component handles the authentication effect and loading states.
 * It ensures that the main content is only rendered after the user state is resolved.
 */
export default function PropertyPageClient({
  property,
}: {
  property: Property;
}) {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // This effect handles signing in anonymous users on the client.
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  if (!property) {
    // This case should ideally be handled by the server component with notFound().
    return <div>Property not found.</div>;
  }

  // Prevents rendering the UI until the user's auth state is resolved.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Once loading is complete, render the actual page content.
  return <PropertyPageContent property={property} />;
}
