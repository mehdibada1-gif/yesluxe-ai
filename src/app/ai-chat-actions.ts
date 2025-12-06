
'use server';

import { ai } from '@/ai/genkit';
import { getFirebase } from '@/firebase/server-init';
import { collection, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import type { Property, FirestoreFAQ } from '@/lib/types';
import { findRelevantFaq } from '@/ai/flows/find-relevant-faq';

// The input now requires the entire property object.
type GetAIAnswerInput = {
  property: Property;
  question: string;
};

/**
 * Fetches all FAQs for a given property.
 * @param propertyId The ID of the property.
 * @returns A promise that resolves to an array of FAQ objects.
 */
async function getFaqs(propertyId: string): Promise<FirestoreFAQ[]> {
  const { firestore } = getFirebase();
  const faqRef = collection(firestore, 'properties', propertyId, 'faqs');
  const snap = await getDocs(faqRef);
  if (snap.empty) {
    return [];
  }
  return snap.docs.map(doc => doc.data() as FirestoreFAQ).filter(faq => faq.id !== '--USAGE--');
}


/**
 * This server action provides an AI-driven answer based on property details.
 * It now uses a two-stage process:
 * 1. Attempt to find a specific answer from an existing FAQ.
 * 2. If no relevant FAQ is found, fall back to a general AI response using the full property context.
 */
export async function getAIAnswer(
  input: GetAIAnswerInput
): Promise<{ answer: string; usedFaqIds: string[] }> {
  'use server';

  const { property, question } = input;
  const { firestore } = getFirebase();

  // --- STAGE 1: Find a relevant FAQ ---
  const faqs = await getFaqs(property.id);

  if (faqs.length > 0) {
    const relevantFaqResult = await findRelevantFaq({
      question: question,
      faqs: faqs,
      propertyId: property.id
    });
    
    if (relevantFaqResult.faqId) {
      const matchedFaq = faqs.find(faq => faq.id === relevantFaqResult.faqId);
      if (matchedFaq) {
        console.log(`Found relevant FAQ: ${matchedFaq.id}`);
        // The `findRelevantFaq` flow now handles incrementing the usage count.
        return {
          answer: matchedFaq.answer,
          usedFaqIds: [matchedFaq.id],
        };
      }
    }
  }
  
  // --- STAGE 2: Fallback to General AI Response ---
  console.log("No relevant FAQ found, falling back to general AI response.");
  
  const faqContent = faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n') || 'No FAQs available.';

  const propertyContext = `
    Property Name: ${property.name}
    Description: ${property.description}
    Amenities: ${Array.isArray(property.amenities) ? property.amenities.join(', ') : property.amenities}
    House Rules: ${Array.isArray(property.rules) ? property.rules.join('. ') : property.rules}
  `.trim();

  const recommendationsContent = property.recommendations?.map(rec => 
    `Title: ${rec.title}\nDescription: ${rec.description}${rec.link ? `\nLink: ${rec.link}` : ''}`
  ).join('\n\n') || 'No recommendations have been added by the owner.';

  const prompt = `
    You are a helpful and friendly property assistant chatbot. Your goal is to answer visitor questions accurately based on the information provided.

    **Instructions:**
    1. First, check the "FAQ" section to see if there is a direct answer to the user's question. This is your primary source of truth for specific queries.
    2. If the question is about experiences, activities, or places to go, check the "Owner's Recommendations" section.
    3. If the question is more general or not covered in the FAQs or recommendations, use the information in the "Property Context" section.
    4. If the answer cannot be found in any section, respond with: "I don't have this information. Please contact the property owner."
    5. Do NOT invent facts or details. Answer using only the content provided.

    ---
    ## Property Context
    ${propertyContext}
    ---
    ## FAQ (Frequently Asked Questions)
    ${faqContent}
    ---
    ## Owner's Recommendations
    ${recommendationsContent}
    ---

    ## Client question:
    ${question}

    Now, provide a helpful answer based on these instructions.
  `;

  const propertyRef = doc(firestore, 'properties', property.id);
  try {
    // Increment the general message counter for this fallback response.
    await updateDoc(propertyRef, {
      messageCount: increment(1)
    });
  } catch (error) {
    console.error(`Failed to increment message count for property ${property.id}:`, error);
  }

  const { text } = await ai.generate({
    prompt: prompt,
    model: 'googleai/gemini-2.5-flash',
  });

  return {
    answer: text || "I'm sorry, I was unable to process that request.",
    usedFaqIds: [], // No specific FAQ was used in this fallback path.
  };
}
