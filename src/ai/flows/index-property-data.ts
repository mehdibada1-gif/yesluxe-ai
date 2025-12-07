'use server';
/**
 * @fileOverview A flow for indexing property data for vector search.
 *
 * This flow fetches data for a specific property, chunks it, generates embeddings,
 * and stores them in a dedicated Firestore collection (/propertyVectors).
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {getFirebase} from '@/firebase/server-init';
import {
  FirestoreProperty,
  FirestoreFAQ,
  FirestoreRecommendation,
} from '@/lib/types';
import {chunk} from 'llm-chunk';
import {googleAI} from '@genkit-ai/google-genai';

const IndexPropertyDataInputSchema = z.string().min(1);
export type IndexPropertyDataInput = z.infer<
  typeof IndexPropertyDataInputSchema
>;

const IndexPropertyDataOutputSchema = z.object({
  indexedChunks: z.number(),
  propertyId: z.string(),
});
export type IndexPropertyDataOutput = z.infer<
  typeof IndexPropertyDataOutputSchema
>;

// Define the embedding model. Using text-embedding-004 as recommended.
const embedder = googleAI.embedder('text-embedding-004');

export async function indexPropertyData(
  propertyId: IndexPropertyDataInput
): Promise<IndexPropertyDataOutput> {
  return indexPropertyDataFlow(propertyId);
}

export const indexPropertyDataFlow = ai.defineFlow(
  {
    name: 'indexPropertyDataFlow',
    inputSchema: IndexPropertyDataInputSchema,
    outputSchema: IndexPropertyDataOutputSchema,
  },
  async propertyId => {
    const {firestore} = getFirebase();
    console.log(`Starting indexing for property: ${propertyId}`);

    // 1. Fetch all data for the property
    const propRef = firestore.doc(`properties/${propertyId}`);
    const faqsRef = propRef.collection('faqs');
    const recsRef = propRef.collection('recommendations');

    const [propSnap, faqsSnap, recsSnap] = await Promise.all([
      propRef.get(),
      faqsRef.get(),
      recsRef.get(),
    ]);

    if (!propSnap.exists) {
      throw new Error(`Property with ID ${propertyId} not found.`);
    }

    const property = propSnap.data() as FirestoreProperty;
    const faqs = faqsSnap.docs.map(doc => doc.data() as FirestoreFAQ);
    const recommendations = recsSnap.docs.map(
      doc => doc.data() as FirestoreRecommendation
    );

    // 2. Consolidate text content
    let allText = `Property Name: ${property.name}\nDescription: ${property.description}\nAmenities: ${property.amenities}\nRules: ${property.rules}\n\n`;

    faqs.forEach(faq => {
      if (faq.question && faq.answer) {
        allText += `FAQ: ${faq.question}\nAnswer: ${faq.answer}\n\n`;
      }
    });

    recommendations.forEach(rec => {
      if (rec.title && rec.description) {
        allText += `Recommendation: ${rec.title}\nDetails: ${rec.description}\n\n`;
      }
    });

    // 3. Chunk the text
    const chunks = chunk(allText, {
      minLength: 50,
      maxLength: 1000,
      splitter: 'sentence',
      overlap: 100,
      delimiters: '',
    });
    console.log(`Created ${chunks.length} chunks for property ${propertyId}.`);

    // 4. Generate embeddings for each chunk
    const embeddings = await ai.embed({
      embedder,
      content: chunks,
    });

    // 5. Store chunks and embeddings in Firestore
    const vectorStoreRef = firestore.collection('propertyVectors');
    const batch = firestore.batch();

    // First, delete existing vectors for this property to avoid stale data
    const existingDocsQuery = vectorStoreRef.where('propertyId', '==', propertyId);
    const existingDocsSnap = await existingDocsQuery.get();
    if (!existingDocsSnap.empty) {
      console.log(`Deleting ${existingDocsSnap.size} old chunks for property ${propertyId}.`);
      existingDocsSnap.docs.forEach(doc => batch.delete(doc.ref));
    }


    embeddings.forEach((embedding, i) => {
      const docRef = vectorStoreRef.doc(); // Create a new doc with a random ID
      batch.set(docRef, {
        propertyId: propertyId,
        chunk: chunks[i],
        embedding: embedding.toJSON(), // Store embedding in a compatible format
      });
    });

    await batch.commit();
    console.log(
      `Successfully indexed ${chunks.length} chunks for property ${propertyId}.`
    );

    return {
      indexedChunks: chunks.length,
      propertyId: propertyId,
    };
  }
);
