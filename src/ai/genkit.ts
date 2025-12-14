// src/ai/genkit.ts

import { genkit } from 'genkit';
// 🛑 FIX: The package is 'google-genai', but the export is named 'googleAI'
import { googleAI } from '@genkit-ai/google-genai'; 

export const ai = genkit({
  plugins: [
    // 🛑 Call the correctly named function
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});