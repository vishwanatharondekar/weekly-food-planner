import { NextRequest, NextResponse } from 'next/server';
import { TranslateAPI } from '@/lib/translate-api';

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Text and target language are required' },
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

    const translateAPI = TranslateAPI.getInstance(apiKey);
    
    const result = await translateAPI.translate({
      text,
      targetLanguage,
      sourceLanguage
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Translation failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Translate API key not configured' },
        { status: 500 }
      );
    }

    const translateAPI = TranslateAPI.getInstance(apiKey);
    const cacheStats = translateAPI.getCacheStats();
    
    return NextResponse.json({ 
      message: 'Translation API endpoint',
      cacheStats 
    });
  } catch (error: any) {
    console.error('Cache stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Translate API key not configured' },
        { status: 500 }
      );
    }

    const translateAPI = TranslateAPI.getInstance(apiKey);
    translateAPI.clearCache();
    
    return NextResponse.json({ 
      message: 'Translation cache cleared successfully' 
    });
  } catch (error: any) {
    console.error('Cache clear error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear cache' },
      { status: 500 }
    );
  }
} 