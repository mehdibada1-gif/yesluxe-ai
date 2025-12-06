'use server';
/**
 * @fileOverview An AI flow to generate a suggested response to a visitor's review.
 *
 * - generateReviewResponse - A function that takes review details and generates a draft response.
 * - GenerateReviewResponseInput - The input type for the function.
 * - GenerateReviewResponseOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReviewResponseInputSchema = z.object({
  reviewerName: z.string().describe("The name of the person who left the review."),
  rating: z.number().describe("The star rating (1-5) the visitor gave."),
  comment: z.string().describe("The visitor's full review comment."),
});
export type GenerateReviewResponseInput = z.infer<typeof GenerateReviewResponseInputSchema>;

const GenerateReviewResponseOutputSchema = z.object({
  response: z.string().describe("The AI-generated draft response for the property owner to use."),
});
export type GenerateReviewResponseOutput = z.infer<typeof GenerateReviewResponseOutputSchema>;

export async function generateReviewResponse(input: GenerateReviewResponseInput): Promise<GenerateReviewResponseOutput> {
  return generateReviewResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReviewResponsePrompt',
  input: {schema: GenerateReviewResponseInputSchema},
  output: {schema: GenerateReviewResponseOutputSchema},
  prompt: `You are a professional and courteous property owner. Your task is to draft a response to a visitor's review.

**Instructions:**
1.  Acknowledge the visitor by name ({{reviewerName}}).
2.  Thank them for taking the time to leave a review.
3.  Your tone should reflect the rating they gave ({{rating}} out of 5).
    *   If the rating is high (4 or 5), be warm and appreciative. Mention something positive from their comment if possible.
    *   If the rating is low (1 or 2), be apologetic and professional. Acknowledge their specific complaints from their comment ({{comment}}) and express a commitment to improving. Do not be defensive.
    *   If the rating is neutral (3), be balanced. Thank them for the feedback and acknowledge both positive and negative points if present.
4.  Keep the response concise and professional (around 2-4 sentences).

**Visitor's Review:**
"{{comment}}"

Generate a draft response based on this information.`,
});

const generateReviewResponseFlow = ai.defineFlow(
  {
    name: 'generateReviewResponseFlow',
    inputSchema: GenerateReviewResponseInputSchema,
    outputSchema: GenerateReviewResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
