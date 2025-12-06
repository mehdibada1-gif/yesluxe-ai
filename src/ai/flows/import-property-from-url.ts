'use server';
/**
 * @fileOverview An AI flow to import property content from a public URL.
 *
 * - importPropertyFromUrl - A function that takes a URL and extracts property details.
 * - ImportPropertyFromUrlInput - The input type for the function.
 * - ImportPropertyFromUrlOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ImportPropertyFromUrlInputSchema = z.object({
  url: z.string().url().describe('The URL of the property listing (e.g., from Airbnb, VRBO, or a personal website).'),
});
export type ImportPropertyFromUrlInput = z.infer<typeof ImportPropertyFromUrlInputSchema>;

const ImportPropertyFromUrlOutputSchema = z.object({
  description: z.string().describe('A compelling, well-written property description extracted from the URL content. Should be around 100-150 words.'),
  amenities: z.string().describe('A comma-separated list of amenities extracted from the URL. Example: Fast WiFi, Pool, Free Parking, Air Conditioning.'),
  rules: z.string().describe('A period-separated list of house rules extracted from the URL. Example: No smoking. No parties or events. Quiet hours after 10 PM.'),
});
export type ImportPropertyFromUrlOutput = z.infer<typeof ImportPropertyFromUrlOutputSchema>;

export async function importPropertyFromUrl(input: ImportPropertyFromUrlInput): Promise<ImportPropertyFromUrlOutput> {
  return importPropertyFromUrlFlow(input);
}

const prompt = ai.definePrompt({
  name: 'importPropertyFromUrlPrompt',
  input: { schema: ImportPropertyFromUrlInputSchema },
  output: { schema: ImportPropertyFromUrlOutputSchema },
  prompt: `You are an expert data extraction agent specializing in real estate listings. Your task is to analyze the content of the provided URL and extract key information about a vacation rental property.

**Instructions:**
1.  **Analyze Content:** "Scrape" the content from the provided URL: {{url}}
2.  **Extract Description:** Find the main property description and summarize it into an engaging paragraph of about 100-150 words.
3.  **Extract Amenities:** Identify all listed amenities and format them as a single, comma-separated string.
4.  **Extract House Rules:** Find the house rules and format them as a single, period-separated string.
5.  **Handle Missing Information:** If any piece of information (description, amenities, or rules) cannot be found, return an empty string for that field. Do not invent information.

Analyze the content at the URL and provide the structured output.`,
});

const importPropertyFromUrlFlow = ai.defineFlow(
  {
    name: 'importPropertyFromUrlFlow',
    inputSchema: ImportPropertyFromUrlInputSchema,
    outputSchema: ImportPropertyFromUrlOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
