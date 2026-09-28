import { NextRequest, NextResponse } from 'next/server';
import { prepareTarget, runFullAnalysis } from '@/lib/scanner/orchestrator';
import { TargetError } from '@/lib/scanner/netGuard';
import { ScanStreamMessage } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/**
 * Streams scan progress as NDJSON: `{type:"log"}` lines while scanning, then one `{type:"result"}` (or `{type:"error"}`).
 */
export async function POST(req: NextRequest) {
  let target;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.url !== 'string') throw new TargetError('Please provide a valid URL or domain name.');
    target = await prepareTarget(body.url);
  } catch (error: any) {
    const status = error instanceof TargetError ? 400 : 500;
    return NextResponse.json({ error: error?.message || 'Invalid target.' }, { status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (msg: ScanStreamMessage) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(msg) + '\n'));
        } catch {
          open = false; // client went away
        }
      };

      try {
        const result = await runFullAnalysis(target, (line) => send({ type: 'log', line }));
        send({ type: 'result', data: result });
      } catch (error: any) {
        console.error('Analysis API Error:', error);
        send({ type: 'error', error: error?.message || 'Failed to complete analysis on target.' });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
