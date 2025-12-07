
'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { FirestoreProperty, Message, Owner, FirestoreReview } from '@/lib/types';
import { summarizeClientInteractions } from '@/ai/flows/summarize-client-interactions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Lightbulb, Star, BarChart2, MessageSquare, MessagesSquare, StarIcon } from 'lucide-react';
import Link from 'next/link';
import { marked } from 'marked';
import { Skeleton } from '@/components/ui/skeleton';

type ChatLog = {
    id: string;
    messages: Message[];
    clientId: string;
}

function UpgradeToPro() {
    return (
        <Card className="mt-8 text-center max-w-lg mx-auto">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <BarChart2 className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <CardTitle>Unlock AI-Powered Analytics</CardTitle>
                <CardDescription>
                    This is a feature for Pro and Premium users. Gain valuable insights from your visitor interactions by upgrading your plan.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard/billing">Upgrade to Pro</Link>
                </Button>
            </CardContent>
        </Card>
    )
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  // Fetch owner data to check subscription
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

  // Redirect if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Fetch owner's properties for the dropdown
  const propertiesQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(collection(firestore, 'properties'), where('ownerId', '==', user.uid))
        : null,
    [firestore, user]
  );
  const { data: properties, isLoading: arePropertiesLoading } = useCollection<FirestoreProperty>(propertiesQuery);

  const chatLogsQuery = useMemoFirebase(
    () => (firestore && selectedPropertyId ? collection(firestore, 'properties', selectedPropertyId, 'chatLogs') : null),
    [firestore, selectedPropertyId]
  );
  const { data: chatLogs, isLoading: areChatLogsLoading } = useCollection<ChatLog>(chatLogsQuery);
  
  const reviewsQuery = useMemoFirebase(
    () => (firestore && selectedPropertyId ? query(collection(firestore, 'properties', selectedPropertyId, 'reviews'), where('status', '==', 'published')) : null),
    [firestore, selectedPropertyId]
  );
  const { data: reviews, isLoading: areReviewsLoading } = useCollection<FirestoreReview>(reviewsQuery);


  // Auto-select first property
  useEffect(() => {
    if (properties && properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const totalMessages = useMemo(() => {
    if (!chatLogs) return 0;
    return chatLogs.reduce((acc, log) => acc + log.messages.length, 0);
  }, [chatLogs]);

  const reviewMetrics = useMemo(() => {
    if (!reviews || reviews.length === 0) {
      return { count: 0, average: 0 };
    }
    const count = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const average = totalRating / count;
    return { count, average };
  }, [reviews]);


  const generateSummary = async () => {
    if (!selectedPropertyId || !firestore) {
        toast({
            variant: "destructive",
            title: "Please select a property",
        });
        return;
    }
    
    startGenerating(async () => {
        setSummary(null);
        try {
            if(!chatLogs && !reviews) {
                setSummary("No visitor interactions or reviews found for this property yet.");
                return;
            }

            const interactions = chatLogs?.map(log => ({
                clientId: log.id,
                messages: log.messages,
            })) || [];

            const reviewComments = reviews?.map(review => {
                return {
                    reviewerName: review.reviewerName,
                    rating: review.rating,
                    comment: review.comment
                }
            }) || [];

            const result = await summarizeClientInteractions({ interactions, reviews: reviewComments });
            setSummary(result.summary);

        } catch (error) {
            console.error("Error generating summary:", error);
            toast({
                variant: "destructive",
                title: "Analysis Failed",
                description: "Could not analyze interactions. Please try again."
            });
        }
    });
  };

  const renderMarkdown = (content: string | null) => {
    if (!content) return { __html: '' };
    const rawMarkup = marked.parse(content);
    if (typeof rawMarkup === 'string') {
        return { __html: rawMarkup };
    }
    return { __html: '' };
  };

  const isLoading = isUserLoading || arePropertiesLoading || isOwnerLoading || isSuperAdminLoading;
  const areMetricsLoading = areChatLogsLoading || areReviewsLoading;

  if (isLoading) {
    return (
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }
  
  const hasAnalyticsAccess = isSuperAdmin || owner?.subscriptionTier === 'pro' || owner?.subscriptionTier === 'premium';

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Interaction Analytics
          </h1>
          <p className="text-muted-foreground">
            {hasAnalyticsAccess
              ? "Gain insights from visitor chats and reviews."
              : "Upgrade to Pro to unlock AI-powered insights."
            }
          </p>
        </header>

        {!hasAnalyticsAccess ? (
          <UpgradeToPro />
        ) : (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Select Property</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select
                            value={selectedPropertyId}
                            onValueChange={setSelectedPropertyId}
                            disabled={!properties || properties.length === 0}
                        >
                            <SelectTrigger className="w-full sm:w-[280px]">
                            <SelectValue placeholder="Select a property..." />
                            </SelectTrigger>
                            <SelectContent>
                            {properties?.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {selectedPropertyId && (
                  <>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {areMetricsLoading ? (
                            <>
                                <Card><CardHeader><Skeleton className="h-4 w-24 mb-2"/><Skeleton className="h-6 w-10"/></CardHeader></Card>
                                <Card><CardHeader><Skeleton className="h-4 w-24 mb-2"/><Skeleton className="h-6 w-10"/></CardHeader></Card>
                                <Card><CardHeader><Skeleton className="h-4 w-24 mb-2"/><Skeleton className="h-6 w-10"/></CardHeader></Card>
                                <Card><CardHeader><Skeleton className="h-4 w-24 mb-2"/><Skeleton className="h-6 w-10"/></CardHeader></Card>
                            </>
                        ) : (
                            <>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><MessageSquare className="h-4 w-4"/> Conversations</CardTitle>
                                        <p className="text-2xl font-bold">{chatLogs?.length || 0}</p>
                                    </CardHeader>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><MessagesSquare className="h-4 w-4"/> Total Messages</CardTitle>
                                        <p className="text-2xl font-bold">{totalMessages}</p>
                                    </CardHeader>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><StarIcon className="h-4 w-4"/> Published Reviews</CardTitle>
                                        <p className="text-2xl font-bold">{reviewMetrics.count}</p>
                                    </CardHeader>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground"><Star className="h-4 w-4"/> Average Rating</CardTitle>
                                        <p className="text-2xl font-bold">{reviewMetrics.average > 0 ? reviewMetrics.average.toFixed(1) : 'N/A'}</p>
                                    </CardHeader>
                                </Card>
                            </>
                        )}
                    </div>


                    <Card>
                        <CardHeader>
                            <CardTitle>AI-Powered Summary</CardTitle>
                            <CardDescription>
                            Analyze chat logs and reviews to generate an AI summary with actionable insights for your selected property.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button onClick={generateSummary} disabled={isGenerating || !selectedPropertyId || areMetricsLoading}>
                                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {areMetricsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Analyze All Feedback
                            </Button>
                            
                            {isGenerating && (
                                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center h-60">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="mt-4 text-muted-foreground">The AI is analyzing all feedback...</p>
                                </div>
                            )}
                            
                            {summary && !isGenerating && (
                                <Card className="bg-secondary/50">
                                    <CardHeader className="flex-row items-start gap-4 space-y-0">
                                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0">
                                            <Lightbulb className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>AI Insights</CardTitle>
                                            <CardDescription>Based on all visitor feedback for {properties?.find(p => p.id === selectedPropertyId)?.name}.</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div 
                                            className="prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={renderMarkdown(summary)}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </CardContent>
                    </Card>
                  </>
                )}
            </div>
        )}
      </div>
    </main>
  );
}
