'use server';
/**
 * @fileOverview An AI flow to generate a suggested response to a visitor's booking inquiry.
 *
 * - generateBookingInquiryResponse - A function that takes inquiry details and generates a draft response.
 * - GenerateBookingInquiryResponseInput - The input type for the function.
 * - GenerateBookingInquiryResponseOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBookingInquiryResponseInputSchema = z.object({
  visitorName: z.string().describe("The name of the person making the inquiry."),
  recommendationTitle: z.string().describe("The title of the experience or place they want to book."),
  bookingDate: z.string().optional().describe("The visitor's desired booking date, if provided."),
  numberOfPeople: z.number().optional().describe("The number of people in the visitor's party, if provided."),
  notes: z.string().describe("Optional notes provided by the visitor."),
});
export type GenerateBookingInquiryResponseInput = z.infer<typeof GenerateBookingInquiryResponseInputSchema>;

const GenerateBookingInquiryResponseOutputSchema = z.object({
  response: z.string().describe("The AI-generated draft email response for the property owner to use."),
});
export type GenerateBookingInquiryResponseOutput = z.infer<typeof GenerateBookingInquiryResponseOutputSchema>;

export async function generateBookingInquiryResponse(input: GenerateBookingInquiryResponseInput): Promise<GenerateBookingInquiryResponseOutput> {
  return generateBookingInquiryResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBookingInquiryResponsePrompt',
  input: {schema: GenerateBookingInquiryResponseInputSchema},
  output: {schema: GenerateBookingInquiryResponseOutputSchema},
  prompt: `You are a helpful and efficient assistant for a property owner. Your task is to draft a friendly and professional email response to a visitor's booking inquiry.

**Instructions:**
1.  Address the visitor by name ({{visitorName}}).
2.  Thank them for their interest in booking "{{recommendationTitle}}".
3.  Acknowledge any specific details they provided.
    *   If a date was provided, mention it: "for {{bookingDate}}".
    *   If a number of people was provided, mention it: "for a party of {{numberOfPeople}}".
    *   If they left notes, acknowledge them: "{{notes}}".
4.  State that you will check availability and get back to them shortly to confirm the details and finalize the booking.
5.  Keep the tone warm and professional.

Generate a draft response based on this information.`,
});

const generateBookingInquiryResponseFlow = ai.defineFlow(
  {
    name: 'generateBookingInquiryResponseFlow',
    inputSchema: GenerateBookingInquiryResponseInputSchema,
    outputSchema: GenerateBookingInquiryResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    