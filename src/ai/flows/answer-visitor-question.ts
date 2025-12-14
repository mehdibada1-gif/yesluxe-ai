'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPropertyData } from '@/lib/server-actions/get-property-data';
// No need to import the model object if we use the string name
// import { gemini15Flash } from '@genkit-ai/google-genai'; 

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
        const property = await getPropertyData(propertyId);

        if (!property) {
            throw new Error(`Property with ID ${propertyId} not found.`);
        }

        let context = `Property Name: ${property.name}\nDescription: ${property.description}\nAmenities: ${property.amenities.join(', ')}\nRules: ${property.rules.join('. ')}\n\n`;

        property.faqs.forEach(faq => {
            if (faq.question && faq.answer) context += `FAQ: ${faq.question}\nAnswer: ${faq.answer}\n\n`;
        });

        property.recommendations.forEach(rec => {
            if (rec.title && rec.description) context += `Recommendation: ${rec.title}\nDetails: ${rec.description}\n\n`;
        });

        const visitorPrompt = ai.definePrompt(
            {
                name: `visitorQuestionPrompt-${propertyId}`,
                input: { schema: z.object({ question: z.string() }) },
                output: { schema: AnswerVisitorQuestionOutputSchema },
                prompt: `
                    You are a friendly property assistant. Answer based ONLY on the CONTEXT below.
                    If the answer is not in the context, say: "I'm sorry, I don't have information about that."
                    
                    CONTEXT:
                    ${context}

                    USER QUESTION:
                    {{{question}}}
                `,
                // FINAL FIX: Use the fully qualified string name
                model: 'google-genai/gemini-1.5-flash',
            }
        )

        const { output } = await visitorPrompt({ question });
        
        return {
            answer: output?.answer || "I'm sorry, I was unable to process that request.",
        };
    }
);