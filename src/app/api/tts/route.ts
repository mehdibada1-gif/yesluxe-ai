import { textToSpeech } from '@/ai/flows/text-to-speech';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, languageCode } = await req.json();

    if (!text || !languageCode) {
      return NextResponse.json({ error: 'Missing text or languageCode' }, { status: 400 });
    }

    const response = await textToSpeech({ text, languageCode });
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('TTS API Error:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
