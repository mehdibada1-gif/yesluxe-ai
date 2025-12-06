'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { FirestoreProperty, Owner } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Building, PlusCircle, ArrowRight, Star, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/property/star-rating';

export default function OwnerDashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (isUserLoading) {
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, isUserLoading, router]);

  const ownerRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'owners', user.uid) : null),
    [firestore, user]
  );
  const { data: owner, isLoading: isOwnerLoading } = useDoc<Owner>(ownerRef);

  const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc;

  // Query for properties. This page is now ONLY for the owner's view.
  const propertiesQuery = useMemoFirebase(
    () => {
        if (!firestore || !user) return null;
        // This page always shows properties for the logged-in user.
        // The `/dashboard/properties` page handles the "view all" for superAdmins.
        return query(collection(firestore, 'properties'), where('ownerId', '==', user.uid));
    },
    [firestore, user]
  );
  const { data: properties, isLoading: arePropertiesLoading } = useCollection<FirestoreProperty>(propertiesQuery);
  
  const canCreateProperty = useMemo(() => {
    if (!owner || !properties) return false;
    // SuperAdmins can always create properties.
    if (isSuperAdmin) return true;
    
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


  if (isUserLoading || isSuperAdminLoading || arePropertiesLoading) {
    return (
        <main className="flex-1 p-4 md:p-6 lg:p-8">
             <div className="flex items-center justify-center h-full min-h-[calc(100vh-10rem)]">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        </main>
    )
  }

  // If loading is finished and there's still no user, a redirect to /login is in progress.
  if (!user) {
    return null;
  }

  const totalReviews = properties?.reduce((acc, prop) => acc + (prop.reviewCount || 0), 0) || 0;
  const totalRatingSum = properties?.reduce((acc, prop) => acc + (prop.ratingSum || 0), 0) || 0;
  const overallAverageRating = totalReviews > 0 ? totalRatingSum / totalReviews : 0;

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-headline font-bold tracking-tight">
                    {isSuperAdmin ? "Welcome SuperAdmin" : `Welcome back, ${user.displayName || user.email?.split('@')[0]}!`}
                </h1>
                <p className="text-muted-foreground">
                    {isSuperAdmin ? "This is your admin overview. Use the sidebar to manage all platform data." : "Here's a quick overview of your account."}
                </p>
            </header>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Your Properties</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{properties?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalReviews}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall Average Rating</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {overallAverageRating.toFixed(1)}
                            <Badge variant="outline" className="text-xs font-normal">
                                <StarRating rating={overallAverageRating} />
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>


            {/* Recent Properties and Actions */}
            <div className="grid gap-8 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Your Properties</CardTitle>
                        <CardDescription>A look at all your current properties.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {properties && properties.length > 0 ? (
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {properties.map(prop => (
                                    <div key={prop.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                                        <div>
                                            <p className="font-semibold">{prop.name}</p>
                                            <p className="text-sm text-muted-foreground">{prop.address}</p>
                                        </div>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/dashboard/property/${prop.id}/edit`}>Manage</Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                                <Building className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                                <p>No properties found.</p>
                             </div>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button asChild className="w-full" disabled={!canCreateProperty}>
                             <Link href="/dashboard/properties/new">
                                {canCreateProperty ? <PlusCircle className="mr-4 h-5 w-5" /> : <Lock className="mr-4 h-5 w-5" />}
                                {canCreateProperty ? 'Create a New Property' : 'Upgrade to Add More'}
                             </Link>
                        </Button>
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Get started with these common actions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button asChild className="w-full justify-start h-14 text-base" disabled={!canCreateProperty}>
                             <Link href="/dashboard/properties/new">
                                {canCreateProperty ? <PlusCircle className="mr-4 h-5 w-5" /> : <Lock className="mr-4 h-5 w-5" />}
                                {canCreateProperty ? 'Create a New Property' : 'Upgrade to Add More'}
                             </Link>
                        </Button>
                         <Button asChild variant="secondary" className="w-full justify-start h-14 text-base">
                             <Link href="/dashboard/properties">
                                <ArrowRight className="mr-4 h-5 w-5" />
                                View All Properties
                             </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

        </div>
    </main>
  );
}
