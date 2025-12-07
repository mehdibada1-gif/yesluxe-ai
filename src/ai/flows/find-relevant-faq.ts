
'use server';
/**
 * @fileOverview An AI flow to find the most relevant FAQ for a visitor's question.
 *
 * - findRelevantFaq - A function that takes a user question and a list of FAQs and returns the ID of the best match.
 * - FindRelevantFaqInput - The input type for the function.
 * - FindRelevantFaqOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebase } from '@/firebase/server-init';


const FindRelevantFaqInputSchema = z.object({
  question: z.string().describe('The visitor\'s question.'),
  faqs: z.array(z.object({
    id: z.string(),
    question: z.string(),
    answer: z.string(),
  })).describe('A list of FAQs to search through.'),
  propertyId: z.string().describe('The ID of the property to which the FAQ belongs.')
});
export type FindRelevantFaqInput = z.infer<typeof FindRelevantFaqInputSchema>;

const FindRelevantFaqOutputSchema = z.object({
  faqId: z.string().optional().describe('The ID of the most relevant FAQ. If no relevant FAQ is found, this can be null.'),
});
export type FindRelevantFaqOutput = z.infer<typeof FindRelevantFaqOutputSchema>;

const systemPrompt = `You are a search expert. Your task is to find the single most relevant FAQ from the provided list that answers the user's question.

CRITICAL INSTRUCTIONS:
1.  **Analyze Intent:** Do not just match keywords. Understand the *intent* behind the user's question. A user asking "wifi password" and "internet code" are asking the same thing. Consider synonyms, typos, and different phrasings.
2.  **Select the Best Match:** Review the "List of Available FAQs" and choose the ONE question that is the closest match to the "User's Question".
3.  **Output ONLY the ID:** Your entire response must be ONLY the ID of the matching FAQ (e.g., "faq_123").
4.  **Handle No Match:** If absolutely no FAQ in the list is a good match for the user's question, and you are not confident in any of them, your entire response must be ONLY the word "null".

- User's Question:
"{{question}}"

- List of Available FAQs:
{{#each faqs}}
- ID: {{this.id}}
  Question: {{this.question}}
{{/each}}

Based on these instructions, what is the ID of the most relevant FAQ?
`;

const findRelevantFaqFlow = ai.defineFlow(
  {
    name: 'findRelevantFaqFlow',
    inputSchema: FindRelevantFaqInputSchema,
    outputSchema: FindRelevantFaqOutputSchema,
  },
  async (input) => {
    const { text } = await ai.generate({
      prompt: systemPrompt,
      model: 'googleai/gemini-2.5-flash',
      input: { question: input.question, faqs: input.faqs },
    });

    const faqId = text.trim();

    if (faqId && faqId !== 'null') {
      try {
        const { functions } = getFirebase();
        const incrementFaqUsage = httpsCallable(functions, 'incrementFaqUsage');
        await incrementFaqUsage({ propertyId: input.propertyId, faqId: faqId });
      } catch (error) {
         console.error(`Failed to trigger increment usage for FAQ ${faqId}:`, error);
         // We don't throw an error here, as failing to increment is not a critical failure for the user.
      }
      return { faqId };
    }
    
    return { faqId: undefined };
  }
);


export async function findRelevantFaq(input: FindRelevantFaqInput): Promise<FindRelevantFaqOutput> {
  return findRelevantFaqFlow(input);
}
