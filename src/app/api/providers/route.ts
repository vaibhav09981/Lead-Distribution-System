import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const providers = await prisma.provider.findMany({
    orderBy: { id: 'asc' },
    include: {
      assignments: {
        orderBy: { assignedAt: 'desc' },
        include: {
          lead: {
            include: { service: true },
          },
        },
      },
    },
  });

  return NextResponse.json(providers);
}
