
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, writeBatch, onSnapshot, query, orderBy, Timestamp, addDoc, getDoc } from 'firebase/firestore';
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
import { faqFormSchema, FaqFormValues } from '@/lib/schemas';
import { FirestoreFAQ, Owner, FirestoreProperty, Message } from '@/lib/types';
import { Loader2, Trash2, Edit, HelpCircle, Lock, ArrowUpCircle, Sparkles, PlusCircle, Wand2, Send, Bot as BotIcon, User as UserIcon, Dices, Search, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { suggestNewFaqs } from '@/ai/flows/suggest-new-faqs';
import type { Suggestion } from '@/ai/flows/suggest-new-faqs';
import { getAIAnswer } from '@/app/ai-chat-actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';


type ChatLog = {
  id: string;
  messages: Message[];
  lastUpdatedAt: string; // Serialized string
};

type TestMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

// --- Child Components ---

function TestConciergeSandbox({ property, faqs }: { property: FirestoreProperty, faqs: FirestoreFAQ[] }) {
    const [messages, setMessages] = useState<TestMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, startThinking] = useTransition();
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const { user } = useUser();

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const askQuestion = (question: string) => {
        if (!user) return;
        const userMessage: TestMessage = { id: nanoid(), role: 'user', content: question };
        setMessages(prev => [...prev, userMessage]);

        startThinking(async () => {
            try {
                const result = await getAIAnswer({
                    propertyId: property.id,
                    question: question,
                    userId: user.uid,
                });
                const assistantMessage: TestMessage = { id: nanoid(), role: 'assistant', content: result.answer };
                setMessages(prev => [...prev, assistantMessage]);
            } catch (error) {
                console.error("Test chat error:", error);
                const errorMessage: TestMessage = { id: nanoid(), role: 'assistant', content: "Sorry, I had trouble generating a response." };
                setMessages(prev => [...prev, errorMessage]);
            }
        });
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!inputValue) return;
        
        askQuestion(inputValue);
        setInputValue('');
    };
    
    const handleTestRandom = () => {
        if (faqs.length === 0) return;
        const randomFaq = faqs[Math.floor(Math.random() * faqs.length)];
        askQuestion(randomFaq.question);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test Your Concierge</CardTitle>
                <CardDescription>Role-play as a visitor to see how the AI responds to questions.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg p-4 space-y-4 h-96 flex flex-col">
                    <ScrollArea className="flex-1 pr-4" viewportRef={scrollAreaRef}>
                        {messages.length === 0 && (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                Ask a question to start the test.
                            </div>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} className={cn("flex items-start gap-3 mb-4", msg.role === 'user' && "justify-end")}>
                                {msg.role === 'assistant' && <Avatar className="h-8 w-8"><AvatarFallback><BotIcon size={20} /></AvatarFallback></Avatar>}
                                <div className={cn("rounded-lg p-3 text-sm max-w-[80%]", msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                    {msg.content}
                                </div>
                                {msg.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback><UserIcon size={20} /></AvatarFallback></Avatar>}
                            </div>
                        ))}
                         {isThinking && (
                            <div className="flex items-start gap-3 mb-4">
                                <Avatar className="h-8 w-8"><AvatarFallback><BotIcon size={20} /></AvatarFallback></Avatar>
                                <div className="rounded-lg p-3 text-sm bg-muted"><Loader2 className="animate-spin h-5 w-5"/></div>
                            </div>
                        )}
                    </ScrollArea>
                    <form onSubmit={handleSubmit} className="flex gap-2 border-t pt-4">
                        <Input 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="e.g., Is there a coffee maker?"
                            disabled={isThinking}
                        />
                         <Button type="button" variant="outline" size="icon" onClick={handleTestRandom} disabled={isThinking || faqs.length === 0} title="Test a Random FAQ">
                            <Dices className="h-4 w-4"/>
                        </Button>
                        <Button type="submit" size="icon" disabled={isThinking || !inputValue}>
                            <Send className="h-4 w-4"/>
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}

