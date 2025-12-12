'use server';

import { getDoc, doc, Timestamp } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { getFirebase } from '@/firebase/server-init';

/**
 * Fetches the chat log for a specific client and property.
 * This runs on the server and is safe to call from client components.
 * @param propertyId The ID of the property.
 * @param clientId The ID of the client (visitor).
 * @returns A promise that resolves with the array of messages.
 */
export async function getChatHistory(propertyId: string, clientId: string): Promise<Message[]> {
  const { firestore } = await getFirebase();
  if (!firestore) {
    throw new Error('Firestore service is not available.');
  }
  const chatRef = doc(firestore, 'properties', propertyId, 'chatLogs', clientId);
  const docSnap = await getDoc(chatRef);

  if (docSnap.exists()) {
    const firestoreMessages = (docSnap.data().messages || []) as Message[];
    // Sort messages by creation time, handling both Timestamp and string dates safely
    return [...firestoreMessages].sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime()) : 0;
        const timeB = b.createdAt ? (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime()) : 0;
        
        // Guard against invalid dates which result in NaN
        if (isNaN(timeA) || isNaN(timeB)) {
            return 0;
        }

        return timeA - timeB;
    });
  } else {
    return []; // Return an empty array if no chat log exists
  }
}
