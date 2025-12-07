
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useDoc } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Building, MapPin, Lock, Copy } from 'lucide-react';
import { FirestoreProperty, Owner } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

function PropertyListSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                 <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-24" />
                    </CardFooter>
                 </Card>
            ))}
        </div>
    )
}

export default function PropertiesPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  const ownerRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'owners', user.uid) : null),
    [firestore, user]
  );
  const { data: owner, isLoading: isOwnerLoading } = useDoc<Owner>(ownerRef);

    // Securely check if the current user is a SuperAdmin.
    const superAdminRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
        [firestore, user]
    );
    const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
    const isSuperAdmin = !!superAdminDoc && !isSuperAdminLoading;

  // This query is now simplified: it ONLY fetches properties for the current owner.
  const propertiesQuery = useMemoFirebase(
    () => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'properties'), where('ownerId', '==', user.uid));
    },
    [firestore, user]
  );

  const { data: properties, isLoading: arePropertiesLoading } =
    useCollection<FirestoreProperty>(propertiesQuery);
    
  const canCreateProperty = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!owner || !properties) return false;
    
    const propertyCount = properties.length;
    switch (owner.subscriptionTier) {
        case 'free':
            return propertyCount < 1;
        case 'pro':
            return propertyCount < 10;
        case 'premium':
            return true;
        default:
            return false;
    }
  }, [owner, properties, isSuperAdmin]);
  
  const isLoading = isUserLoading || arePropertiesLoading || isOwnerLoading || isSuperAdminLoading;
  
  const handleCopyId = (propertyId: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(propertyId).then(() => {
        toast({ title: "Property ID Copied!" });
      }).catch(err => {
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy ID." });
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = propertyId;
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({ title: "Property ID Copied!" });
      } catch (err) {
        toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy ID." });
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  if (isLoading) {
    return (
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-headline font-bold tracking-tight">My Properties</h1>
                <Skeleton className="h-10 w-40" />
            </div>
            <PropertyListSkeleton />
        </main>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight">My Properties</h1>
        <Button asChild disabled={!canCreateProperty}>
          <Link href="/dashboard/properties/new">
            {canCreateProperty ? <PlusCircle className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
            {canCreateProperty ? 'Create Property' : 'Upgrade to Add More'}
          </Link>
        </Button>
      </div>

      {properties && properties.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map(property => (
            <Card key={property.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="font-headline tracking-tight">{property.name}</CardTitle>
                  {property.status === 'draft' && <Badge variant="secondary">Draft</Badge>}
                </div>
                 <CardDescription className="flex items-center gap-2 pt-1">
                    <MapPin className="h-4 w-4" />
                    {property.address}
                </CardDescription>
                <div className="flex items-center gap-2 pt-2">
                    <span className="font-mono text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">{property.id}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyId(property.id)}>
                        <Copy className="h-3 w-3" />
                        <span className="sr-only">Copy ID</span>
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-sm text-muted-foreground">{property.description}</p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href={`/dashboard/property/${property.id}/edit`}>Manage</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center h-80">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-4">
                <Building className="h-6 w-6 text-muted-foreground" />
            </div>
          <h3 className="text-xl font-semibold mb-1">No Properties Found</h3>
          <p className="text-muted-foreground mb-4">Get started by creating your first property.</p>
          <Button asChild disabled={!canCreateProperty}>
            <Link href="/dashboard/properties/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Property
            </Link>
          </Button>
        </div>
      )}
    </main>
  );
}
