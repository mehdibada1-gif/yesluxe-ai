
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useUser, initiateAnonymousSignIn, useAuth } from '@/firebase';
import AppHeader from '@/components/layout/app-header';
import { SidebarProvider } from '@/components/ui/sidebar';
import MediaGallery from '@/components/property/media-gallery';
import PropertyInfo from '@/components/property/property-info';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Home, Loader2 } from 'lucide-react';
import { Property } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import AIChatInterface from '@/components/property/ai-chat-interface';

/**
 * This new component handles the anonymous sign-in effect.
 * It's kept separate to ensure it doesn't interfere with the rendering of the main page content.
 */
function AnonymousAuthHandler() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  // This component doesn't render anything itself.
  return null;
}

/**
 * The main UI for the property page.
 * It is now separate from the authentication logic.
 */
export default function PropertyPageClient({ property }: { property: Property }) {
  const { user, isUserLoading } = useUser();

  const isOwnerView = useMemo(() => {
    return user && !user.isAnonymous && user.uid === property.ownerId;
  }, [user, property.ownerId]);
  
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
       <AnonymousAuthHandler />
      <div className="min-h-screen bg-background">
        <AppHeader propertyName={property.name} />
        <main className="p-4 md:p-6 lg:p-8">
          {isOwnerView && (
            <Alert className="mb-6 max-w-5xl mx-auto bg-primary/5 border-primary/20">
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
          <div className="flex flex-col lg:flex-row max-w-7xl mx-auto gap-8">
            <div className="lg:order-2 lg:w-1/3 lg:sticky lg:top-24 h-fit">
              <AIChatInterface
                property={property}
              />
            </div>
            <div className="lg:order-1 lg:w-2/3 space-y-8">
              <MediaGallery media={property.media} />
              <PropertyInfo property={property} />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

