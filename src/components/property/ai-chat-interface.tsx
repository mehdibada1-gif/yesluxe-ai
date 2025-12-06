
'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ArrowRight, Bot, Loader2, User, Speaker } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { nanoid } from 'nanoid';
import { useUser, useFirestore, errorEmitter } from '@/firebase';
import { useParams } from 'next/navigation';
import {
  doc,
  onSnapshot,
  writeBatch,
  Timestamp,
  getDoc,
  arrayUnion,
  collection,
} from 'firebase/firestore';
import type { Message, Property, Client } from '@/lib/types';
import { marked } from 'marked';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { getAIAnswer } from '@/app/ai-chat-actions';

export interface ClientMessage {
  id: string;
  role: 'user' | 'assistant';
  display: ReactNode;
  content: string;
  createdAt: Date;
}

function SpeakButton({ text }: { text: string }) {
  const [isFetching, setIsFetching] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const handleSpeak = async () => {
    setIsFetching(true);
    try {
      const languageCode = navigator.language || 'en-US';
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, languageCode }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audio');
      }
      
      const result = await response.json();

      if (result.media) {
        const newAudio = new Audio(result.media);
        setAudio(newAudio);
        newAudio.play();
      } else {
        toast({
          variant: 'destructive',
          title: 'Audio Error',
          description: 'Could not generate audio for this message.',
        });
      }
    } catch (error) {
      console.error('Failed to get spoken response', error);
      toast({
        variant: 'destructive',
        title: 'Audio Error',
        description: 'An unexpected error occurred while generating audio.',
      });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleSpeak}
      disabled={isFetching}
      className="h-7 w-7 text-muted-foreground shrink-0"
    >
      {isFetching ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Speaker className="h-4 w-4" />
      )}
      <span className="sr-only">Speak</span>
    </Button>
  );
}

export default function AIChatInterface({
  property,
}: {
  property: Property;
}) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const params = useParams();
  const propertyId = params.propertyId as string;
  const { toast } = useToast();

  // Real-time listener for chat messages
  useEffect(() => {
    if (!user || !firestore) return;

    const clientId = user.uid;
    const chatRef = doc(
      firestore,
      'properties',
      propertyId,
      'chatLogs',
      clientId
    );

    const unsubscribe = onSnapshot(
      chatRef,
      docSnap => {
        if (docSnap.exists()) {
          const firestoreMessages = (docSnap.data().messages || []) as Message[];
          
          const clientMessages: ClientMessage[] = firestoreMessages.map(msg => {
            const html = marked.parse(msg.content) as string;
            // Ensure createdAt is a Date object for client-side state
            const createdAtDate = msg.createdAt instanceof Timestamp 
                ? msg.createdAt.toDate() 
                : new Date(msg.createdAt as any);

            return {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              createdAt: createdAtDate,
              display: (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ),
            };
          }).sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime());
          setMessages(clientMessages);
        }
      },
      error => {
        const permissionError = new FirestorePermissionError({
          path: chatRef.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => unsubscribe();
  }, [user, firestore, propertyId, toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue || !user || !firestore) return;

    const question = inputValue;
    setInputValue('');
    setIsPending(true);

    try {
      // 1. Get AI answer via the server action.
      const result = await getAIAnswer({ property, question });
      const aiAnswer = result.answer;

      // 2. Prepare message objects for Firestore
      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: question,
        createdAt: Timestamp.now(),
      };

      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: aiAnswer,
        createdAt: Timestamp.now(),
      };

      // 3. Write messages to Firestore using a batch
      const clientId = user.uid;
      const chatLogsCollection = collection(firestore, 'properties', propertyId, 'chatLogs');
      const chatRef = doc(chatLogsCollection, clientId);
      const clientRef = doc(firestore, 'clients', clientId);

      const chatDoc = await getDoc(chatRef);
      const batch = writeBatch(firestore);

      if (!chatDoc.exists()) {
        const clientData: Client = {
            id: clientId,
            ownerId: property.ownerId, // Denormalize ownerId
            name: `Visitor (${clientId.substring(0, 6)})`,
        };
        batch.set(clientRef, clientData);

        batch.set(chatRef, {
          messages: [userMessage, assistantMessage],
          lastUpdatedAt: Timestamp.now(),
          clientId,
          propertyId,
        });
      } else {
        batch.update(chatRef, {
          messages: arrayUnion(userMessage, assistantMessage),
          lastUpdatedAt: Timestamp.now(),
        });
      }
      
      await batch.commit();

    } catch (error: any) {
      console.error('Chat submission error:', error);
      
      // We don't show a toast for permission errors as they are handled globally
      if (error.code !== 'permission-denied') {
        toast({
            variant: 'destructive',
            title: 'Error sending message',
            description: 'Could not send message. Please try again later.',
        });
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-10rem)] max-h-[800px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot /> Visitor Concierge
        </CardTitle>
        <CardDescription>Ask me anything about this property!</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4" viewportRef={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map(message => (
              <div key={message.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow">
                  {message.role === 'assistant' ? (
                    <Bot className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 rounded-lg border p-3 text-sm">
                  {message.display}
                </div>
                {message.role === 'assistant' && (
                  <SpeakButton text={message.content} />
                )}
              </div>
            ))}
             {isPending && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex-1 rounded-lg border p-3 text-sm flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 pt-4 border-t"
        >
          <Input
            type="text"
            placeholder="e.g., What's the wifi password?"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            disabled={isPending || !user}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isPending || !inputValue || !user}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

    