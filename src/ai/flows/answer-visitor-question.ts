
'use server';
/**
 * @fileOverview This file defines the primary Genkit flow for answering a visitor's question using Retrieval-Augmented Generation (RAG).
 *
 * - answerVisitorQuestion - The main function that orchestrates the RAG process.
 * - AnswerVisitorQuestionInput - The input type for the function.
 * - AnswerVisitorQuestionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPropertyData } from '@/lib/server-actions/get-property-data';
import {
  FirestoreProperty,
  FirestoreFAQ,
  FirestoreRecommendation,
} from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

const AnswerVisitorQuestionInputSchema = z.object({
  propertyId: z.string().describe('The unique ID of the property.'),
  question: z.string().describe("The visitor's question."),
});
export type AnswerVisitorQuestionInput = z.infer<
  typeof AnswerVisitorQuestionInputSchema
>;

const AnswerVisitorQuestionOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the question.'),
});
export type AnswerVisitorQuestionOutput = z.infer<
  typeof AnswerVisitorQuestionOutputSchema
>;

export async function answerVisitorQuestion(
  input: AnswerVisitorQuestionInput
): Promise<AnswerVisitorQuestionOutput> {
  return answerVisitorQuestionFlow(input);
}

const answerVisitorQuestionFlow = ai.defineFlow(
  {
    name: 'answerVisitorQuestionFlow',
    inputSchema: AnswerVisitorQuestionInputSchema,
    outputSchema: AnswerVisitorQuestionOutputSchema,
  },
  async ({ propertyId, question }) => {
    // 1. Fetch all context for the property using the robust server action
    const property = await getPropertyData(propertyId);

    if (!property) {
      throw new Error(`Property with ID ${propertyId} not found or is not published.`);
    }

    // 2. Consolidate text content into a single context string
    let context = `Property Name: ${property.name}\nDescription: ${property.description}\nAmenities: ${property.amenities.join(', ')}\nRules: ${property.rules.join('. ')}\n\n`;

    property.faqs.forEach(faq => {
      if (faq.question && faq.answer) {
        context += `FAQ: ${faq.question}\nAnswer: ${faq.answer}\n\n`;
      }
    });

    property.recommendations.forEach(rec => {
      if (rec.title && rec.description) {
        context += `Recommendation: ${rec.title}\nDetails: ${rec.description}\n\n`;
      }
    });

    // 3. Augment the prompt with the retrieved context
    const prompt = `
      You are a helpful and friendly property assistant chatbot. Your goal is to answer visitor questions accurately based ONLY on the information provided in the "CONTEXT" section.

      **CRITICAL INSTRUCTIONS:**
      1.  Base your entire answer on the provided "CONTEXT" section.
      2.  Do NOT use any information outside of the "CONTEXT".
      3.  If the answer to the user's question is not found in the "CONTEXT", you MUST respond with: "I'm sorry, I don't have information about that. Please contact the property owner for more details."
      4.  Keep your answers concise and to the point.

      ---
      CONTEXT:
      ${context || 'No information available.'}
      ---

      USER'S QUESTION:
      ${question}

      Now, provide a helpful answer based on these instructions.
    `;

    // 4. Generate the final answer using the augmented prompt
    const { text } = await ai.generate({
      prompt: prompt,
      model: googleAI.model('gemini-1.5-flash-preview'),
    });

    return {
      answer: text || "I'm sorry, I was unable to process that request.",
    };
  }
);
