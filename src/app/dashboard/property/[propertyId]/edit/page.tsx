'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { propertyFormSchema, PropertyFormValues, mediaFormSchema, MediaFormValues } from '@/lib/schemas';
import { useUser, useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useTransition } from 'react';
import { Loader2, Sparkles, MapPin, Save, EyeOff, Beaker, Trash2, Image as ImageIcon, PlusCircle } from 'lucide-react';
import { FirestoreProperty, Review } from '@/lib/types';
import { handleGenerateContent } from '@/app/actions';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

function ManageMediaGallery({ property }: { property: FirestoreProperty }) {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const propertyRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'properties', propertyId) : null),
    [firestore, propertyId]
  );
  
  const form = useForm<MediaFormValues>({
    resolver: zodResolver(mediaFormSchema),
    defaultValues: {
      url: '',
    },
  });
  
  const handleAddImage = async (values: MediaFormValues) => {
    if (!propertyRef || !property) return;
    setIsSubmitting(true);
    
    const newMedia = [...(property.media || []), values.url];

    const updatedData = { media: newMedia };

    updateDoc(propertyRef, updatedData)
        .then(() => {
            toast({ title: 'Image Added!' });
            form.reset();
        })
        .catch(serverError => {
             const permissionError = new FirestorePermissionError({
                path: propertyRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  const handleDelete = async () => {
    if (!imageToDelete || !propertyRef || !property) return;
    
    const updatedMedia = property.media.filter(url => url !== imageToDelete);
    const updatedData = { media: updatedMedia };

    updateDoc(propertyRef, updatedData)
        .then(() => {
            toast({ title: "Image Deleted" });
        })
        .catch(serverError => {
             const permissionError = new FirestorePermissionError({
                path: propertyRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsDeleteDialogOpen(false);
            setImageToDelete(null);
        });
  };

  const openDeleteDialog = (url: string) => {
    setImageToDelete(url);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <Card>
        <CardHeader>
            <CardTitle>Image Gallery</CardTitle>
            <CardDescription>Add or remove images for your property gallery.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddImage)} className="space-y-4 mb-6">
                    <FormField
                        control={form.control}
                        name="url"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>New Image URL</FormLabel>
                            <FormControl>
                                <Input placeholder="https://images.unsplash.com/..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Add Image
                    </Button>
                </form>
            </Form>

             {property?.media && property.media.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.media.map((url, index) => (
                        <Card key={index} className="overflow-hidden group relative">
                           <div className="aspect-square relative">
                                <Image src={url} alt={`Property image ${index + 1}`} fill className="object-cover"/>
                           </div>
                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button size="icon" variant="destructive" onClick={() => openDeleteDialog(url)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                           </div>
                        </Card>
                    ))}
                </div>
             ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                    <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                    <p>No images added yet.</p>
                </div>
             )}
        </CardContent>

         <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this image from your property gallery.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
}


export default function EditPropertyPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const propertyRef = useMemoFirebase(
    () => (firestore && propertyId ? doc(firestore, 'properties', propertyId) : null),
    [firestore, propertyId]
  );
  
  const {
    data: firestoreProperty,
    isLoading: isPropertyLoading,
  } = useDoc<FirestoreProperty>(propertyRef);

  
  if (isUserLoading || isPropertyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (!firestoreProperty) {
    return null; // The layout handles the not found case.
  }

  return <EditPropertyForm firestoreProperty={firestoreProperty} />
}

function EditPropertyForm({ firestoreProperty }: { firestoreProperty: FirestoreProperty }) {
  const propertyId = firestoreProperty.id;
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, startGenerating] = useTransition();
  const [isSeeding, setIsSeeding] = useState(false);
  const [aiKeywords, setAiKeywords] = useState('');
  const [propertyType, setPropertyType] = useState('Villa');

  const propertyRef = useMemoFirebase(
    () => (firestore && propertyId ? doc(firestore, 'properties', propertyId) : null),
    [firestore, propertyId]
  );

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: '',
      address: '',
      description: '',
      amenities: '',
      rules: '',
    },
  });

  useEffect(() => {
    if (firestoreProperty) {
        form.reset({
            name: firestoreProperty.name,
            address: firestoreProperty.address,
            description: firestoreProperty.description || '',
            amenities: firestoreProperty.amenities || '',
            rules: firestoreProperty.rules || '',
        });
    }
  }, [firestoreProperty, form])

  const onGenerate = () => {
    startGenerating(async () => {
        if (!aiKeywords) {
            toast({
                variant: 'destructive',
                title: 'Keywords required',
                description: 'Please enter some keywords for the AI.'
            });
            return;
        }

        try {
            const result = await handleGenerateContent({
                keywords: aiKeywords,
                propertyType: propertyType
            });
            form.setValue('description', result.description, { shouldValidate: true });
            form.setValue('amenities', result.amenities, { shouldValidate: true });
            form.setValue('rules', result.rules, { shouldValidate: true });
            toast({
                title: 'Content Generated!',
                description: 'The AI filled out the property details for you.'
            });
        } catch(error) {
            console.error("AI Generation Error: ", error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: 'The AI failed to generate content. Please try again.'
            });
        }
    })
  }

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          form.setValue('address', `${latitude}, ${longitude}`, { shouldValidate: true });
          toast({
            title: 'Location Captured',
            description: 'Address has been set to your current coordinates.',
          });
        },
        () => {
          toast({
            variant: 'destructive',
            title: 'Location Error',
            description: 'Unable to retrieve your location. Please grant permission or enter manually.',
          });
        }
      );
    } else {
      toast({
        variant: 'destructive',
        title: 'Geolocation Not Supported',
        description: 'Your browser does not support geolocation.',
      });
    }
  };

  const onSubmit = async (values: PropertyFormValues, status: 'draft' | 'published') => {
    if (!user || !propertyRef) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to update a property."
        });
        return;
    }
    setIsSubmitting(true);
    
    const updatedPropertyData = {
        ...values,
        status: status,
    };

    updateDoc(propertyRef, updatedPropertyData).then(() => {
        toast({
            title: status === 'published' ? "Property Published!" : "Property Updated!",
            description: `${values.name} has been successfully saved.`,
        });
    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: propertyRef.path,
            operation: 'update',
            requestResourceData: updatedPropertyData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  const handleSeedReview = async () => {
    if (!firestore || !user || !firestoreProperty) {
        toast({ variant: "destructive", title: "Seeding Failed", description: "Firestore not available, user not logged in, or property not loaded." });
        return;
    }
    setIsSeeding(true);
    
    const sampleReviewData: Omit<Review, 'id' | 'createdAt' | 'stayDate'> & { stayDate: string } = {
        propertyId: propertyId,
        ownerId: user.uid,
        reviewerName: "Alex Smith (Sample)",
        rating: 4,
        comment: "This is a sample review to test the system. The location was great, and the cleanliness was acceptable.",
        status: "published",
        stayDate: new Date().toISOString(),
        ratingAccuracy: 4,
        ratingCheckIn: 5,
        ratingCleanliness: 3,
        ratingCommunication: 5,
        ratingLocation: 5,
        ratingValue: 4
    };
    
    const reviewsRef = collection(firestore, 'properties', propertyId, 'reviews');

    addDoc(reviewsRef, { ...sampleReviewData, createdAt: serverTimestamp() })
        .then(() => {
            toast({ title: "Sample Review Added", description: "A sample visitor review has been added."});
        })
        .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: reviewsRef.path,
                operation: 'create',
                requestResourceData: sampleReviewData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSeeding(false);
        });
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
         <form
          onSubmit={(e) => {
            e.preventDefault();
            const submitter = (e.nativeEvent as any).submitter as HTMLButtonElement;
            const status = submitter.value as 'draft' | 'published';
            form.handleSubmit((values) => onSubmit(values, status))();
          }}
          className="space-y-6"
        >
          <Card>
              <CardHeader>
                  <CardTitle>AI Content Generator</CardTitle>
                  <CardDescription>Give the AI keywords to automatically generate content for your property.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                       <div className="space-y-2 sm:col-span-2">
                           <Label htmlFor="ai-keywords">Keywords</Label>
                           <Input 
                              id="ai-keywords"
                              value={aiKeywords}
                              onChange={(e) => setAiKeywords(e.target.value)}
                              placeholder="e.g., beachfront, modern, family-friendly"
                           />
                       </div>
                       <div className="space-y-2">
                           <Label htmlFor="property-type">Property Type</Label>
                            <Select value={propertyType} onValueChange={setPropertyType}>
                              <SelectTrigger id="property-type">
                                  <SelectValue placeholder="Select a property type" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Villa">Villa</SelectItem>
                                  <SelectItem value="Apartment">Apartment</SelectItem>
                                  <SelectItem value="Studio">Studio</SelectItem>
                                  <SelectItem value="Cabin">Cabin</SelectItem>
                                  <SelectItem value="House">House</SelectItem>
                              </SelectContent>
                          </Select>
                       </div>
                  </div>
                   <Button type="button" onClick={onGenerate} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Generate with AI
                  </Button>
              </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>Update the basic details for your property.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., The Oceanfront Villa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                     <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder="123 Ocean Drive, Malibu, CA" {...field} />
                      </FormControl>
                      <Button type="button" variant="outline" className="shrink-0" onClick={handleUseLocation}>
                          <MapPin className="mr-2 h-4 w-4" />
                          Use Current Location
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Content Details</CardTitle>
                  <CardDescription>Provide the detailed information that will be shown to your visitors.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                          <Textarea rows={5} placeholder="Describe your property in a way that appeals to guests..." {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="amenities"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Amenities</FormLabel>
                      <FormControl>
                          <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormDescription>
                          Enter a comma-separated list of amenities (e.g., Fast WiFi, Pool, Free Parking).
                      </FormDescription>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="rules"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>House Rules</FormLabel>
                      <FormControl>
                          <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormDescription>
                          Enter a period-separated list of house rules (e.g., No smoking. No parties.).
                      </FormDescription>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </CardContent>
          </Card>
          
          <div className="flex justify-end gap-2 mt-6">
               {firestoreProperty.status === 'draft' ? (
                  <>
                      <Button type="submit" value="draft" variant="secondary" disabled={isSubmitting || isGenerating}>
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Save Draft
                      </Button>
                      <Button type="submit" value="published" disabled={isSubmitting || isGenerating}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Publish
                      </Button>
                  </>
               ) : (
                  <>
                      <Button type="submit" value="draft" variant="secondary" disabled={isSubmitting || isGenerating}>
                           {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <EyeOff className="mr-2 h-4 w-4" />}
                          Unpublish
                      </Button>
                      <Button type="submit" value="published" disabled={isSubmitting || isGenerating}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                      </Button>
                  </>
               )}
          </div>
        </form>
      </Form>

      {/* This component is now outside the main form */}
      <ManageMediaGallery property={firestoreProperty} />

      <Card>
          <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Actions for testing and debugging.</CardDescription>
          </CardHeader>
          <CardContent>
               <Button variant="outline" size="sm" type="button" onClick={handleSeedReview} disabled={isSeeding}>
                    {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Beaker className="mr-2 h-4 w-4" />}
                    Seed Sample Review
                </Button>
          </CardContent>
      </Card>
    </div>
  );
}
