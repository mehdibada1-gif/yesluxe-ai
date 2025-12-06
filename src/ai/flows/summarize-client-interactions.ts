'use server';

/**
 * @fileOverview Summarizes client interactions to identify popular questions and improve guest experience.
 *
 * - summarizeClientInteractions - A function that summarizes client interactions.
 * - SummarizeClientInteractionsInput - The input type for the summarizeClientInteractions function.
 * - SummarizeClientInteractionsOutput - The return type for the summarizeClientInteractions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeClientInteractionsInputSchema = z.object({
  interactions: z
    .array(
      z.object({
        clientId: z.string(),
        messages: z.array(z.object({role: z.enum(['user', 'assistant']), content: z.string()})),
      })
    )
    .describe('Array of client chat interactions, each containing client ID and messages.'),
  reviews: z.array(
    z.object({
      reviewerName: z.string(),
      rating: z.number(),
      comment: z.string(),
    })
  ).describe('Array of visitor reviews for the property.')
});
export type SummarizeClientInteractionsInput = z.infer<typeof SummarizeClientInteractionsInputSchema>;

const SummarizeClientInteractionsOutputSchema = z.object({
  summary: z.string().describe('A summary of the client interactions, identifying popular questions, common issues, and opportunities for improvement. The response should be in well-formatted Markdown.'),
});
export type SummarizeClientInteractionsOutput = z.infer<typeof SummarizeClientInteractionsOutputSchema>;

export async function summarizeClientInteractions(input: SummarizeClientInteractionsInput): Promise<SummarizeClientInteractionsOutput> {
  return summarizeClientInteractionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeClientInteractionsPrompt',
  input: {schema: SummarizeClientInteractionsInputSchema},
  output: {schema: SummarizeClientInteractionsOutputSchema},
  prompt: `You are an AI assistant tasked with analyzing guest feedback for a property owner. Your goal is to provide a concise, actionable summary for the owner by analyzing both chat logs and written reviews.

Based on the data provided below, generate a summary in well-formatted Markdown that highlights:
1.  **Top 3 Most Frequent Questions:** Identify the most common questions visitors are asking in the chat logs.
2.  **Key Themes from Reviews:** Synthesize the main points from the visitor reviews. Note recurring positive feedback (e.g., "Guests consistently praise the location") and recurring negative feedback (e.g., "Several reviews mention issues with cleanliness").
3.  **Potential Guest Frustrations:** Pinpoint any recurring issues, points of confusion, or negative feedback from EITHER the chat logs or the reviews.
4.  **Actionable Recommendations:** Suggest specific, concrete improvements for the property owner. For example, recommend adding a new FAQ, clarifying the property description, addressing a physical issue at the property (like improving WiFi), or highlighting positive features more in marketing.

Keep the summary clear, bulleted, and professional.

**Chat Interactions:**
{{#if interactions.length}}
  {{#each interactions}}
  ---
  **Interaction with Visitor (ID: {{this.clientId}})**
  {{#each this.messages}}
  **{{this.role}}:** {{this.content}}
  {{/each}}
  ---
  {{/each}}
{{else}}
  No chat interactions were recorded.
{{/if}}

**Visitor Reviews:**
{{#if reviews.length}}
  {{#each reviews}}
  ---
  **Review from {{this.reviewerName}} (Rating: {{this.rating}}/5)**
  "{{this.comment}}"
  ---
  {{/each}}
{{else}}
  No reviews were submitted.
{{/if}}
`,
});

const summarizeClientInteractionsFlow = ai.defineFlow(
  {
    name: 'summarizeClientInteractionsFlow',
    inputSchema: SummarizeClientInteractionsInputSchema,
    outputSchema: SummarizeClientInteractionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
