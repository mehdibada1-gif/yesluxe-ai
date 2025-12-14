
'use server';
/**
 * @fileOverview An AI flow to suggest new FAQs or edits to existing ones for a property.
 *
 * - suggestNewFaqs - A function that takes property context, chat history, and existing FAQs to suggest new ones.
 * - SuggestNewFaqsInput - The input type for the function.
 * - SuggestNewFaqsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

const FaqSuggestionSchema = z.object({
  type: z.enum(['new', 'edit']).describe("The type of suggestion: 'new' for a brand new FAQ, or 'edit' for a modification to an existing one."),
  question: z.string().describe("The suggested question."),
  answer: z.string().describe("The suggested answer."),
  id: z.string().optional().describe("If type is 'edit', the ID of the existing FAQ to be modified."),
  relevance: z.enum(['High', 'Medium', 'Low']).describe("A score indicating the importance of this suggestion."),
  reason: z.string().describe("A brief justification for why this suggestion is being made (e.g., 'Based on 3 recent conversations').")
});

export type Suggestion = z.infer<typeof FaqSuggestionSchema>;

const SuggestNewFaqsInputSchema = z.object({
  propertyContext: z.string().describe('A block of text with the property\'s description, amenities, and rules.'),
  chatLogs: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    createdAt: z.string().optional(),
  })).optional().describe('The recent history of conversations from visitors.'),
  existingFaqs: z.array(z.object({
      id: z.string(),
      question: z.string(),
      answer: z.string(),
  })).describe('A list of FAQs that already exist for the property.'),
});
export type SuggestNewFaqsInput = z.infer<typeof SuggestNewFaqsInputSchema>;

const SuggestNewFaqsOutputSchema = z.object({
  suggestions: z.array(FaqSuggestionSchema).describe('An array of 3-5 suggested new or edited FAQs.'),
});
export type SuggestNewFaqsOutput = z.infer<typeof SuggestNewFaqsOutputSchema>;

const systemPrompt = `You are an AI assistant for a property owner. Your task is to suggest new or improved Frequently Asked Questions (FAQs) based on the provided information.

**Your Goal:** Generate 3-5 high-quality, actionable suggestions.

**CRITICAL RULES:**
1.  **DO NOT suggest a 'new' question if a similar one already exists in the "Existing FAQs" list.** Your new suggestions must be unique.
2.  **Assign a relevance score ('High', 'Medium', 'Low')** to every suggestion based on how critical or frequent the topic seems. 'High' for repeated questions in chat logs, 'Medium' for unclear existing answers, 'Low' for general starter questions.
3.  **Provide a brief 'reason'** for each suggestion.

**How to Generate Suggestions:**

1.  **Analyze Chat Logs (If Provided):**
    *   **For NEW FAQs:** Identify questions visitors are asking that are NOT covered in "Existing FAQs". If a question appears multiple times, its relevance is 'High'. Reason: "Based on N recent conversations."
    *   **For EDITS to Existing FAQs:** Look for conversations where a visitor asks a question, the assistant gives an answer, but the visitor then asks a follow-up question. This implies the original answer was incomplete. Suggest a more comprehensive answer for the existing FAQ. Set type to 'edit'. Relevance: 'Medium' or 'High'. Reason: "Existing answer may be unclear."

2.  **Analyze Property Context (If NO Chat Logs are Provided):**
    *   Generate 3-5 common-sense starter questions a new visitor might have based on the property's description, amenities, and rules.
    *   Ensure these are not duplicates of "Existing FAQs". All starter questions should have a 'Low' relevance. Reason: "General starter question."

**Analyze the following information:**

**Property Context:**
---
{{{propertyContext}}}
---

**Existing FAQs:**
---
{{#if existingFaqs.length}}
  {{#each existingFaqs}}
  ID: {{this.id}}
  Q: {{this.question}}
  A: {{this.answer}}
  ---
  {{/each}}
{{else}}
  No existing FAQs.
{{/if}}

{{#if chatLogs.length}}
**Chat Logs:**
---
  {{#each chatLogs}}
**{{this.role}}:** {{this.content}}
  ---
  {{/each}}
{{/if}}

Based on all of the above, generate a list of new or edited FAQ suggestions.
`;

const suggestNewFaqsFlow = ai.defineFlow(
  {
    name: 'suggestNewFaqsFlow',
    inputSchema: SuggestNewFaqsInputSchema,
    outputSchema: SuggestNewFaqsOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        prompt: systemPrompt,
        model: googleAI.model('gemini-1.5-flash-latest'),
        input: input,
        output: { schema: SuggestNewFaqsOutputSchema },
    });
    return output || { suggestions: [] };
  }
);

// This is the only exported async function.
export async function suggestNewFaqs(input: SuggestNewFaqsInput): Promise<SuggestNewFaqsOutput> {
  return suggestNewFaqsFlow(input);
}
