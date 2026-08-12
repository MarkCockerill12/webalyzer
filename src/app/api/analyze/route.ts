import { NextRequest, NextResponse } from 'next/server';
import { runFullAnalysis } from '@/lib/scanner/orchestrator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json({ error: 'Please provide a valid URL or domain name.' }, { status: 400 });
    }

    const result = await runFullAnalysis(url);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Analysis API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to complete analysis on target.' }, { status: 500 });
  }
}
