'use server';

// 🛑 ALL IMPORTS NOW USE FIREBASE-ADMIN or CORE LIBRARIES
import { getFirebaseApp } from '@/firebase/server-init';
import { getFirestore } from 'firebase-admin/firestore';
import type { Message } from '@/lib/types';

// The Timestamp type remains from the client SDK for type safety on the wire
import { Timestamp } from 'firebase/firestore'; 


/**
 * Fetches the chat log for a specific client and property.
 * This runs on the server and is safe to call from client components.
 * @param propertyId The ID of the property.
 * @param clientId The ID of the client (visitor).
 * @returns A promise that resolves with the array of messages.
 */
export async function getChatHistory(propertyId: string, clientId: string): Promise<Message[]> {
    const app = getFirebaseApp();
    const firestore = getFirestore(app);
    
    // 🛑 NEW: Using Admin SDK's .collection() and .doc() methods directly
    const chatRef = firestore.collection('properties')
        .doc(propertyId)
        .collection('chatLogs')
        .doc(clientId);
        
    const docSnap = await chatRef.get(); // Admin SDK's DocumentReference.get()

    if (docSnap.exists) { // Admin SDK uses .exists (boolean), not .exists() (function)
        // The data from firebase-admin SDK might have a different Timestamp type
        const firestoreMessages = (docSnap.data()?.messages || []) as any[];
        
        return firestoreMessages.map((msg: any) => {
            let createdAt: string | Timestamp;
            // Handle both client-side string and server-side Timestamp objects
            if (msg.createdAt && typeof msg.createdAt.toDate === 'function') {
                createdAt = msg.createdAt.toDate().toISOString();
            } else {
                createdAt = msg.createdAt;
            }

            return {
                id: msg.id,
                role: msg.role,
                content: msg.content,
                createdAt: createdAt,
            };
        }).sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
        });

    } else {
        return []; // Return an empty array if no chat log exists
    }
}