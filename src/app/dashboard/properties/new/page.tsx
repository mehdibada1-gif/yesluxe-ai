'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { nanoid } from 'nanoid';
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
import { propertyFormSchema, PropertyFormValues } from '@/lib/schemas';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useTransition } from 'react';
import { Loader2, Sparkles, MapPin, Save, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { handleGenerateContent, handleImportFromUrl } from '@/app/actions';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getNextMonthFirstDay } from '@/lib/utils';

export default function NewPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, startGenerating] = useTransition();
  const [isImporting, startImporting] = useTransition();
  const [aiKeywords, setAiKeywords] = useState('');
  const [propertyType, setPropertyType] = useState('Villa');
  const [importUrl, setImportUrl] = useState('');

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
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

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

  const onImport = () => {
    startImporting(async () => {
        if (!importUrl) {
            toast({
                variant: 'destructive',
                title: 'URL required',
                description: 'Please enter a URL to import from.'
            });
            return;
        }

        try {
            const result = await handleImportFromUrl(importUrl);
            form.setValue('description', result.description, { shouldValidate: true });
            form.setValue('amenities', result.amenities, { shouldValidate: true });
            form.setValue('rules', result.rules, { shouldValidate: true });
            toast({
                title: 'Content Imported!',
                description: 'The AI extracted content from the URL and filled out the form.'
            });
        } catch(error) {
            console.error("AI Import Error: ", error);
            toast({
                variant: 'destructive',
                title: 'Import Failed',
                description: 'The AI failed to import content from the URL. Please check the link or try again.'
            });
        }
    });
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
    if (!user || !firestore) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to create a property."
        });
        return;
    }
    setIsSubmitting(true);

    const newPropertyId = nanoid();
    const newPropertyData = {
      ...values,
      id: newPropertyId,
      ownerId: user.uid,
      status: status,
      media: [
        "https://images.unsplash.com/photo-1670589953882-b94c9cb380f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB2aWxsYXxlbnwwfHx8fDE3NjM3NTM1MjZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
        "https://images.unsplash.com/photo-1611094016919-36b65678f3d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBsaXZpbmdyb29tfGVufDB8fHx8MTc2MzgyNjYxNHww&ixlib=rb-4.1.0&q=80&w=1080",
        "https://images.unsplash.com/photo-1696762932825-2737db830bbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8bW9kZXJuJTIwYmVkcm9vbXxlbnwwfHx8fDE3NjM3Mjk4Mjh8MA&ixlib=rb-4.1.0&q=80&w=1080"
      ],
      reviewCount: 0,
      ratingSum: 0,
      averageRating: 0,
      messageCount: 0,
      messageQuotaResetDate: getNextMonthFirstDay(),
    };
    
    const propertyRef = doc(firestore, 'properties', newPropertyId);
    
    setDoc(propertyRef, newPropertyData)
        .then(() => {
            toast({
                title: status === 'published' ? "Property Published!" : "Draft Saved!",
                description: `${values.name} has been successfully saved.`,
            });
            router.push(`/dashboard/property/${newPropertyId}`);
        })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: propertyRef.path,
                operation: 'create',
                requestResourceData: newPropertyData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };
  
  if (isUserLoading || !user) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-headline font-bold tracking-tight">Create a New Property</h1>
            <p className="text-muted-foreground">Fill out the details below to add your property to the platform.</p>
        </div>

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
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>AI Content Assistants</CardTitle>
                    <CardDescription>Use AI to quickly populate your property details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label className="font-semibold">Import from URL</Label>
                        <p className="text-sm text-muted-foreground mb-2">Import from an existing listing like Airbnb.</p>
                        <div className="flex items-center gap-2">
                            <Input 
                                id="import-url"
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                                placeholder="https://airbnb.com/h/your-property"
                            />
                            <Button type="button" onClick={onImport} disabled={isImporting} className="shrink-0">
                                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                                Import
                            </Button>
                        </div>
                    </div>
                     <div>
                        <Label className="font-semibold">Generate from Keywords</Label>
                        <p className="text-sm text-muted-foreground mb-2">Give the AI a few keywords to automatically generate content.</p>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-2 sm:col-span-2">
                                <Input 
                                    id="ai-keywords"
                                    value={aiKeywords}
                                    onChange={(e) => setAiKeywords(e.target.value)}
                                    placeholder="e.g., beachfront, modern, family-friendly"
                                />
                            </div>
                            <div className="space-y-2">
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
                        <Button type="button" onClick={onGenerate} disabled={isGenerating} className="mt-2">
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
                <CardDescription>Start with the basics. You can either fill this out manually or use the AI generator above.</CardDescription>
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
                <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/properties">Cancel</Link>
                </Button>
                <Button type="submit" value="draft" variant="secondary" disabled={isSubmitting || isGenerating || isImporting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save as Draft
                </Button>
                <Button type="submit" value="published" disabled={isSubmitting || isGenerating || isImporting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publish
              </Button>
            </div>

          </form>
        </Form>
      </div>
    </main>
  );
}
