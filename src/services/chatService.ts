
'use server';

import { initializeFirebase } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { getDoc, doc, Timestamp } from 'firebase/firestore';
import type { Message } from '@/lib/types';


// Get the functions and firestore instances once and reuse them
const { functions, firestore } = initializeFirebase();

/**
 * Sends a message to the secure Cloud Function.
 * This is now a standalone exported function to prevent bundling issues.
 * @param propertyId The ID of the property being discussed.
 * @param content The text content of the message.
 * @param role The role of the sender ('user' or 'assistant').
 * @returns The result from the Cloud Function call.
 */
export async function sendMessage(propertyId: string, content: string, role: 'user' | 'assistant') {
  if (!propertyId || !content) {
    throw new Error('Property ID and content are required.');
  }

  if (!functions) {
      throw new Error('Firebase Functions service is not available.');
  }

  try {
    const sendMessageCallable = httpsCallable(functions, 'sendMessage');
    const response = await sendMessageCallable({
      propertyId: propertyId,
      question: content, // The Cloud Function expects 'question'
      role: role,
    });
    return response.data;
  } catch (error) {
    console.error('Error calling sendMessage function:', error);
    // Re-throw the error so the calling component can handle it
    throw error;
  }
}

/**
 * Fetches the chat log for a specific client and property.
 * @param propertyId The ID of the property.
 * @param clientId The ID of the client (visitor).
 * @returns A promise that resolves with the array of messages.
 */
export async function getChatLog(propertyId: string, clientId: string): Promise<Message[]> {
  if (!firestore) {
    throw new Error('Firestore service is not available.');
  }
  const chatRef = doc(firestore, 'properties', propertyId, 'chatLogs', clientId);
  const docSnap = await getDoc(chatRef);

  if (docSnap.exists()) {
    const firestoreMessages = (docSnap.data().messages || []) as Message[];
    // Sort messages by creation time, handling both Timestamp and string dates
    return [...firestoreMessages].sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
        return timeA - timeB;
    });
  } else {
    return []; // Return an empty array if no chat log exists
  }
}
