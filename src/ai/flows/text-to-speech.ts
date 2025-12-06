'use server';
/**
 * @fileOverview A Genkit flow for converting text to speech with language awareness.
 *
 * - textToSpeech - a function that takes text and a language code, and returns audio data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/google-genai';

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  languageCode: z.string().describe('The BCP-47 language code for the text (e.g., "en-US", "es-ES").'),
});

type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

// Map BCP-47 language codes to specific TTS voice names.
// These are example voices. A real app might have a more extensive list.
const voiceMap: { [key: string]: string } = {
    'en-US': 'Algenib', // English
    'es-ES': 'Cursa',   // Spanish
    'fr-FR': 'Hadjar',  // French
    'de-DE': 'Auva',    // German
    'it-IT': 'Deneb'    // Italian
};
const defaultVoice = 'Algenib';

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: z.object({
      media: z.string(),
    }),
  },
  async (input) => {
    const voiceName = voiceMap[input.languageCode] || defaultVoice;

    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            // Select voice based on language
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
      prompt: input.text,
    });
    if (!media) {
      throw new Error('no media returned');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    return {
      media: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);


export async function textToSpeech(input: TextToSpeechInput) {
    return textToSpeechFlow(input);
}
