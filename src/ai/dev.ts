
'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/answer-visitor-question.ts';
import '@/ai/flows/summarize-client-interactions.ts';
import '@/ai/flows/generate-review-response.ts';
import '@/ai/flows/ai-suggests-experiences-and-recommendations.ts';
import '@/ai/flows/summarize-market.ts';
import '@/ai/flows/text-to-speech.ts';
import '@/ai/flows/generate-property-content.ts';
import '@/ai/flows/suggest-new-faqs.ts';
import '@/ai/flows/find-relevant-faq.ts';
import '@/ai/flows/import-property-from-url.ts';
import '@/ai/flows/generate-booking-inquiry-response.ts';
import '@/ai/flows/index-property-data.ts';
