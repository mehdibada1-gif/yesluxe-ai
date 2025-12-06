'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { faqFormSchema, FaqFormValues } from '@/lib/schemas';
import { FirestoreFAQ, FirestoreProperty } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { useDoc } from '@/firebase';

export default function ManageFaqsPage({ params }: { params: { propertyId: string }}) {
  const { propertyId } = params;
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FirestoreFAQ | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FirestoreFAQ | null>(null);

  const propertyRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'properties', propertyId) : null),
    [firestore, propertyId]
  );
  
  const faqsQuery = useMemoFirebase(
    () =>
      firestore
        ? collection(firestore, 'properties', propertyId, 'faqs')
        : null,
    [firestore, propertyId]
  );

  const { data: property, isLoading: isPropertyLoading } = useDoc<FirestoreProperty>(propertyRef);
  const { data: faqs, isLoading: areFaqsLoading } = useCollection<FirestoreFAQ>(faqsQuery);
  
  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: {
      question: '',
      answer: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
     if (!isUserLoading && user && property && user.uid !== property.ownerId) {
        toast({ variant: "destructive", title: "Access Denied" });
        router.push('/dashboard/properties');
    }
  }, [user, isUserLoading, property, router, toast]);
  
  useEffect(() => {
    if (editingFaq) {
      form.reset(editingFaq);
    } else {
      form.reset({ question: '', answer: '' });
    }
  }, [editingFaq, form]);

  const onSubmit = async (values: FaqFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    
    const collectionRef = collection(firestore, 'properties', propertyId, 'faqs');

    try {
      if (editingFaq) {
        // This is an update
        const docRef = doc(collectionRef, editingFaq.id);
        await updateDoc(docRef, values);
        toast({ title: 'FAQ Updated!' });
      } else {
        // This is a new FAQ
        const newFaq = { ...values, id: nanoid() };
        const docRef = doc(collectionRef, newFaq.id);
        await setDoc(docRef, newFaq);
        toast({ title: 'FAQ Added!' });
      }
      setEditingFaq(null);
      form.reset();
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast({ variant: "destructive", title: "Save Failed" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!faqToDelete || !firestore) return;
    try {
        const docRef = doc(firestore, 'properties', propertyId, 'faqs', faqToDelete.id);
        await deleteDoc(docRef);
        toast({ title: "FAQ Deleted" });
    } catch (error) {
        console.error("Error deleting FAQ:", error);
        toast({ variant: "destructive", title: "Delete Failed" });
    } finally {
        setIsDeleteDialogOpen(false);
        setFaqToDelete(null);
    }
  };

  const openDeleteDialog = (faq: FirestoreFAQ) => {
    setFaqToDelete(faq);
    setIsDeleteDialogOpen(true);
  };
  
  if (isUserLoading || isPropertyLoading || areFaqsLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
            <Button variant="outline" size="sm" asChild className="mb-4">
                <Link href={`/dashboard/property/${propertyId}`}>&larr; Back to Property</Link>
            </Button>
            <h1 className="text-3xl font-headline font-bold tracking-tight">Manage FAQs</h1>
            <p className="text-muted-foreground">Add, edit, or delete frequently asked questions for "{property?.name}".</p>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle>{editingFaq ? 'Edit FAQ' : 'Add a New FAQ'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="question"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Question</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., What is the Wi-Fi password?" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="answer"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Answer</FormLabel>
                                        <FormControl>
                                            <Textarea rows={4} placeholder="e.g., The network is 'MyVilla' and the password is..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editingFaq ? 'Save Changes' : 'Add FAQ'}
                                    </Button>
                                    {editingFaq && (
                                        <Button type="button" variant="outline" onClick={() => setEditingFaq(null)}>Cancel</Button>
                                    )}
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                 </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Existing FAQs</CardTitle>
                        <CardDescription>Here are the current questions and answers for your property.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {faqs && faqs.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                                {faqs.map(faq => (
                                    <AccordionItem value={faq.id} key={faq.id}>
                                        <AccordionTrigger className="hover:no-underline text-left">
                                            <span className="font-medium flex-1">{faq.question}</span>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <p className="text-muted-foreground pb-4">{faq.answer}</p>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setEditingFaq(faq)}><Edit className="mr-2 h-3 w-3"/> Edit</Button>
                                                <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(faq)}><Trash2 className="mr-2 h-3 w-3"/> Delete</Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                         ) : (
                            <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                                <p>No FAQs added yet.</p>
                                <p className="text-sm">Use the form to add your first one!</p>
                            </div>
                         )}
                    </CardContent>
                </Card>
            </div>
        </div>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the FAQ: "{faqToDelete?.question}"
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </div>
    </main>
  );
}
