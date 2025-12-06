'use client';

import { useState, useMemo, useTransition } from 'react';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, useUser, useDoc } from '@/firebase';
import { collection, doc, updateDoc, query, orderBy, Timestamp, addDoc, setDoc } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { reviewResponseFormSchema, ReviewResponseFormValues, reportReviewFormSchema, ReportReviewFormValues } from '@/lib/schemas';
import { FirestoreReview, Owner } from '@/lib/types';
import { Loader2, Star, User, Calendar, CornerDownRight, AlertTriangle, ShieldAlert, BarChart2, Lock, Sparkles, Lightbulb, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FirestorePermissionError } from '@/firebase/errors';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import { generateReviewResponse } from '@/ai/flows/generate-review-response';


const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${i < Math.round(rating) ? 'text-primary fill-primary' : 'text-muted-foreground/50'}`}
      />
    ))}
  </div>
);

function ReportReviewForm({ review, onReported }: { review: FirestoreReview, onReported: () => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReportReviewFormValues>({
    resolver: zodResolver(reportReviewFormSchema),
    defaultValues: {
      reportReason: '',
      reportType: undefined,
    },
  });

  const onSubmit = (values: ReportReviewFormValues) => {
    if (!firestore || !review.propertyId) return;
    setIsSubmitting(true);
    
    const category = values.reportType.charAt(0).toUpperCase() + values.reportType.slice(1);
    const finalReportReason = values.reportReason
      ? `${category}: ${values.reportReason}`
      : category;

    const reviewRef = doc(firestore, 'properties', review.propertyId, 'reviews', review.id);
    const updatedData = { 
        status: 'reported' as const,
        reportReason: finalReportReason,
        reportedAt: new Date().toISOString(),
    };

    updateDoc(reviewRef, updatedData)
        .then(() => {
            toast({ title: "Review Reported", description: "The review has been sent to an administrator for moderation." });
            onReported();
        })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: reviewRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
         <FormField
          control={form.control}
          name="reportType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Why are you reporting this review?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-2"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="spam" />
                    </FormControl>
                    <FormLabel className="font-normal">Spam or self-promotion</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="inappropriate" />
                    </FormControl>
                    <FormLabel className="font-normal">Inappropriate or offensive content</FormLabel>
                  </FormItem>
                   <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="fraudulent" />
                    </FormControl>
                    <FormLabel className="font-normal">I believe this review is fraudulent</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="other" />
                    </FormControl>
                    <FormLabel className="font-normal">Other</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reportReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provide additional details (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Please explain why this review should be removed..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Report
            </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

function ReviewResponseForm({ review, onSave }: { review: FirestoreReview, onSave: () => void }) {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, startGenerating] = useTransition();

  const form = useForm<ReviewResponseFormValues>({
    resolver: zodResolver(reviewResponseFormSchema),
    defaultValues: {
      ownerResponse: review.ownerResponse || '',
    },
  });
  
  const handleGenerateResponse = () => {
    startGenerating(async () => {
      try {
        const result = await generateReviewResponse({
          reviewerName: review.reviewerName,
          rating: review.rating,
          comment: review.comment,
        });
        form.setValue('ownerResponse', result.response, { shouldValidate: true });
        toast({ title: "AI Response Generated", description: "The AI has drafted a response for you." });
      } catch (error) {
        console.error("Error generating AI response:", error);
        toast({ variant: "destructive", title: "Generation Failed", description: "Could not generate an AI response." });
      }
    });
  };

  const onSubmit = async (values: ReviewResponseFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    const reviewRef = doc(firestore, 'properties', propertyId, 'reviews', review.id);
    const updatedData = { ownerResponse: values.ownerResponse };

    updateDoc(reviewRef, updatedData)
        .then(() => {
            toast({ title: "Response saved!" });
            onSave();
        })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: reviewRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  return (
     <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4 w-full">
            <FormField
            control={form.control}
            name="ownerResponse"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Your Response</FormLabel>
                <FormControl>
                    <Textarea rows={3} placeholder="Write a public response to this review..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="flex gap-2 flex-wrap">
                <Button type="submit" size="sm" disabled={isSubmitting || isGenerating}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Response
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateResponse} disabled={isSubmitting || isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate with AI
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={onSave} disabled={isSubmitting || isGenerating}>Cancel</Button>
            </div>
        </form>
    </Form>
  )
}

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

function UpgradeToProForAnalytics() {
    return (
        <Card className="text-center mt-6">
            <CardHeader>
                <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <CardTitle>Unlock Detailed Analytics</CardTitle>
                <CardDescription>
                    Upgrade to the Pro plan to see a visual breakdown of your review scores and gain deeper insights.
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

export default function PropertyReviews() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const firestore = useFirestore();
  const { user } = useUser();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();

  const ownerRef = useMemoFirebase(
    () => (user ? doc(firestore, 'owners', user.uid) : null),
    [firestore, user]
  );
  const { data: owner, isLoading: isOwnerLoading } = useDoc<Owner>(ownerRef);

  const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc;

  const reviewsQuery = useMemoFirebase(() => {
    if (!firestore || !propertyId) return null;
    return query(collection(firestore, 'properties', propertyId, 'reviews'), orderBy('createdAt', 'desc'));
  }, [firestore, propertyId]);

  const { data: reviews, isLoading: areReviewsLoading } = useCollection<FirestoreReview>(reviewsQuery);
  
  const publishedReviews = useMemo(() => reviews?.filter(r => r.status === 'published') || [], [reviews]);

  const handleCreateRecommendationFromTip = (tip: string) => {
    if (!firestore) return;
    
    const recRef = collection(firestore, 'properties', propertyId, 'recommendations');
    const newRecId = nanoid();
    const newRec = {
        id: newRecId,
        title: "New Guest Tip",
        description: tip,
        category: "Other" as const
    };

    setDoc(doc(recRef, newRecId), newRec)
        .then(() => {
            toast({
                title: "Recommendation Created",
                description: "A new recommendation has been created from the guest tip. You can edit it in the Recommendations tab.",
            });
        })
        .catch(serverError => {
             const permissionError = new FirestorePermissionError({
                path: `properties/${propertyId}/recommendations/${newRecId}`,
                operation: 'create',
                requestResourceData: newRec,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
  };

  const chartData = useMemo(() => {
    if (!publishedReviews || publishedReviews.length === 0) return [];
    
    const totals = {
      cleanliness: 0, accuracy: 0, checkIn: 0, communication: 0, location: 0, value: 0, count: 0
    };

    let reviewCountWithDetailedRatings = 0;
    publishedReviews.forEach(review => {
      if (review.ratingCleanliness) {
        totals.cleanliness += review.ratingCleanliness;
        totals.accuracy += review.ratingAccuracy || 0;
        totals.checkIn += review.ratingCheckIn || 0;
        totals.communication += review.ratingCommunication || 0;
        totals.location += review.ratingLocation || 0;
        totals.value += review.ratingValue || 0;
        reviewCountWithDetailedRatings++;
      }
    });
    
    if (reviewCountWithDetailedRatings === 0) return [];

    return [
      { category: "Cleanliness", score: totals.cleanliness / reviewCountWithDetailedRatings },
      { category: "Accuracy", score: totals.accuracy / reviewCountWithDetailedRatings },
      { category: "Check-in", score: totals.checkIn / reviewCountWithDetailedRatings },
      { category: "Communication", score: totals.communication / reviewCountWithDetailedRatings },
      { category: "Location", score: totals.location / reviewCountWithDetailedRatings },
      { category: "Value", score: totals.value / reviewCountWithDetailedRatings },
    ].filter(item => item.score > 0);
  }, [publishedReviews]);

  if (areReviewsLoading || isOwnerLoading || isSuperAdminLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const getStatusBadge = (review: FirestoreReview) => {
    const { status } = review;

    switch (status) {
      case 'published':
        return null;
      case 'reported':
        return <Badge variant="destructive">Reported</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      case 'pending':
         return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }
  
  const hasAnalyticsAccess = isSuperAdmin || owner?.subscriptionTier === 'pro' || owner?.subscriptionTier === 'premium';


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <CardTitle>Visitor Reviews</CardTitle>
            <CardDescription>Manage and respond to reviews submitted by your visitors.</CardDescription>
        </CardHeader>
        <CardContent>
            {chartData.length > 0 && hasAnalyticsAccess ? (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Review Score Breakdown</CardTitle>
                        <CardDescription>Average scores across all published reviews.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                           <ResponsiveContainer width="100%" height={250}>
                             <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }}/>
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent 
                                        labelClassName="font-bold"
                                        formatter={(value) => Number(value).toFixed(1)}
                                    />}
                                />
                                <Bar dataKey="score" fill="var(--color-score)" radius={8} />
                            </BarChart>
                           </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            ) : (
                !hasAnalyticsAccess && reviews && reviews.length > 0 && <UpgradeToProForAnalytics />
            )}

            {reviews && reviews.length > 0 ? (
                <div className="space-y-6">
                    {reviews.map(review => {
                        // Safely get the date from the review object
                        let date = new Date(); // Default to now if something goes wrong
                        if (review.createdAt) {
                            if (review.createdAt instanceof Timestamp) {
                                date = review.createdAt.toDate();
                            } else {
                                try {
                                    date = new Date(review.createdAt.toString());
                                } catch (e) {
                                    console.error("Could not parse date:", review.createdAt);
                                }
                            }
                        }

                        return (
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
                                                {format(date, 'PPP')}
                                            </CardDescription>
                                        </div>
                                        {getStatusBadge(review)}
                                    </div>
                                    <StarRating rating={review.rating} />
                                </div>
                                {review.rating <= 2 && review.status === 'published' && (
                                      <Alert variant="destructive" className="mt-4">
                                          <AlertTriangle className="h-4 w-4" />
                                          <AlertTitle>Low Rating</AlertTitle>
                                          <AlertDescription>
                                              This review has a low rating. You may want to respond or report it if it violates policies.
                                          </AlertDescription>
                                      </Alert>
                                )}
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-foreground italic">"{review.comment}"</p>
                                
                                {review.guestTip && (
                                     <Card className="mt-4 bg-primary/5 border-primary/20">
                                         <CardHeader className="p-3 flex-row items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                 <Lightbulb className="h-4 w-4 text-primary" />
                                                 <p className="text-xs font-semibold text-primary">Guest Tip:</p>
                                            </div>
                                             <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-auto px-2 py-1 text-xs"
                                                onClick={() => handleCreateRecommendationFromTip(review.guestTip!)}
                                            >
                                                <PlusCircle className="mr-2 h-3 w-3" />
                                                Create Recommendation
                                            </Button>
                                         </CardHeader>
                                         <CardContent className="p-3 pt-0">
                                             <p className="text-sm text-primary/90 italic">"{review.guestTip}"</p>
                                         </CardContent>
                                     </Card>
                                )}

                                {review.ownerResponse && respondingTo !== review.id && (
                                    <Card className="mt-4 bg-background/70">
                                        <CardHeader className="p-4">
                                            <CardDescription className="flex items-center gap-2 text-xs">
                                                <CornerDownRight className="h-4 w-4" /> Your Response
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <p className="text-sm text-muted-foreground italic">"{review.ownerResponse}"</p>
                                        </CardContent>
                                    </Card>
                                )}
                                {respondingTo === review.id && (
                                  <ReviewResponseForm review={review} onSave={() => setRespondingTo(null)} />
                                )}
                            </CardContent>
                            {respondingTo !== review.id && (
                              <CardFooter className="flex-col sm:flex-row sm:justify-between items-start">
                                  <div className="flex gap-2">
                                      <Button variant="outline" size="sm" onClick={() => setRespondingTo(review.id)} disabled={review.status === 'reported'}>
                                          {review.ownerResponse ? 'Edit Response' : 'Respond'}
                                      </Button>
                                      <Dialog open={reportDialogOpen === review.id} onOpenChange={(isOpen) => setReportDialogOpen(isOpen ? review.id : null)}>
                                          <DialogTrigger asChild>
                                              <Button variant="destructive" size="sm" disabled={review.status === 'reported'}>
                                                  <ShieldAlert className="mr-2 h-4 w-4"/> Report
                                              </Button>
                                          </DialogTrigger>
                                          <DialogContent>
                                              <DialogHeader>
                                                  <DialogTitle>Report Review</DialogTitle>
                                                  <DialogDescription>
                                                      If you believe this review is fraudulent, contains spam, or violates your policies, please select a reason and submit it for moderation.
                                                  </DialogDescription>
                                              </DialogHeader>
                                              <ReportReviewForm review={review} onReported={() => setReportDialogOpen(null)} />
                                          </DialogContent>
                                      </Dialog>
                                  </div>
                              </CardFooter>
                            )}
                        </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                    <Star className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                    <p>No reviews have been submitted yet.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
