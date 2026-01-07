import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, session } = await request.json();

    // Check for API key - in Next.js, env vars are available at build/runtime
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      console.error('GEMINI_API_KEY is not set or is empty');
      return NextResponse.json(
        { 
          error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your .env.local file and restart the development server.',
          details: 'The API key is required to use the AI Assistant feature.'
        },
        { status: 500 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try gemini-1.5-flash or gemini-pro
    let model;
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    } catch (e) {
      // Fallback to gemini-pro if flash is not available
      model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    // Build context about the session
    const sessionContext = `
Session Data:
- Movie Title: ${session?.movieTitle || session?.movie_title || 'N/A'}
- Expected Emotion: ${session?.expectedEmotion || session?.expected_emotion || 'N/A'}
- Reflection Score: ${session?.reflectionScore || session?.reflection_score || session?.metrics?.reflectionScore || 0}%
- Total People: ${session?.totalPeople || session?.total_people || 0}
- Total Detections: ${session?.totalDetections || session?.total_detections || 0}
- Session Duration: ${session?.duration || session?.session_duration || 0} seconds

Metrics:
- Volatility: ${((session?.metrics?.volatility?.average || session?.metrics?.volatility || session?.audience_metrics?.volatility?.average || 0) * 100).toFixed(1)}%
- Entropy: ${(session?.metrics?.entropy?.session || session?.metrics?.entropy || session?.audience_metrics?.entropy?.session || 0).toFixed(2)}
- Engagement Index: ${((session?.metrics?.engagement_index || session?.metrics?.engagement || session?.audience_metrics?.engagement_index || 0) * 100).toFixed(1)}%
- Dominant Emotion: ${session?.metrics?.dominant_emotion?.emotion || session?.audience_metrics?.dominant_emotion?.emotion || 'N/A'} (${(session?.metrics?.dominant_emotion?.percentage || session?.audience_metrics?.dominant_emotion?.percentage || 0).toFixed(1)}%)

Emotion Distribution:
${JSON.stringify(session?.emotionDistribution || session?.audience_metrics?.emotion_distribution || {}, null, 2)}
`;

    const prompt = `You are an AI assistant helping users understand their CinemaSense session analysis results. 

The user has completed an emotion analysis session where they analyzed audience reactions to a movie scene. You have access to their session data and metrics.

${sessionContext}

User Question: ${message.trim()}

Please provide a helpful, clear, and concise answer about their session results, metrics, visualizations, or what the data means. Be specific and reference the actual numbers from their session when relevant.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Empty response from AI model' },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to get AI response';
    if (error.message) {
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your GEMINI_API_KEY in .env.local';
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorMessage = 'API quota exceeded. Please try again later.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

