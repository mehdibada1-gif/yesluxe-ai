'use server';

import { generatePropertyContent } from '@/ai/flows/generate-property-content';
import { importPropertyFromUrl } from '@/ai/flows/import-property-from-url';

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
