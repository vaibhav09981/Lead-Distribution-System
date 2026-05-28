import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assignLead } from '@/lib/allocation';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  city: z.string().min(1),
  serviceId: z.coerce.number().int().min(1).max(3),
  description: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, phone, city, serviceId, description } = parsed.data;

    // Create lead (unique constraint on phone+serviceId handles duplicates at DB level)
    let lead;
    try {
      lead = await prisma.lead.create({
        data: {
          customerName: name,
          phone,
          city,
          description,
          serviceId,
        },
      });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === 'P2002') {
        return NextResponse.json(
          { error: 'A lead for this phone number and service already exists.' },
          { status: 409 }
        );
      }
      throw err;
    }

    // Trigger allocation
    const assignedProviders = await assignLead(lead.id, serviceId);

    return NextResponse.json(
      { success: true, leadId: lead.id, assignedProviders },
      { status: 201 }
    );
  } catch (err: unknown) {
    const e = err as Error;
    console.error('[POST /api/leads]', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      service: true,
      assignments: { include: { provider: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json(leads);
}
