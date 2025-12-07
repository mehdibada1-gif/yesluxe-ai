'use server';

import { generatePropertyContent } from '@/ai/flows/generate-property-content';
import { importPropertyFromUrl } from '@/ai/flows/import-property-from-url';
import { indexPropertyData } from '@/ai/flows/index-property-data';

// This function is now isolated from the AI chat actions.
export async function handleGenerateContent(input: {
  keywords: string;
  propertyType: string;
}) {
  const result = await generatePropertyContent(input);
  return result;
}

export async function handleImportFromUrl(url: string) {
    const result = await importPropertyFromUrl({ url });
    return result;
}

export async function handleIndexProperty(propertyId: string) {
    console.log("Triggering indexing for property:", propertyId);
    const result = await indexPropertyData(propertyId);
    console.log("Indexing result:", result);
    return result;
}
