import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assignLead } from '@/lib/allocation';

export async function POST() {
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        (async () => {
          const serviceId = (i % 3) + 1;
          const phone = `test${Date.now()}${i}`;

          const lead = await prisma.lead.create({
            data: {
              customerName: `Test User ${i + 1}`,
              phone,
              city: 'Test City',
              description: `Concurrent test lead #${i + 1}`,
              serviceId,
            },
          });

          const providers = await assignLead(lead.id, serviceId);
          return { leadId: lead.id, serviceId, providers };
        })()
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({ succeeded, failed, results: results.map((r) =>
      r.status === 'fulfilled' ? { ok: true, ...r.value } : { ok: false, error: (r.reason as Error).message }
    )});
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
