
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollectionGroup, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collectionGroup, query, where, doc, updateDoc } from 'firebase/firestore';
import { Loader2, ShieldAlert, Check, X, User, Calendar, CornerDownRight, Star as StarIcon } from 'lucide-react';
import { FirestoreReview } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { StarRating } from '@/components/property/star-rating';
import { useRouter } from 'next/navigation';

export default function ModerationPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    
    // Securely check if the current user is a SuperAdmin.
    const superAdminRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
        [firestore, user]
    );
    const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
    const isSuperAdmin = !!superAdminDoc && !isSuperAdminLoading;

    useEffect(() => {
        if (!isUserLoading && !isSuperAdminLoading && !isSuperAdmin) {
            toast({ variant: 'destructive', title: 'Access Denied' });
            router.push('/dashboard');
        }
    }, [isUserLoading, isSuperAdminLoading, isSuperAdmin, toast, router]);

    const reportedReviewsQuery = useMemoFirebase(
        () => (firestore && isSuperAdmin ? query(collectionGroup(firestore, 'reviews'), where('status', '==', 'reported')) : null),
        [firestore, isSuperAdmin]
    );

    const { data: reviews, isLoading: areReviewsLoading } = useCollectionGroup<FirestoreReview>(reportedReviewsQuery);

    const handleReviewAction = async (review: FirestoreReview, newStatus: 'published' | 'archived') => {
        if (!firestore) return;
        setIsUpdating(review.id);

        const reviewRef = doc(firestore, 'properties', review.propertyId, 'reviews', review.id);
        
        try {
            await updateDoc(reviewRef, { status: newStatus });
            toast({
                title: 'Review Updated',
                description: `The review has been ${newStatus}.`,
            });
        } catch (error) {
            console.error("Error updating review status:", error);
            toast({ variant: "destructive", title: "Update Failed" });
        } finally {
            setIsUpdating(null);
        }
    };
    
    const isLoading = isUserLoading || isSuperAdminLoading || areReviewsLoading;

    if (isLoading) {
        return (
         <main className="flex-1 p-4 md:p-6 lg:p-8">
           <div className="flex items-center justify-center h-full min-h-[calc(100vh-10rem)]">
             <Loader2 className="h-8 w-8 animate-spin" />
           </div>
         </main>
       );
     }

    if (!isSuperAdmin) return null; // Redirecting

    return (
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Content Moderation</h1>
                    <p className="text-muted-foreground">
                        Review and take action on reviews that have been reported by property owners.
                    </p>
                </header>

                 <Card>
                    <CardHeader>
                        <CardTitle>Reported Reviews Queue</CardTitle>
                        <CardDescription>
                            {reviews?.length ?? 0} review(s) require your attention.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {reviews && reviews.length > 0 ? (
                            <div className="space-y-6">
                                {reviews.map(review => (
                                    <Card key={review.id} className="bg-muted/30">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                        <CardTitle className="text-lg flex items-center gap-2">
                                                            <User className="h-4 w-4 text-muted-foreground"/> {review.reviewerName}
                                                        </CardTitle>
                                                        <CardDescription className="flex items-center gap-2 text-xs mt-1">
                                                            <Calendar className="h-3 w-3"/>
                                                            {format(review.createdAt instanceof Date ? review.createdAt : review.createdAt.toDate(), 'PPP')}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <StarRating rating={review.rating} />
                                            </div>
                                            <Card className="mt-4 bg-destructive/10 border-destructive/50">
                                                <CardContent className="p-3">
                                                    <p className="text-sm font-semibold text-destructive">Report Reason:</p>
                                                    <p className="text-sm text-destructive/90">{review.reportReason}</p>
                                                </CardContent>
                                            </Card>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-foreground italic">"{review.comment}"</p>
                                            
                                            {review.ownerResponse && (
                                                <Card className="mt-4 bg-background/70">
                                                    <CardHeader className="p-4">
                                                        <CardDescription className="flex items-center gap-2 text-xs">
                                                            <CornerDownRight className="h-4 w-4" /> Original Owner Response
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-0">
                                                        <p className="text-sm text-muted-foreground italic">"{review.ownerResponse}"</p>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </CardContent>
                                         <CardFooter className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleReviewAction(review, 'published')} disabled={isUpdating === review.id}>
                                                {isUpdating === review.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}
                                                Approve (Re-publish)
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleReviewAction(review, 'archived')} disabled={isUpdating === review.id}>
                                                {isUpdating === review.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <X className="mr-2 h-4 w-4"/>}
                                                Reject (Archive)
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
                                <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground mb-4"/>
                                <p className="font-semibold">All clear!</p>
                                <p className="text-sm">There are no reported reviews in the queue.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
