import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcastEvent } from '@/lib/events';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idempotencyKey = body.idempotencyKey as string | undefined;

    if (!idempotencyKey) {
      return NextResponse.json({ error: 'idempotencyKey is required' }, { status: 400 });
    }

    // Idempotency check: if already processed, return early
    const existing = await prisma.webhookEvent.findUnique({
      where: { id: idempotencyKey },
    });

    if (existing) {
      return NextResponse.json(
        { success: true, skipped: true, message: 'Already processed (idempotent)' },
        { status: 200 }
      );
    }

    // Process: reset all providers' currentMonthLeads to 0 and restore quota
    await prisma.$transaction(async (tx) => {
      await tx.provider.updateMany({
        data: { currentMonthLeads: 0, monthlyQuota: 10 },
      });

      // Also reset allocation counters
      await tx.allocationState.updateMany({
        data: { counter: 0 },
      });

      // Record the event
      await tx.webhookEvent.create({
        data: { id: idempotencyKey, type: 'quota-reset' },
      });
    });

    broadcastEvent('quota-reset', { message: 'All provider quotas have been reset' });

    return NextResponse.json({ success: true, message: 'Quotas reset successfully' });
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[POST /api/webhook/quota-reset]', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
