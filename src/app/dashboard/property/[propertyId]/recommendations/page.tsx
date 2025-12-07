
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { nanoid } from 'nanoid';
import { recommendationFormSchema, RecommendationFormValues } from '@/lib/schemas';
import { FirestoreRecommendation, Owner, RecommendationCategory, FirestoreProperty } from '@/lib/types';
import { Loader2, Trash2, Edit, Sparkles, Link as LinkIcon, Lock, ArrowUpCircle, Image as ImageIcon, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { suggestExperiencesAndRecommendations } from '@/ai/flows/ai-suggests-experiences-and-recommendations';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

const recommendationCategories: RecommendationCategory[] = ['Restaurant', 'Activity', 'Cafe', 'Sightseeing', 'Shopping', 'Other'];

function AISuggestions({ property, onUseSuggestion }: { property: FirestoreProperty, onUseSuggestion: (values: Partial<RecommendationFormValues>) => void }) {
    const { toast } = useToast();
    const [isGenerating, startGenerating] = useTransition();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);

    const getSuggestions = () => {
        if (!query) {
            toast({ variant: 'destructive', title: "Query required", description: "Please enter what you're looking for." });
            return;
        }
        startGenerating(async () => {
            try {
                const propertyDetails = `The property is located at ${property.address}.`;
                const result = await suggestExperiencesAndRecommendations({
                    guestQuery: query,
                    propertyDetails: propertyDetails,
                });
                
                if (result.suggestions && result.suggestions.length > 0) {
                    setSuggestions(result.suggestions);
                    toast({ title: 'AI Suggestions Ready!', description: 'Review the suggestions below.' });
                } else {
                    toast({ title: 'No Suggestions Found', description: 'The AI could not find any suggestions for your query.' });
                }

            } catch (e: any) {
                console.error("AI Suggestion Error:", e);
                toast({ variant: 'destructive', title: "AI Error", description: "Could not generate suggestions." });
            }
        });
    }

    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> AI Assistant</CardTitle>
                <CardDescription>Get recommendations for experiences, restaurants, or local tours near your property.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="ai-query">I'm looking for...</Label>
                    <Input 
                        id="ai-query"
                        placeholder="e.g., family-friendly restaurants"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <Button onClick={getSuggestions} disabled={isGenerating}>
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Get Suggestions
                </Button>
                {suggestions.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <h4 className="font-semibold text-sm">Suggestions:</h4>
                        {suggestions.map((s, i) => (
                           <Alert key={i} variant="default" className="bg-background">
                                <AlertTitle className="font-bold">{s.title}</AlertTitle>
                                <AlertDescription className="mt-2">
                                    <p className="mb-3"><em>"{s.description}"</em></p>
                                    <Button size="sm" variant="outline" onClick={() => onUseSuggestion(s)}>
                                        <PlusCircle className="mr-2 h-4 w-4"/>
                                        Use Suggestion
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}


function UpgradePrompt({ plan, itemType }: { plan: 'free' | 'pro', itemType: 'FAQ' | 'recommendation' }) {
    const limits = {
        free: { FAQ: 5, recommendation: 1 },
        pro: { FAQ: Infinity, recommendation: 4 },
    };

    const planLimits = limits[plan];
    const itemLimit = planLimits ? planLimits[itemType] : 0;

    const message = plan === 'free'
        ? `You can add up to ${itemLimit} ${itemType} on the Free plan. Please upgrade to the Pro plan to add more.`
        : `You can add up to ${itemLimit} ${itemType}s on the Pro plan. Please upgrade to the Premium plan for unlimited recommendations.`;

    if (!message) return null;

    return (
        <Card className="mt-4 text-center bg-muted/50">
            <CardHeader>
                <div className="flex justify-center mb-2">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">Plan Limit Reached</CardTitle>
                <CardDescription>
                    {message}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild size="sm">
                    <Link href="/dashboard/billing">
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                        Upgrade Plan
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}

export default function ManageRecommendationsPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<FirestoreRecommendation | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FirestoreRecommendation | null>(null);

  const propertyRef = useMemoFirebase(() => (firestore ? doc(firestore, 'properties', propertyId) : null), [firestore, propertyId]);
  const { data: property, isLoading: isPropertyLoading } = useDoc<FirestoreProperty>(propertyRef);

  const ownerRef = useMemoFirebase(
    () => (user ? doc(firestore, 'owners', user.uid) : null),
    [firestore, user]
  );
  const { data: owner } = useDoc<Owner>(ownerRef);

    const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc && !isSuperAdminLoading;

  const recommendationsQuery = useMemoFirebase(
    () =>
      firestore
        ? collection(firestore, 'properties', propertyId, 'recommendations')
        : null,
    [firestore, propertyId]
  );

  const { data: recommendations, isLoading: areRecommendationsLoading } = useCollection<FirestoreRecommendation>(recommendationsQuery);

  const form = useForm<RecommendationFormValues>({
    resolver: zodResolver(recommendationFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Activity',
      imageUrl: '',
      link: '',
    },
  });

  useEffect(() => {
    if (editingItem) {
      form.reset(editingItem);
    } else {
      form.reset({ title: '', description: '', category: 'Activity', imageUrl: '', link: '' });
    }
  }, [editingItem, form]);
  
  const handleUseSuggestion = (values: Partial<RecommendationFormValues>) => {
    form.reset({ ...form.getValues(), ...values });
    toast({ title: "Suggestion loaded into form." });
  };

  const onSubmit = async (values: RecommendationFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const collectionRef = collection(firestore, 'properties', propertyId, 'recommendations');
    
    if (editingItem) {
        const docRef = doc(collectionRef, editingItem.id);
        updateDoc(docRef, values)
          .then(() => {
            toast({ title: 'Recommendation Updated!' });
          })
          .catch(serverError => {
            const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'update',
              requestResourceData: values,
            });
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
            setIsSubmitting(false);
            setEditingItem(null);
            form.reset();
          });
      } else {
        const newItem = { ...values, id: nanoid() };
        const docRef = doc(collectionRef, newItem.id);
        setDoc(docRef, newItem)
          .then(() => {
            toast({ title: 'Recommendation Added!' });
          })
          .catch(serverError => {
            const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'create',
              requestResourceData: newItem,
            });
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => {
            setIsSubmitting(false);
            form.reset();
          });
      }
  };

  const handleDelete = async () => {
    if (!itemToDelete || !firestore) return;
    const docRef = doc(firestore, 'properties', propertyId, 'recommendations', itemToDelete.id);
    deleteDoc(docRef)
        .then(() => {
            toast({ title: "Recommendation Deleted" });
        })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
        });
  };

  const openDeleteDialog = (item: FirestoreRecommendation) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };
  
  const canAddMore = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!owner || !recommendations) return false;
    if (owner.subscriptionTier === 'free') {
      return recommendations.length < 1;
    }
    if (owner.subscriptionTier === 'pro') {
        return recommendations.length < 4;
    }
    return true; // Premium can add unlimited
  }, [owner, recommendations, isSuperAdmin]);

  if (areRecommendationsLoading || isPropertyLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-2">
            <Card>
            <CardHeader>
                <CardTitle>{editingItem ? 'Edit Recommendation' : 'Add Recommendation'}</CardTitle>
            </CardHeader>
            <CardContent>
                {canAddMore || editingItem ? (
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Best Local Coffee" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="category" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {recommendationCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} placeholder="e.g., A cozy cafe with artisanal brews..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="imageUrl" render={({ field }) => (
                            <FormItem><FormLabel>Image URL (Optional)</FormLabel><FormControl><Input placeholder="https://images.unsplash.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="link" render={({ field }) => (
                            <FormItem><FormLabel>Website Link (Optional)</FormLabel><FormControl><Input placeholder="https://example.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="flex gap-2">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingItem ? 'Save Changes' : 'Add Recommendation'}
                        </Button>
                        {editingItem && (
                            <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                        )}
                        </div>
                    </form>
                    </Form>
                ) : (
                    <UpgradePrompt plan={owner?.subscriptionTier as 'free' | 'pro'} itemType="recommendation" />
                )}
            </CardContent>
            </Card>

            {property && <AISuggestions property={property} onUseSuggestion={handleUseSuggestion} />}
        </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Your Recommendations</CardTitle>
            <CardDescription>A curated list of local spots to share with your visitors.</CardDescription>
        </CardHeader>
        <CardContent>
            {recommendations && recommendations.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
                {recommendations.map(item => (
                <Card key={item.id} className="bg-secondary/50 flex flex-col">
                    {item.imageUrl && (
                        <div className="aspect-video relative w-full">
                            <Image src={item.imageUrl} alt={item.title} fill className="object-cover rounded-t-lg" />
                        </div>
                    )}
                    <CardHeader className="flex-row justify-between items-start">
                        <div>
                            <Badge variant="outline" className="mb-2">{item.category}</Badge>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <div className="flex gap-2">
                             <Button size="sm" variant="outline" onClick={() => setEditingItem(item)}><Edit className="mr-2 h-3 w-3"/> Edit</Button>
                             <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(item)}><Trash2 className="mr-2 h-3 w-3"/> Delete</Button>
                        </div>
                         {item.link && (
                            <a href={item.link} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm">
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Visit Site
                                </Button>
                            </a>
                        )}
                    </CardFooter>
                </Card>
                ))}
            </div>
            ) : (
            <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p>No recommendations added yet.</p>
                <p className="text-sm">Use the form to add your first curated experience!</p>
            </div>
            )}
        </CardContent>
        </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the recommendation: "{itemToDelete?.title}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
