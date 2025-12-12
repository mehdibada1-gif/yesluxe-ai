
'use server';

import { answerVisitorQuestion } from '@/ai/flows/answer-visitor-question';
import { getFirebase } from '@/firebase/server-init';
import {
  doc,
  runTransaction,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { nanoid } from 'nanoid';

type GetAIAnswerInput = {
  propertyId: string;
  question: string;
  userId: string;
};

/**
 * This server action provides an AI-driven answer based on property details.
 * It calls the single, robust Genkit flow responsible for the RAG pattern
 * and handles all message logging.
 */
export async function getAIAnswer(
  input: GetAIAnswerInput
): Promise<{ answer: string }> {
  'use server';

  const { propertyId, question, userId } = input;
  let aiAnswer: string;

  try {
    const { answer } = await answerVisitorQuestion({
      propertyId: propertyId,
      question,
    });
    aiAnswer = answer || "I'm sorry, I was unable to process that request.";
  } catch (error) {
    console.error('Error getting AI answer, logging user message anyway.', error);
    aiAnswer =
      "I'm sorry, an error occurred while processing your request. The property owner has been notified.";
    // Still log the user's question even if the AI fails
    await logMessages(propertyId, userId, question, aiAnswer, false);
    // Re-throw to inform the client
    throw error;
  }

  // Log both the question and the successful answer.
  await logMessages(propertyId, userId, question, aiAnswer, true);

  return {
    answer: aiAnswer,
  };
}

/**
 * Logs the user question and assistant answer to Firestore within a transaction.
 */
async function logMessages(
  propertyId: string,
  userId: string,
  question: string,
  answer: string,
  incrementUsage: boolean
) {
  const { firestore } = await getFirebase();
  const propertyRef = doc(firestore, 'properties', propertyId);
  const clientRef = doc(firestore, 'clients', userId);
  const chatLogRef = doc(propertyRef, 'chatLogs', userId);

  const userMessage = {
    id: nanoid(),
    role: 'user' as const,
    content: question,
    createdAt: serverTimestamp(),
  };

  const assistantMessage = {
    id: nanoid(),
    role: 'assistant' as const,
    content: answer,
    createdAt: serverTimestamp(),
  };

  try {
    await runTransaction(firestore, async (transaction) => {
      const propertyDoc = await transaction.get(propertyRef);
      if (!propertyDoc.exists()) {
        throw new Error(`Property with ID ${propertyId} does not exist.`);
      }

      const ownerId = propertyDoc.data()?.ownerId;
      if (!ownerId) {
        throw new Error(`Owner ID not found on property ${propertyId}.`);
      }

      const clientDoc = await transaction.get(clientRef);
      if (!clientDoc.exists()) {
        transaction.set(clientRef, {
          id: userId,
          ownerId: ownerId,
          name: `Visitor (${userId.substring(0, 6)})`,
        });
      } else if (!clientDoc.data()?.ownerId) {
        transaction.update(clientRef, { ownerId: ownerId });
      }

      const chatDoc = await transaction.get(chatLogRef);
      if (chatDoc.exists()) {
        transaction.update(chatLogRef, {
          messages: arrayUnion(userMessage, assistantMessage),
          lastUpdatedAt: serverTimestamp(),
        });
      } else {
        transaction.set(chatLogRef, {
          clientId: userId,
          propertyId: propertyId,
          messages: [userMessage, assistantMessage],
          lastUpdatedAt: serverTimestamp(),
        });
      }

      // Increment general AI message count only on a successful AI response
      if (incrementUsage) {
        transaction.update(propertyRef, { messageCount: (propertyDoc.data().messageCount || 0) + 1 });
      }
    });
  } catch (error) {
    console.error('Error logging messages in transaction:', error);
    // We don't re-throw here because the client has already received the answer.
    // This is a background logging failure.
  }
}
