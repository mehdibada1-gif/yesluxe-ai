
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError, useCollection, useAuth, useFunctions } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, updateDoc, query, where } from 'firebase/firestore';
import { Owner, FirestoreProperty } from '@/lib/types';
import { Loader2, Star, CheckCircle2, Bot, User, MessageCircle, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { salesInquirySchema, SalesInquiryValues } from '@/lib/schemas';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { nanoid } from 'nanoid';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


const PlanFeature = ({ children, included }: { children: React.ReactNode; included: boolean }) => (
    <li className={cn("flex items-center gap-3", included ? "text-foreground" : "text-muted-foreground line-through")}>
        <CheckCircle2 className={cn("h-5 w-5", included ? "text-primary" : "text-muted-foreground/50")} />
        <span className="text-sm">{children}</span>
    </li>
);

function ContactSalesForm({ setOpen }: { setOpen: (open: boolean) => void }) {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<SalesInquiryValues>({
        resolver: zodResolver(salesInquirySchema),
        defaultValues: {
            name: user?.displayName || '',
            email: user?.email || '',
            companyName: '',
            message: '',
        },
    });

    const onSubmit = (values: SalesInquiryValues) => {
        if (!user || !firestore) {
             toast({
                variant: 'destructive',
                title: 'Not Logged In',
                description: 'You must be logged in to send an inquiry.',
            });
            return;
        }
        setIsSubmitting(true);

        const inquiriesRef = collection(firestore, 'owners', user.uid, 'inquiries');
        const newInquiryId = nanoid();
        const inquiryData = {
            ...values,
            id: newInquiryId,
            status: 'new' as const,
            createdAt: serverTimestamp(),
            ownerId: user.uid, // Add ownerId for collectionGroup queries
        };

        const docRef = doc(inquiriesRef, newInquiryId);
        setDoc(docRef, inquiryData)
            .then(() => {
                toast({
                    title: "Inquiry Sent!",
                    description: "Our sales team will get back to you shortly.",
                });
                setOpen(false);
            })
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'create',
                    requestResourceData: inquiryData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem><FormLabel>Company Name (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea rows={4} placeholder="Tell us about your needs..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Inquiry
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}


export default function BillingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isUpgrading, startUpgradeTransition] = useTransition();
  const [isDowngrading, startDowngradeTransition] = useTransition();
  const [isContactSalesOpen, setContactSalesOpen] = useState(false);
  const [isDowngradeAlertOpen, setIsDowngradeAlertOpen] = useState(false);
  const [downgradeAlertContent, setDowngradeAlertContent] = useState({ title: '', description: '' });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');


  const ownerRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'owners', user.uid) : null),
    [firestore, user]
  );
  const { data: owner, isLoading: isOwnerLoading } = useDoc<Owner>(ownerRef);

  const propertiesQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'properties'), where('ownerId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: properties, isLoading: arePropertiesLoading } = useCollection<FirestoreProperty>(propertiesQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleUpgrade = (tier: 'pro' | 'premium') => {
    if (!user) return;
    startUpgradeTransition(async () => {
      // In a real app, this would redirect to a Stripe Checkout session.
      // We will simulate a successful payment for demonstration.
      toast({
        title: "Redirecting to checkout...",
        description: "In a real app, this would open a Stripe payment link.",
      });
      // For demo, we'll just update the tier directly after a delay.
      setTimeout(() => {
        updateSubscription(tier, 'active');
      }, 2000);
    });
  };

  const updateSubscription = (tier: 'free' | 'pro' | 'premium', status: 'active' | 'inactive') => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not logged in or Firestore not available.' });
      return;
    }
    const ownerRef = doc(firestore, 'owners', user.uid);
    const updatedData = { subscriptionTier: tier, subscriptionStatus: status };

    updateDoc(ownerRef, updatedData)
      .then(() => {
        toast({
          title: 'Subscription Updated!',
          description: `Your account has been changed to the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.`,
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: ownerRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleDowngrade = (toTier: 'free' | 'pro') => {
    const propertyCount = properties?.length ?? 0;
    const limits = { free: 1, pro: 10 };

    if (propertyCount > limits[toTier]) {
        setDowngradeAlertContent({
            title: `Downgrade to ${toTier.charAt(0).toUpperCase() + toTier.slice(1)} Not Allowed`,
            description: `You currently have ${propertyCount} properties. To downgrade, you must have ${limits[toTier]} or fewer properties. Please delete the extra properties from your dashboard.`
        });
        setIsDowngradeAlertOpen(true);
    } else {
        startDowngradeTransition(() => {
            updateSubscription(toTier, 'active');
        });
    }
  };

  if (isUserLoading || isOwnerLoading || arePropertiesLoading) {
    return (
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }

  if (!owner) {
    return (
         <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-center h-full">
                <p>Loading your subscription details...</p>
            </div>
         </main>
    );
  }
  
  const currentPlan = owner.subscriptionTier;

  const plans = {
      pro: { monthly: 29, annually: 290 }, // 12 * 29 = 348. 290 is ~2 months free
      premium: { monthly: 79, annually: 790 }, // 12 * 79 = 948. 790 is ~2 months free
  };

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            Plans & Pricing
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose the plan that's right for your business.
          </p>
        </header>

         <div className="flex justify-center mb-8">
            <Tabs
                value={billingCycle}
                onValueChange={(value) => setBillingCycle(value as 'monthly' | 'annually')}
                className="w-auto"
            >
                <TabsList>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="annually">
                        Annually <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">Save 16%</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Free Plan */}
            <Card className={cn(currentPlan !== 'free' && "border-muted/50")}>
                <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold">Free</CardTitle>
                    <CardDescription>
                        The essentials to get you started with your digital concierge.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-3xl font-bold">
                        $0 <span className="text-lg font-normal text-muted-foreground">/ month</span>
                    </p>
                    <Separator />
                    <ul className="space-y-3">
                        <PlanFeature included={true}>1 property</PlanFeature>
                        <PlanFeature included={true}>
                          <div className='flex items-center gap-1.5'>
                            <MessageCircle className="h-4 w-4" /> 50 AI Messages / mo
                          </div>
                        </PlanFeature>
                        <PlanFeature included={true}>Standard AI Concierge</PlanFeature>
                        <PlanFeature included={true}>Up to 5 FAQs</PlanFeature>
                        <PlanFeature included={true}>1 recommendation</PlanFeature>
                        <PlanFeature included={false}>Enhanced Public Owner Profile</PlanFeature>
                        <PlanFeature included={false}>AI Interaction Analytics & Insights</PlanFeature>
                        <PlanFeature included={false}>Priority Support</PlanFeature>
                    </ul>
                </CardContent>
                <CardFooter>
                     <Button 
                        variant={currentPlan === 'free' ? 'outline' : 'default'} 
                        disabled={currentPlan === 'free' || isDowngrading} 
                        className="w-full"
                        onClick={() => handleDowngrade('free')}
                    >
                        {isDowngrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {currentPlan === 'free' ? 'Your Current Plan' : 'Downgrade to Free'}
                    </Button>
                </CardFooter>
            </Card>
            
            {/* Pro Plan */}
            <Card className={cn("border-primary/50 ring-2 ring-primary/80", currentPlan === 'pro' && "bg-primary/5")}>
                 <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                           Pro
                        </CardTitle>
                        <Badge>Most Popular</Badge>
                    </div>
                    <CardDescription>
                       For growing businesses that need more power and insights.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                           <p className="text-3xl font-bold">
                                ${billingCycle === 'annually' ? Math.round(plans.pro.annually / 12) : plans.pro.monthly}
                           </p>
                           <span className="text-lg font-normal text-muted-foreground">/ month</span>
                        </div>
                        {billingCycle === 'annually' && (
                             <p className="text-sm text-muted-foreground mt-1">Billed as ${plans.pro.annually} per year</p>
                        )}
                    </div>
                    <Separator />
                     <ul className="space-y-3">
                        <PlanFeature included={true}>Up to 10 properties</PlanFeature>
                         <PlanFeature included={true}>
                          <div className='flex items-center gap-1.5'>
                            <MessageCircle className="h-4 w-4" /> 500 AI Messages / mo
                          </div>
                        </PlanFeature>
                        <PlanFeature included={true}>Standard AI Concierge</PlanFeature>
                        <PlanFeature included={true}>Unlimited FAQs</PlanFeature>
                        <PlanFeature included={true}>Up to 4 recommendations</PlanFeature>
                        <PlanFeature included={true}>Enhanced Public Owner Profile</PlanFeature>
                        <PlanFeature included={true}>AI Interaction Analytics & Insights</PlanFeature>
                        <PlanFeature included={false}>Priority Support</PlanFeature>
                    </ul>
                </CardContent>
                <CardFooter>
                    {currentPlan === 'pro' ? (
                         <Button variant="outline" disabled className="w-full">Your Current Plan</Button>
                    ) : (
                         <Button onClick={() => handleUpgrade('pro')} disabled={isUpgrading || currentPlan === 'premium'} className="w-full">
                            {isUpgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {currentPlan === 'free' ? 'Upgrade to Pro' : 'Downgrade to Pro'}
                        </Button>
                    )}
                </CardFooter>
            </Card>

            {/* Premium Plan */}
            <Dialog open={isContactSalesOpen} onOpenChange={setContactSalesOpen}>
                <Card className={cn("border-muted/50", currentPlan === 'premium' && "bg-primary/5")}>
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <Star className="text-amber-500"/> Premium
                            </CardTitle>
                        </div>
                        <CardDescription>
                        Advanced tools for scaling your hospitality business.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-bold">
                                    ${billingCycle === 'annually' ? Math.round(plans.premium.annually / 12) : plans.premium.monthly}
                                </p>
                                <span className="text-lg font-normal text-muted-foreground">/ month</span>
                            </div>
                            {billingCycle === 'annually' && (
                                <p className="text-sm text-muted-foreground mt-1">Billed as ${plans.premium.annually} per year</p>
                            )}
                        </div>
                        <Separator />
                        <ul className="space-y-3">
                            <PlanFeature included={true}>Unlimited properties</PlanFeature>
                             <PlanFeature included={true}>
                              <div className='flex items-center gap-1.5'>
                                <MessageCircle className="h-4 w-4" /> Unlimited AI Messages
                              </div>
                            </PlanFeature>
                            <PlanFeature included={true}>Advanced AI Concierge</PlanFeature>
                            <PlanFeature included={true}>Unlimited FAQs</PlanFeature>
                            <PlanFeature included={true}>Unlimited Recommendations</PlanFeature>
                            <PlanFeature included={true}>Customized Business Profile</PlanFeature>
                            <PlanFeature included={true}>AI Interaction Analytics & Insights</PlanFeature>
                            <PlanFeature included={true}>Priority Support</PlanFeature>
                        </ul>
                    </CardContent>
                    <CardFooter>
                         {currentPlan === 'premium' ? (
                             <Button variant="outline" disabled className="w-full">Your Current Plan</Button>
                         ) : (
                             <Button onClick={() => setContactSalesOpen(true)} variant="outline" className="w-full">Contact Sales</Button>
                         )}
                    </CardFooter>
                </Card>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Contact Sales for Premium</DialogTitle>
                        <DialogDescription>
                            Fill out the form below and our sales team will contact you to discuss your needs for the Premium plan.
                        </DialogDescription>
                    </DialogHeader>
                    <ContactSalesForm setOpen={setContactSalesOpen} />
                </DialogContent>
            </Dialog>
         </div>

      </div>

       <AlertDialog open={isDowngradeAlertOpen} onOpenChange={setIsDowngradeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{downgradeAlertContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {downgradeAlertContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/dashboard/properties">Go to Properties</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </main>
  );
}
