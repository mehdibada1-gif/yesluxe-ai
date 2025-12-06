'use client';

import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { FirestoreProperty, Owner } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, MessageCircle, AlertTriangle, InfinityIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UsagePage() {
    const params = useParams();
    const propertyId = params.propertyId as string;
    const firestore = useFirestore();
    const { user } = useUser();

    const propertyRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'properties', propertyId) : null),
        [firestore, propertyId]
    );
    const { data: property, isLoading: isPropertyLoading } = useDoc<FirestoreProperty>(propertyRef);

    const ownerRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'owners', user.uid) : null),
        [firestore, user]
    );
    const { data: owner, isLoading: isOwnerLoading } = useDoc<Owner>(ownerRef);

    const usageData = useMemo(() => {
        if (!owner || !property) return null;

        const quotas: { [key: string]: number } = { free: 50, pro: 500, premium: Infinity };
        const currentQuota = quotas[owner.subscriptionTier] || 0;
        const used = property.messageCount || 0;
        const percentage = currentQuota === Infinity ? 0 : Math.min((used / currentQuota) * 100, 100) ;
        
        let resetDate: Date | null = null;
        if (property.messageQuotaResetDate) {
            if (property.messageQuotaResetDate instanceof Timestamp) {
                resetDate = property.messageQuotaResetDate.toDate();
            } else if (typeof property.messageQuotaResetDate === 'string') {
                resetDate = new Date(property.messageQuotaResetDate);
            }
        }


        return {
            used,
            quota: currentQuota,
            percentage,
            resetDate: resetDate
        };
    }, [owner, property]);


    if (isPropertyLoading || isOwnerLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!usageData) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>AI Message Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Could not load usage data.</p>
                </CardContent>
            </Card>
         )
    }

    const { used, quota, percentage, resetDate } = usageData;

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    AI Message Usage
                </CardTitle>
                <CardDescription>
                    Track your AI concierge message consumption for the current billing cycle.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {quota === Infinity ? (
                     <div className="flex flex-col items-center justify-center text-center p-8 bg-muted rounded-lg">
                        <InfinityIcon className="h-12 w-12 text-primary" />
                        <p className="text-2xl font-bold mt-4">Unlimited Messages</p>
                        <p className="text-muted-foreground">Your Premium plan includes unlimited AI interactions.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Progress value={percentage} />
                            <div className="flex justify-between text-sm">
                                <p className="font-medium">
                                    <span className="text-xl font-bold">{used}</span> / {quota} messages used
                                </p>
                                {resetDate && (
                                     <p className="text-muted-foreground">
                                        Resets on {format(resetDate, 'PPP')}
                                    </p>
                                )}
                            </div>
                        </div>
                        {(percentage >= 90 || used >= quota) && (
                            <Card className="bg-destructive/10 border-destructive/50">
                                <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
                                    <AlertTriangle className="h-8 w-8 text-destructive" />
                                    <div>
                                        <CardTitle className="text-destructive text-base">
                                            {used >= quota ? 'Quota Limit Reached' : 'Approaching Quota Limit'}
                                        </CardTitle>
                                        <CardDescription className="text-destructive/80 text-xs">
                                             {used >= quota
                                                ? `You have used all ${quota} messages. Upgrade your plan to continue service.`
                                                : `You have used ${Math.round(percentage)}% of your monthly message quota.`
                                             }
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <Button asChild size="sm">
                                        <Link href="/dashboard/billing">Upgrade Plan</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
