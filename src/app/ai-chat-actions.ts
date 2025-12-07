
'use server';

import { ai } from '@/ai/genkit';
import { getFirebase } from '@/firebase/server-init';
import { googleAI } from '@genkit-ai/google-genai';
import { Document, nearestNeighbor } from 'genkit';
import type { Property } from '@/lib/types';
import {
  Query,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';

// The input now requires the entire property object.
type GetAIAnswerInput = {
  property: Property;
  question: string;
};

// Define the embedding model. This must match the one used for indexing.
const embedder = googleAI.embedder('text-embedding-004');

/**
 * This server action provides an AI-driven answer based on property details.
 * It uses a RAG (Retrieval-Augmented Generation) pattern.
 *
 * 1.  Embed the user's question into a vector.
 * 2.  Use Firestore Vector Search to find the most relevant text chunks.
 * 3.  Inject these chunks as context into a prompt for the Gemini model.
 * 4.  Return the generated answer.
 */
export async function getAIAnswer(
  input: GetAIAnswerInput
): Promise<{ answer: string; usedFaqIds: string[] }> {
  'use server';

  const { property, question } = input;
  const { firestore } = getFirebase();

  // 1. Embed the user's question
  const questionEmbedding = await ai.embed({
    embedder,
    content: question,
  });

  // 2. Perform vector search on the /propertyVectors collection
  const vectorStoreRef = collection(firestore, 'propertyVectors');

  // Build the query to first filter by propertyId and then find the nearest neighbors.
  const vectorQuery: Query = query(
    vectorStoreRef,
    where('propertyId', '==', property.id),
    nearestNeighbor('embedding', questionEmbedding, {
      limit: 5,
      distanceMeasure: 'COSINE',
    })
  );
  
  const searchResults = await getDocs(vectorQuery);
  
  const contextChunks: string[] = [];
  if (!searchResults.empty) {
      searchResults.docs.forEach(doc => {
          contextChunks.push(doc.data().chunk);
      });
  }
  
  const context = contextChunks.join('\n---\n');

  // 3. Augment the prompt with the retrieved context
  const prompt = `
    You are a helpful and friendly property assistant chatbot. Your goal is to answer visitor questions accurately based ONLY on the information provided in the "CONTEXT" section.

    **CRITICAL INSTRUCTIONS:**
    1.  Base your entire answer on the provided "CONTEXT" section.
    2.  Do NOT use any information outside of the "CONTEXT".
    3.  If the answer to the user's question is not found in the "CONTEXT", you MUST respond with: "I'm sorry, I don't have information about that. Please contact the property owner for more details."
    4.  Keep your answers concise and to the point.

    ---
    CONTEXT:
    ${context || 'No information available.'}
    ---

    USER'S QUESTION:
    ${question}

    Now, provide a helpful answer based on these instructions.
  `;

  // 4. Generate the final answer using the augmented prompt
  const { text } = await ai.generate({
    prompt: prompt,
    model: 'googleai/gemini-2.5-flash',
  });

  return {
    answer: text || "I'm sorry, I was unable to process that request.",
    usedFaqIds: [], // This is no longer applicable in the RAG model.
  };
}
