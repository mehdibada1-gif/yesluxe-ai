'use server';
/**
 * @fileOverview An AI flow to generate compelling marketing content for a property listing.
 *
 * - generatePropertyContent - A function that takes keywords and generates a description, amenities, and rules.
 * - GeneratePropertyContentInput - The input type for the generatePropertyContent function.
 * - GeneratePropertyContentOutput - The return type for the generatePropertyContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePropertyContentInputSchema = z.object({
  keywords: z.string().describe('A comma-separated list of keywords describing the property (e.g., "beachfront, modern, family-friendly").'),
  propertyType: z.string().describe('The type of property (e.g., "Villa, Apartment, Cabin").'),
});
export type GeneratePropertyContentInput = z.infer<typeof GeneratePropertyContentInputSchema>;

const GeneratePropertyContentOutputSchema = z.object({
  description: z.string().describe('A compelling, well-written property description based on the keywords, optimized for attracting guests. Should be around 100-150 words.'),
  amenities: z.string().describe('A comma-separated list of suggested amenities suitable for the property type and keywords. Example: Fast WiFi, Pool, Free Parking, Air Conditioning.'),
  rules: z.string().describe('A period-separated list of standard house rules. Example: No smoking. No parties or events. Quiet hours after 10 PM.'),
});
export type GeneratePropertyContentOutput = z.infer<typeof GeneratePropertyContentOutputSchema>;

export async function generatePropertyContent(input: GeneratePropertyContentInput): Promise<GeneratePropertyContentOutput> {
  return generatePropertyContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePropertyContentPrompt',
  input: {schema: GeneratePropertyContentInputSchema},
  output: {schema: GeneratePropertyContentOutputSchema},
  prompt: `You are an expert real estate copywriter. Your task is to generate compelling content for a new property listing.

**Instructions:**
1.  **Analyze Keywords and Type:** Use the provided keywords and property type to understand the property's key features.
2.  **Generate Description:** Write an engaging and attractive property description of about 100-150 words. Highlight the key features from the keywords.
3.  **Suggest Amenities:** Provide a comma-separated list of common and desirable amenities for this type of property.
4.  **Suggest House Rules:** Provide a period-separated list of standard and essential house rules.

**Property Type:** {{propertyType}}
**Keywords:** {{keywords}}

Generate the description, amenities, and rules based on this information.`,
});

const generatePropertyContentFlow = ai.defineFlow(
  {
    name: 'generatePropertyContentFlow',
    inputSchema: GeneratePropertyContentInputSchema,
    outputSchema: GeneratePropertyContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
