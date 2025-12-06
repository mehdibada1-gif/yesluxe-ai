'use client';

import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Message } from '@/lib/types';
import { Loader2, MessageSquare, Bot, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import React from 'react';

type ChatLog = {
    id: string; // The client ID
    messages: Message[];
    clientId: string;
    lastUpdatedAt: { toDate: () => Date };
}

type Client = {
    id: string;
    name: string;
}

function InteractionAccordionItem({ log }: { log: ChatLog }) {
    const firestore = useFirestore();
    const clientRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'clients', log.id) : null),
        [firestore, log.id]
    );
    const { data: client, isLoading } = useDoc<Client>(clientRef);

    const displayName = isLoading ? 'Loading...' : client?.name || `Visitor (${log.id.substring(0, 6)})`;

    // Sort messages by creation time
    const sortedMessages = React.useMemo(() => {
        if (!log.messages) return [];
        return [...log.messages].sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
    }, [log.messages]);

    return (
        <AccordionItem value={log.id}>
            <AccordionTrigger className="hover:no-underline text-left">
                <div className="flex justify-between items-center w-full pr-4">
                    <span className="font-medium flex-1">
                        Conversation with <Badge variant="secondary" className="ml-2 font-mono">{displayName}</Badge>
                    </span>
                    <span className="text-sm text-muted-foreground">{log.messages.length} messages</span>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4 pr-4 max-h-96 overflow-y-auto">
                    {sortedMessages.map(message => (
                    <div
                        key={message.id}
                        className={cn(
                        'flex items-end gap-2',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                    >
                        {message.role === 'assistant' && (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                <Bot size={20}/>
                            </AvatarFallback>
                        </Avatar>
                        )}
                        <div
                        className={cn(
                            'max-w-[75%] rounded-lg p-3 text-sm shadow-sm flex flex-col gap-1',
                            message.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-card border rounded-bl-none'
                        )}
                        >
                        <span>{message.content}</span>
                         {message.createdAt && (
                             <span className="text-xs opacity-70 self-end">
                                {format(message.createdAt.toDate(), 'p')}
                             </span>
                        )}
                        </div>
                        {message.role === 'user' && (
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-accent text-accent-foreground">
                                <UserIcon size={20}/>
                            </AvatarFallback>
                        </Avatar>
                        )}
                    </div>
                    ))}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

export default function ManageInteractionsPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const firestore = useFirestore();

  const chatLogsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'properties', propertyId, 'chatLogs'), orderBy('lastUpdatedAt', 'desc'))
        : null,
    [firestore, propertyId]
  );

  const { data: chatLogs, isLoading: areChatLogsLoading } = useCollection<ChatLog>(chatLogsQuery);
  
  if (areChatLogsLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <>
     {chatLogs && chatLogs.length > 0 ? (
        <Accordion type="single" collapsible className="w-full">
            {chatLogs.map(log => (
                <InteractionAccordionItem log={log} key={log.id} />
            ))}
        </Accordion>
     ) : (
        <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
            <p>No visitor interactions recorded yet.</p>
            <p className="text-sm">Once visitors start chatting, their conversations will appear here.</p>
        </div>
     )}
    </>
  );
}
