import { NextRequest, NextResponse } from 'next/server';
import { TranslateAPI } from '@/lib/translate-api';

export async function POST(request: NextRequest) {
  try {
    const { texts, targetLanguage, sourceLanguage } = await request.json();

    if (!texts || !Array.isArray(texts) || !targetLanguage) {
      return NextResponse.json(
        { error: 'Texts array and target language are required' },
        { status: 400 }
      );
    }

    if (texts.length === 0) {
      return NextResponse.json(
        { error: 'Texts array cannot be empty' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Translate API key not configured' },
        { status: 500 }
      );
    }

    const translateAPI = new TranslateAPI(apiKey);
    
    const translatedTexts = await translateAPI.translateBatch(
      texts,
      targetLanguage,
      sourceLanguage
    );

    return NextResponse.json({ translatedTexts });
  } catch (error: any) {
    console.error('Batch translation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Batch translation failed' },
      { status: 500 }
      );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Batch translation API endpoint' });
} 