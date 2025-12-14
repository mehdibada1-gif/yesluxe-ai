
'use server';

import { answerVisitorQuestion } from '@/ai/flows/answer-visitor-question';
import { logChatMessage } from './server-actions/log-chat-message';

type GetAIAnswerInput = {
  propertyId: string;
  question: string;
  userId: string;
};

/**
 * This server action provides an AI-driven answer based on property details.
 * It calls the Genkit flow to get an answer and then triggers a separate,
 * robust server action to log the conversation, ensuring separation of concerns.
 */
export async function getAIAnswer(
  input: GetAIAnswerInput
): Promise<{ answer: string }> {
  'use server';

  const { propertyId, question, userId } = input;

  try {
    // 1. Get the AI-generated answer.
    const { answer } = await answerVisitorQuestion({
      propertyId: propertyId,
      question,
    });
    
    const finalAnswer = answer || "I'm sorry, I was unable to process that request.";

    // 2. Log the conversation in the background using a dedicated server action.
    // We don't await this; it's a fire-and-forget operation.
    logChatMessage({
      propertyId,
      userId,
      question,
      answer: finalAnswer,
      isError: false,
    });
    
    return { answer: finalAnswer };

  } catch (error) {
    console.error('Error getting AI answer:', error);
    
    const errorMessage = "I'm sorry, an error occurred while processing your request. The property owner has been notified.";
    
    // Log the failure in the background.
    logChatMessage({
      propertyId,
      userId,
      question,
      answer: errorMessage,
      isError: true,
    });
    
    // Return a user-friendly error message to the client.
    return { answer: errorMessage };
  }
}
