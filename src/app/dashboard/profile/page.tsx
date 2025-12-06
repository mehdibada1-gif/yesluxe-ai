

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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ownerProfileSchema, OwnerProfileValues } from '@/lib/schemas';
import { useUser, useFirestore, useAuth, errorEmitter, useDoc, useFunctions } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2, Save, User, Mail, Phone, Building, Globe, Briefcase, Facebook, Instagram, Linkedin, MessageSquare, Image as ImageIcon, Shield } from 'lucide-react';
import { Owner } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { FirestorePermissionError } from '@/firebase/errors';
import { httpsCallable } from 'firebase/functions';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ownerRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'owners', user.uid) : null),
    [firestore, user]
  );
  
  const {
    data: owner,
    isLoading: isOwnerLoading,
  } = useDoc<Owner>(ownerRef);

  const form = useForm<OwnerProfileValues>({
    resolver: zodResolver(ownerProfileSchema),
    defaultValues: {
      name: '',
      photoURL: '',
      phoneNumber: '',
      city: '',
      country: '',
      companyName: '',
      description: '',
      facebookUrl: '',
      instagramUrl: '',
      linkedinUrl: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    if (owner) {
        form.reset({
            name: owner.name || user?.displayName || '',
            photoURL: owner.photoURL || user?.photoURL || '',
            phoneNumber: owner.phoneNumber || '',
            city: owner.city || '',
            country: owner.country || '',
            companyName: owner.companyName || '',
            description: owner.description || '',
            facebookUrl: owner.facebookUrl || '',
            instagramUrl: owner.instagramUrl || '',
            linkedinUrl: owner.linkedinUrl || '',
        });
    }
  }, [user, isUserLoading, owner, form, router]);

  const onSubmit = async (values: OwnerProfileValues) => {
    if (!user || !ownerRef || !auth?.currentUser) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You should be logged in to update your profile."
        });
        return;
    }
    setIsSubmitting(true);

    try {
        await updateProfile(auth.currentUser, {
            displayName: values.name,
            photoURL: values.photoURL,
        });

        await updateDoc(ownerRef, values);
        
        toast({
            title: "Profile Updated!",
            description: "Your profile information has been successfully saved.",
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({
            variant: "destructive",
            title: "Something went wrong",
            description: "Could not update your profile. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isLoading = isUserLoading || isOwnerLoading;
  
  if (isLoading) {
    return (
         <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
         </main>
    )
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
         <header className="mb-8">
          <h1 className="text-3xl font-headline font-bold tracking-tight">
            My Profile
          </h1>
          <p className="text-muted-foreground">
            Update your personal details and manage your account.
          </p>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                 <div className="flex items-center gap-4">
                     <Avatar className="h-20 w-20 border">
                        <AvatarImage src={form.watch('photoURL') || user?.photoURL || ''} alt="User Avatar"/>
                         <AvatarFallback className="text-3xl">
                             {owner?.name ? owner.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                         </AvatarFallback>
                     </Avatar>
                     <div className="space-y-1">
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>This information will be displayed to your visitors.</CardDescription>
                     </div>
                 </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="photoURL"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><ImageIcon className="mr-2 h-4 w-4 text-muted-foreground"/> Photo URL</FormLabel>
                        <FormControl>
                            <Input placeholder="https://example.com/your-photo.jpg" {...field} />
                        </FormControl>
                         <FormDescription>Paste a link to a publicly accessible image.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground"/> Full Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormItem>
                         <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/> Email Address</FormLabel>
                         <FormControl>
                            <Input value={user?.email || ''} disabled />
                         </FormControl>
                         <FormDescription>Your email address cannot be changed.</FormDescription>
                    </FormItem>
                     <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground"/> Phone / WhatsApp</FormLabel>
                        <FormControl>
                            <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                         <FormDescription>Prefix with your country code. Ex: +44...</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Briefcase className="mr-2 h-4 w-4 text-muted-foreground"/> Company Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Luxe Properties Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Building className="mr-2 h-4 w-4 text-muted-foreground"/> City</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Los Angeles" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Globe className="mr-2 h-4 w-4 text-muted-foreground"/> Country</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., United States" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><MessageSquare className="mr-2 h-4 w-4 text-muted-foreground"/> Short Bio / Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Tell visitors a little about yourself or your company..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </CardContent>
            </Card>

             <Card>
              <CardHeader>
                <CardTitle>Social Media</CardTitle>
                <CardDescription>Add links to your social media profiles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="facebookUrl"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Facebook className="mr-2 h-4 w-4 text-muted-foreground"/> Facebook URL</FormLabel>
                        <FormControl>
                            <Input placeholder="https://facebook.com/your-profile" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="instagramUrl"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Instagram className="mr-2 h-4 w-4 text-muted-foreground"/> Instagram URL</FormLabel>
                        <FormControl>
                            <Input placeholder="https://instagram.com/your-profile" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center"><Linkedin className="mr-2 h-4 w-4 text-muted-foreground"/> LinkedIn URL</FormLabel>
                        <FormControl>
                            <Input placeholder="https://linkedin.com/in/your-profile" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>
          </form>
        </Form>
      </div>
    </main>
  );
}
