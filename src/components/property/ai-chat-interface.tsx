
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
import { useUser } from '@/firebase';
import { useParams } from 'next/navigation';
import type { Message, Property } from '@/lib/types';
import { marked } from 'marked';
import { useToast } from '@/hooks/use-toast';
import { getAIAnswer } from '@/app/ai-chat-actions';
import { sendMessage, getChatLog } from '@/services/chatService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const params = useParams();
  const propertyId = params.propertyId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const chatLogQueryKey = ['chatLog', propertyId, user?.uid];

  const { data: messages, isLoading: isHistoryLoading } = useQuery({
    queryKey: chatLogQueryKey,
    queryFn: () => getChatLog(propertyId, user!.uid),
    enabled: !!user,
    select: (firestoreMessages): ClientMessage[] => {
        return firestoreMessages.map(msg => {
            const html = marked.parse(msg.content) as string;
            // Ensure createdAt is always a Date object for consistent sorting
            const createdAt = msg.createdAt instanceof Timestamp 
                ? msg.createdAt.toDate() 
                : new Date(msg.createdAt as any);

            return {
                id: msg.id,
                role: msg.role,
                content: msg.content,
                createdAt: createdAt,
                display: (
                    <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                ),
            };
        });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!user) throw new Error("User not authenticated");
      
      // 1. Send the user's message via the service layer
      await sendMessage(propertyId, question, 'user');

      // 2. Invalidate the query to show the user's message immediately
      await queryClient.invalidateQueries({ queryKey: chatLogQueryKey });

      // 3. Get the AI's response
      const aiResponse = await getAIAnswer({ property, question });
      
      // 4. Send the AI's message to be stored in the database
      // We send it as the 'assistant' role
      await sendMessage(propertyId, aiResponse.answer, 'assistant');

      // 5. Invalidate again to show the AI's message
      await queryClient.invalidateQueries({ queryKey: chatLogQueryKey });
    },
    onError: (error: any) => {
      console.error('Error in sendMessageMutation:', error);
      toast({
          variant: 'destructive',
          title: 'Error Processing Message',
          description: error.message || 'Could not process your message. Please try again later.',
      });
    },
  });

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
    if (!inputValue || !user) return;

    sendMessageMutation.mutate(inputValue);
    setInputValue('');
  };

  const isPending = sendMessageMutation.isPending || isHistoryLoading;

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
            {isHistoryLoading && (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}
            {messages && messages.map(message => (
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
             {sendMessageMutation.isPending && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow">
                  <User className="h-5 w-5" />
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
