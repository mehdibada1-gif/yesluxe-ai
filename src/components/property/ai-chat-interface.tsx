
'use client';

import { useState, useRef, useEffect, ReactNode, useTransition, useMemo } from 'react';
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
import { useUser } from '@/firebase';
import { useParams } from 'next/navigation';
import type { Message, Property } from '@/lib/types';
import { marked } from 'marked';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { getAIAnswer } from '@/app/ai-chat-actions';
import { getChatHistory } from '@/app/history-actions';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { nanoid } from 'nanoid';

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
  const [isSending, startSending] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const params = useParams();
  const propertyId = params.propertyId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const chatLogQueryKey = ['chatLog', propertyId, user?.uid];

  const { data: fetchedMessages, isLoading: isHistoryLoading } = useQuery({
    queryKey: chatLogQueryKey,
    queryFn: () => getChatHistory(propertyId, user!.uid),
    enabled: !!user,
    select: (firestoreMessages): ClientMessage[] => {
        return firestoreMessages.map(msg => {
            const html = marked.parse(msg.content) as string;
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
                        className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                ),
            };
        });
    }
  });

  const messages = useMemo(() => {
    const welcomeText = `Welcome to ${property.name}! You can use this chat if you have any questions about the property or any feature.`;
    const welcomeMessage: ClientMessage = {
      id: 'welcome-message',
      role: 'assistant',
      content: welcomeText,
      createdAt: new Date(),
      display: (
        <div
            className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0"
            dangerouslySetInnerHTML={{ __html: marked.parse(welcomeText) as string }}
        />
      ),
    };
    
    if (!fetchedMessages || fetchedMessages.length === 0) {
        return [welcomeMessage];
    }
    
    return fetchedMessages;

  }, [fetchedMessages, property.name]);

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

    const question = inputValue;
    setInputValue('');

    startSending(async () => {
        try {
            await getAIAnswer({ propertyId: property.id, question, userId: user.uid });
            await queryClient.invalidateQueries({ queryKey: chatLogQueryKey });

        } catch (error: any) {
            console.error('Error processing message:', error);
            toast({
                variant: 'destructive',
                title: 'Error Processing Message',
                description: error.message || 'Could not process your message. Please try again later.',
            });
            await queryClient.invalidateQueries({ queryKey: chatLogQueryKey });
        }
    });
  };

  const isPending = isSending || isHistoryLoading;

  return (
      <Card className="flex flex-col h-[calc(100vh-10rem)] max-h-[800px] shadow-2xl shadow-black/20">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-3 text-lg">
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarImage src={property.owner?.photoURL} alt={property.owner?.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot />
              </AvatarFallback>
            </Avatar>
            <div>
              Digital Concierge
              <CardDescription>Powered by Yes-Luxe</CardDescription>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
          <ScrollArea className="flex-1 pr-4 -mr-4" viewportRef={scrollAreaRef}>
            <div className="space-y-6">
              {isHistoryLoading && (
                  <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
              )}
              {messages && messages.map(message => (
                <div key={message.id} className="flex items-start gap-3">
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 border">
                      <AvatarImage src={property.owner?.photoURL} alt={property.owner?.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot size={20} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 rounded-lg border bg-card p-3 text-sm shadow-sm max-w-[85%]">
                    {message.display}
                  </div>
                  {message.role === 'assistant' && (
                    <SpeakButton text={message.content} />
                  )}
                   {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User size={20} />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
               {isSending && (
                <div className="flex items-start gap-3 justify-end">
                   <div className="flex-1 rounded-lg border p-3 text-sm bg-primary text-primary-foreground max-w-[85%]">
                     <p>{inputValue}</p>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><User size={20}/></AvatarFallback>
                  </Avatar>
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
              placeholder={!user ? "Authenticating..." : "Ask me anything..."}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={isPending || !user}
              className="flex-1 h-11"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isPending || !inputValue || !user}
              className="h-11 w-11 shrink-0"
            >
              {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            </Button>
          </form>
        </CardContent>
      </Card>
  );
}
