'use server';

import { getFirebaseApp } from '@/firebase/server-init';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';

interface LogChatMessageInput {
    propertyId: string;
    userId: string;
    question: string;
    answer: string;
    isError: boolean;
}

export async function logChatMessage(input: LogChatMessageInput) {
    const { propertyId, userId, question, answer, isError } = input;
    
    // 1. Get the Admin Firestore instance
    const app = getFirebaseApp();
    const firestore = getFirestore(app);

    // 2. Create references
    const propertyRef = firestore.collection('properties').doc(propertyId);
    const clientRef = firestore.collection('clients').doc(userId);
    const chatLogRef = propertyRef.collection('chatLogs').doc(userId);

    // Generate unique IDs
    const userMessageId = nanoid();
    const assistantMessageId = nanoid();

    // 3. Create message objects
    const userMessage = {
        id: userMessageId,
        role: 'user' as const,
        content: question,
        createdAt: FieldValue.serverTimestamp(),
    };

    const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: answer,
        createdAt: FieldValue.serverTimestamp(),
    };

    try {
        await firestore.runTransaction(async (transaction) => {
            // FIX: Step 1 - ALL READS MUST COME FIRST for Firestore transaction
            const propertyDoc = await transaction.get(propertyRef);
            const clientDoc = await transaction.get(clientRef); 
            const chatDoc = await transaction.get(chatLogRef);
            
            // Early exits based on read data
            if (!propertyDoc.exists) return;
            const ownerId = propertyDoc.data()?.ownerId;
            if (!ownerId) return;

            // Step 2 - WRITES (set/update) COME AFTER ALL READS

            // Check Client (Write: set)
            if (!clientDoc.exists) {
                transaction.set(clientRef, {
                    id: userId,
                    ownerId: ownerId, 
                    name: `Visitor (${userId.substring(0, 6)})`,
                });
            }

            // Update Chat Log (Write: update/set)
            if (chatDoc.exists) {
                transaction.update(chatLogRef, {
                    messages: FieldValue.arrayUnion(userMessage, assistantMessage),
                    lastUpdatedAt: FieldValue.serverTimestamp(),
                });
            } else {
                transaction.set(chatLogRef, {
                    clientId: userId,
                    propertyId: propertyId,
                    messages: [userMessage, assistantMessage],
                    lastUpdatedAt: FieldValue.serverTimestamp(),
                });
            }

            // Update Property Count (Write: update)
            if (!isError) {
                transaction.update(propertyRef, {
                    messageCount: (propertyDoc.data()?.messageCount || 0) + 1,
                });
            }
        });
    } catch (error) {
        console.error('Error in logChatMessage:', error);
    }
}