'use server';
/**
 * @fileOverview A flow that demonstrates tool use by summarizing a user's
 * question about the market and optionally fetching a stock price.
 *
 * - summarizeMarket - A function that orchestrates the market summarization.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the tool: a function the AI can choose to call.
const getStockPrice = ai.defineTool(
  {
    name: 'getStockPrice',
    description: 'Returns the current market value of a stock.',
    inputSchema: z.object({
      ticker: z.string().describe('The stock ticker symbol of the company (e.g., "GOOG" for Google).'),
    }),
    outputSchema: z.number(),
  },
  async ({ ticker }) => {
    // In a real app, you would fetch this from a financial API.
    // For this example, we'll return a random number.
    console.log(`Getting stock price for ${ticker}`);
    return Math.round(Math.random() * 1000 * 100) / 100;
  }
);

const summarizeMarketPrompt = ai.definePrompt({
    name: 'summarizeMarketPrompt',
    tools: [getStockPrice],
    prompt: `You are a helpful financial assistant.
Analyze the user's question. If the user asks about a specific, public company, you MUST use the getStockPrice tool to retrieve the current stock price and include it in your final answer.
Provide a concise summary based on the user's query and any tool output.
User's question: {{prompt}}`,
});


// Define the flow that will use the tool.
export const summarizeMarket = ai.defineFlow(
  {
    name: 'summarizeMarket',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (promptArgument) => {
    const llmResponse = await summarizeMarketPrompt.generate({
        input: { prompt: promptArgument },
    });
    
    return llmResponse.text;
  }
);