function AISuggestions({ property, existingFaqs, onUseSuggestion, owner }: { property: FirestoreProperty, existingFaqs: FirestoreFAQ[], onUseSuggestion: (suggestion: Suggestion) => void, owner: Owner | null }) {
    const firestore = useFirestore();
    const [isGenerating, startGenerating] = useTransition();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const { toast } = useToast();
    const { user } = useUser();

    const superAdminRef = useMemoFirebase(
      () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
      [firestore, user]
    );
    const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
    const isSuperAdmin = !!superAdminDoc && !isSuperAdminLoading;

    const chatLogsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'properties', property.id, 'chatLogs'), orderBy('lastUpdatedAt', 'desc')) : null),
        [firestore, property.id]
    );
    const { data: chatLogs, isLoading: areChatLogsLoading } = useCollection<ChatLog>(chatLogsQuery);
    
    const hasInteractions = chatLogs && chatLogs.length > 0;
    const hasAnalyticsAccess = isSuperAdmin || owner?.subscriptionTier === 'pro' || owner?.subscriptionTier === 'premium';

    if (!hasAnalyticsAccess) {
        return (
             <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary"/>
                        AI FAQ Suggestions
                    </CardTitle>
                    <CardDescription>
                         Upgrade to Pro to let the AI analyze visitor conversations and suggest new FAQs.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/dashboard/billing">
                            <ArrowUpCircle className="mr-2 h-4 w-4" />
                            Upgrade to Pro
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const getSuggestions = () => {
        startGenerating(async () => {
            setSuggestions([]);
            try {
                const propertyContext = `
                    Description: ${property.description}
                    Amenities: ${property.amenities}
                    Rules: ${property.rules}
                `;

                // Flatten all messages from all chat logs into a single array.
                // Also, ensure all Timestamp objects are converted to ISO strings.
                const allMessages = (chatLogs || []).flatMap(log => 
                    (log.messages || []).map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        createdAt: msg.createdAt instanceof Timestamp 
                            ? msg.createdAt.toDate().toISOString() 
                            : String(msg.createdAt), // Already a string from previous serialization
                    }))
                );

                const result = await suggestNewFaqs({
                    propertyContext,
                    chatLogs: allMessages,
                    existingFaqs,
                });

                if (result.suggestions.length === 0) {
                     toast({ title: "No new suggestions", description: "The AI couldn't find any new questions to suggest right now." });
                } else {
                    setSuggestions(result.suggestions);
                    toast({ title: `${result.suggestions.length} new suggestions found!` });
                }

            } catch (e: any) {
                console.error("Failed to get AI suggestions", e);
                toast({ variant: 'destructive', title: "AI analysis failed", description: e.message || "An unexpected error occurred." });
            }
        })
    };

    const handleUseSuggestion = (suggestion: Suggestion) => {
        onUseSuggestion(suggestion);
        setSuggestions(current => current.filter(s => s.question !== suggestion.question));
    }
    
    const getRelevanceBadgeVariant = (relevance: 'High' | 'Medium' | 'Low') => {
        switch (relevance) {
            case 'High': return 'destructive';
            case 'Medium': return 'default';
            case 'Low': return 'secondary';
            default: return 'secondary';
        }
    }

    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="text-primary"/>
                    AI FAQ Suggestions
                </CardTitle>
                <CardDescription>
                    {hasInteractions 
                        ? "Analyze visitor conversations to find common unanswered questions or suggest improvements to existing FAQs."
                        : "Let the AI suggest some starter FAQs based on your property details."
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button onClick={getSuggestions} disabled={isGenerating || areChatLogsLoading}>
                    {(isGenerating || areChatLogsLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {hasInteractions ? "Analyze Chats & Suggest" : "Suggest Starter FAQs"}
                </Button>

                {suggestions.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <h4 className="font-semibold text-sm">Suggested new FAQs:</h4>
                        {suggestions.map((s, i) => (
                           <Alert key={i} variant="default" className="bg-background">
                                <div className="flex items-center gap-2">
                                     {s.type === 'edit' ? <Edit className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                                    <AlertTitle className="font-bold flex-1">{s.question}</AlertTitle>
                                    <Badge variant={getRelevanceBadgeVariant(s.relevance)}>{s.relevance}</Badge>
                                </div>
                                <AlertDescription className="mt-2">
                                    <p className="text-xs text-muted-foreground italic mb-1">{s.reason}</p>
                                    <p className="mb-3">AI suggests the answer: <em>"{s.answer}"</em></p>
                                    <Button size="sm" variant="outline" onClick={() => handleUseSuggestion(s)}>
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
    );
}

function UpgradePrompt({ plan, itemType }: { plan: 'free' | 'pro', itemType: 'FAQ' | 'recommendation' }) {
    const limits = {
        free: { FAQ: 5, recommendation: 1 },
        pro: { FAQ: Infinity, recommendation: 4 },
    };

    const message = plan === 'free'
        ? `You can add up to ${limits.free[itemType]} ${itemType}s on the Free plan. Please upgrade to the Pro plan to add unlimited FAQs.`
        : `You can add up to ${limits.pro[itemType]} ${itemType}s on the Pro plan. Please upgrade to the Premium plan for unlimited recommendations.`;

    if (!message) return null;

    return (
        <Card className="mt-4 text-center bg-muted/50">
            <CardHeader>
                <div className="flex justify-center mb-2">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">Free Plan Limit Reached</CardTitle>
                <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild size="sm">
                    <Link href="/dashboard/billing"><ArrowUpCircle className="mr-2 h-4 w-4" />Upgrade Plan</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

// --- Main Page Component ---

export default function ManageFaqsPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FirestoreFAQ | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FirestoreFAQ | null>(null);
  const [isGeneratingAnswer, startAnswerGeneration] = useTransition();
  const [faqUsageData, setFaqUsageData] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const propertyRef = useMemoFirebase(() => (firestore ? doc(firestore, 'properties', propertyId) : null), [firestore, propertyId]);
  const { data: property, isLoading: isPropertyLoading } = useDoc<FirestoreProperty>(propertyRef);

  const ownerRef = useMemoFirebase(() => (user ? doc(firestore, 'owners', user.uid) : null), [firestore, user]);
  const { data: owner, isLoading: isOwnerLoading } = useDoc<Owner>(ownerRef);

  const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc && !isSuperAdminLoading;

  const faqsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'properties', propertyId, 'faqs'), orderBy('question'));
  }, [firestore, propertyId]);

  const { data: faqs, isLoading: areFaqsLoading } = useCollection<FirestoreFAQ>(faqsQuery);
  
  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: { question: '', answer: '' },
  });
  
  useEffect(() => {
    if (editingFaq) {
      form.reset(editingFaq);
    } else {
      form.reset({ question: '', answer: '' });
    }
  }, [editingFaq, form]);

  useEffect(() => {
    if (!firestore) return;
    const usageDocRef = doc(firestore, 'properties', propertyId, 'faqs', '--USAGE--');
    const unsubscribe = onSnapshot(usageDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const counts: Record<string, number> = {};
            for (const key in data) {
                if (key.endsWith('_count')) {
                    const faqId = key.replace('_count', '');
                    counts[faqId] = data[key];
                }
            }
            setFaqUsageData(counts);
        }
    });
    return () => unsubscribe();
  }, [firestore, propertyId]);


  const handleUseSuggestion = (suggestion: Suggestion) => {
    if (suggestion.type === 'edit' && suggestion.id) {
        const existing = faqs?.find(f => f.id === suggestion.id);
        if (existing) {
            setEditingFaq(existing);
            form.setValue('question', suggestion.question);
            form.setValue('answer', suggestion.answer);
        }
    } else {
        setEditingFaq(null);
        form.reset({
            question: suggestion.question,
            answer: suggestion.answer,
        });
    }
    toast({ title: "Suggestion loaded", description: "The form has been pre-filled. Review and save the changes." });
  };

  const handleGenerateAnswer = () => {
    const question = form.getValues('question');
    if (!question || !property || !user) {
        toast({ variant: 'destructive', title: "Question needed", description: "Please type a question before generating an answer." });
        return;
    }
    startAnswerGeneration(async () => {
        try {
            const result = await getAIAnswer({ 
                propertyId: property.id, 
                question,
                userId: user.uid,
            });
            form.setValue('answer', result.answer, { shouldValidate: true });
            toast({ title: "Answer Generated!", description: "The AI has drafted an answer for you." });
        } catch (error) {
            console.error("AI Answer Generation Error: ", error);
            toast({ variant: "destructive", title: "Generation Failed" });
        }
    });
  };

  const onSubmit = async (values: FaqFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    
    const collectionRef = collection(firestore, 'properties', propertyId, 'faqs');

    try {
        if (editingFaq) {
            const docRef = doc(collectionRef, editingFaq.id);
            await updateDoc(docRef, values);
            toast({ title: 'FAQ Updated!' });
        } else {
            const newFaqId = nanoid();
            const newFaq = { ...values, id: newFaqId, usageCount: 0 };
            const docRef = doc(collectionRef, newFaq.id);
            await setDoc(docRef, newFaq);
            toast({ title: 'FAQ Added!' });
        }
        setEditingFaq(null);
        form.reset();
    } catch (serverError: any) {
        console.error("Error saving FAQ:", serverError);
        const permissionError = new FirestorePermissionError({
            path: editingFaq ? `properties/${propertyId}/faqs/${editingFaq.id}` : `properties/${propertyId}/faqs`,
            operation: editingFaq ? 'update' : 'create',
            requestResourceData: values,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: "destructive", title: "Save Failed", description: serverError.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!faqToDelete || !firestore) return;
    const docRef = doc(firestore, 'properties', propertyId, 'faqs', faqToDelete.id);
    deleteDoc(docRef)
        .then(() => {
            toast({ title: "FAQ Deleted" });
        })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsDeleteDialogOpen(false);
            setFaqToDelete(null);
        });
  };

  const openDeleteDialog = (faq: FirestoreFAQ) => {
    setFaqToDelete(faq);
    setIsDeleteDialogOpen(true);
  };
  
  const validFaqs = useMemo(() => faqs?.filter(faq => faq.id !== '--USAGE--') || [], [faqs]);

  const filteredFaqs = useMemo(() => {
    if (!searchTerm) return validFaqs;
    return validFaqs.filter(faq => 
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [validFaqs, searchTerm]);

  const chartData = useMemo(() => {
    return validFaqs
        .map(faq => ({ name: faq.question, usage: faq.usageCount || 0 }))
        .filter(item => item.usage > 0)
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5)
        .map(item => ({...item, name: item.name.substring(0, 20) + (item.name.length > 20 ? '...' : '') }));
  }, [validFaqs]);

  const chartConfig = {
    usage: {
      label: "Usage",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const canAddMore = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!owner || !validFaqs) return false;
    if (owner.subscriptionTier === 'free') {
      return validFaqs.length < 5;
    }
    return true; // Pro and Premium can add unlimited
  }, [owner, validFaqs, isSuperAdmin]);
  
  const isLoading = areFaqsLoading || isOwnerLoading || isPropertyLoading || isSuperAdminLoading;
  const hasAnalyticsAccess = isSuperAdmin || owner?.subscriptionTier === 'pro' || owner?.subscriptionTier === 'premium';

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-2">
             <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{editingFaq ? 'Edit FAQ' : 'Add a New FAQ'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {canAddMore || editingFaq ? (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField control={form.control} name="question" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Question</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., What is the Wi-Fi password?" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="answer" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Answer</FormLabel>
                                            <FormControl>
                                                <Textarea rows={4} placeholder="e.g., The network is 'MyVilla' and the password is..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="flex gap-2 flex-wrap">
                                        <Button type="submit" disabled={isSubmitting || isGeneratingAnswer}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {editingFaq ? 'Save Changes' : 'Add FAQ'}
                                        </Button>
                                        <Button type="button" variant="outline" onClick={handleGenerateAnswer} disabled={isSubmitting || isGeneratingAnswer || !form.watch('question')}>
                                            {isGeneratingAnswer ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                                            Generate Answer
                                        </Button>
                                        {editingFaq && (
                                            <Button type="button" variant="ghost" onClick={() => setEditingFaq(null)}>Cancel</Button>
                                        )}
                                    </div>
                                </form>
                            </Form>
                        ) : (
                            <UpgradePrompt plan="free" itemType="FAQ"/>
                        )}
                    </CardContent>
                </Card>

                {property && validFaqs && user && <TestConciergeSandbox property={property} faqs={validFaqs} />}
            </div>
            
            <div className="space-y-8">
                {property && validFaqs && (
                    <AISuggestions property={property} existingFaqs={validFaqs} onUseSuggestion={handleUseSuggestion} owner={owner} />
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Existing FAQs</CardTitle>
                        <CardDescription>Here are the current questions and answers for your property, with usage counts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {chartData.length > 0 && hasAnalyticsAccess ? (
                            <div className="mb-6">
                                <h4 className="text-sm font-medium mb-2">Top 5 Most Used FAQs</h4>
                                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                                    <ResponsiveContainer>
                                        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} axisLine={false} tickLine={false} />
                                            <XAxis type="number" dataKey="usage" allowDecimals={false} tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                cursor={{ fill: 'hsl(var(--muted))' }}
                                                content={<ChartTooltipContent 
                                                    formatter={(_, name, props) => (
                                                        <div className="flex flex-col">
                                                            <span className="font-bold">{props.payload.name}</span>
                                                            <span>Usage: {props.payload.usage}</span>
                                                        </div>
                                                    )}
                                                />}
                                            />
                                            <Bar dataKey="usage" fill="var(--color-usage)" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </div>
                        ): (
                            !hasAnalyticsAccess && validFaqs.length > 0 && (
                                <Alert className="mb-6">
                                    <BarChart2 className="h-4 w-4" />
                                    <AlertTitle>Unlock Usage Analytics</AlertTitle>
                                    <AlertDescription>
                                        Upgrade to the Pro plan to see which of your FAQs are being used the most.
                                        <Button asChild size="sm" className="mt-2 block w-fit">
                                            <Link href="/dashboard/billing">Upgrade Now</Link>
                                        </Button>
                                    </AlertDescription>
                                </Alert>
                            )
                        )}
                        <div className="mb-4 relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search FAQs..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {filteredFaqs && filteredFaqs.length > 0 ? (
                            <div className="space-y-2">
                                {filteredFaqs.map(faq => (
                                    <Card key={faq.id} className="bg-muted/30">
                                        <CardHeader className="p-4">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className="font-medium flex-1">{faq.question}</p>
                                                {hasAnalyticsAccess && <Badge variant="secondary">Used {faq.usageCount || 0} times</Badge>}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <p className="text-muted-foreground text-sm">{faq.answer}</p>
                                        </CardContent>
                                        <CardFooter className="p-4 pt-0 flex gap-2">
                                             <Button size="sm" variant="outline" onClick={() => setEditingFaq(faq)}><Edit className="mr-2 h-3 w-3"/> Edit</Button>
                                             <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(faq)}><Trash2 className="mr-2 h-3 w-3"/> Delete</Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                                <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                                <p>No FAQs {searchTerm ? 'match your search' : 'added yet'}.</p>
                                {searchTerm ? (
                                    <Button variant="link" onClick={() => setSearchTerm('')}>Clear search</Button>
                                ) : (
                                    <p className="text-sm">Use the form to add your first one!</p>
                                )}
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
  );
}
