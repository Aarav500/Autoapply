import { NextRequest, NextResponse } from 'next/server';
import { generateEssayDraft, reviewEssay, calculateConfidence, applyFeedback } from '@/lib/ai-engine';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, prompt, wordLimit, essay, feedback, context } = body;

        switch (action) {
            case 'generate':
                const generatedEssay = await generateEssayDraft(prompt, wordLimit, context || {});
                return NextResponse.json({ essay: generatedEssay });

            case 'review':
                const reviewFeedback = await reviewEssay(essay, prompt, wordLimit);
                return NextResponse.json({ feedback: reviewFeedback });

            case 'confidence':
                const confidence = await calculateConfidence(essay, prompt, wordLimit);
                return NextResponse.json({ confidence });

            case 'apply-feedback':
                const improved = await applyFeedback(essay, feedback, prompt, wordLimit);
                const newConfidence = await calculateConfidence(improved, prompt, wordLimit);
                return NextResponse.json({ essay: improved, confidence: newConfidence });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Essay AI API error:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}
