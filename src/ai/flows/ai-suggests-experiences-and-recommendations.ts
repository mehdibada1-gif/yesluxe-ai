'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting experiences, tours, or restaurants near a property based on user preferences.
 *
 * - suggestExperiencesAndRecommendations - A function that orchestrates the process of suggesting experiences and recommendations.
 * - SuggestExperiencesAndRecommendationsInput - The input type for the suggestExperiencesAndRecommendations function.
 * - SuggestExperiencesAndRecommendationsOutput - The return type for the suggestExperiencesAndRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { RecommendationCategory } from '@/lib/types';

const recommendationCategories: [RecommendationCategory, ...RecommendationCategory[]] = ['Restaurant', 'Activity', 'Cafe', 'Sightseeing', 'Shopping', 'Other'];

const SuggestExperiencesAndRecommendationsInputSchema = z.object({
  guestQuery: z.string().describe('The guest\'s query or preferences for experiences, tours, or restaurants.'),
  propertyDetails: z.string().describe('Details about the property, including location and available amenities.'),
});
export type SuggestExperiencesAndRecommendationsInput = z.infer<typeof SuggestExperiencesAndRecommendationsInputSchema>;

const SuggestionSchema = z.object({
    title: z.string().describe('The concise, catchy title of the recommendation.'),
    description: z.string().describe('A brief, one-sentence description of the recommended place or activity.'),
    category: z.enum(recommendationCategories).describe('The most fitting category for the recommendation.'),
});

const SuggestExperiencesAndRecommendationsOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('A list of 2-3 suggested experiences, tours, or restaurants, each with a title, description, and category.'),
});
export type SuggestExperiencesAndRecommendationsOutput = z.infer<typeof SuggestExperiencesAndRecommendationsOutputSchema>;

export async function suggestExperiencesAndRecommendations(
  input: SuggestExperiencesAndRecommendationsInput
): Promise<SuggestExperiencesAndRecommendationsOutput> {
  return suggestExperiencesAndRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestExperiencesAndRecommendationsPrompt',
  input: {schema: SuggestExperiencesAndRecommendationsInputSchema},
  output: {schema: SuggestExperiencesAndRecommendationsOutputSchema},
  prompt: `You are a smart concierge AI for a property. Your task is to suggest 2-3 local experiences, tours, or restaurants based on a user's query and the property's location.

**Instructions:**
1.  Analyze the user's query to understand their interests.
2.  Based on the query and property location, generate a few relevant suggestions.
3.  For each suggestion, provide a short, engaging title and a one-sentence description.
4.  Assign the most appropriate category to each suggestion from the available options.
5.  Return the suggestions in the specified structured format.

**User Query:** {{{guestQuery}}}
**Property Info:** {{{propertyDetails}}}

Generate your suggestions now.`,
});

const suggestExperiencesAndRecommendationsFlow = ai.defineFlow(
  {
    name: 'suggestExperiencesAndRecommendationsFlow',
    inputSchema: SuggestExperiencesAndRecommendationsInputSchema,
    outputSchema: SuggestExperiencesAndRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output || { suggestions: [] };
  }
);
