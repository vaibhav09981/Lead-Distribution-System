import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Upsert Services
  for (let i = 1; i <= 3; i++) {
    await prisma.service.upsert({
      where: { id: i },
      update: {},
      create: { id: i, name: `Service ${i}` },
    });
  }

  // Upsert Providers
  for (let i = 1; i <= 8; i++) {
    await prisma.provider.upsert({
      where: { id: i },
      update: {},
      create: { id: i, name: `Provider ${i}`, monthlyQuota: 10, currentMonthLeads: 0 },
    });
  }

  // Upsert AllocationState (round-robin counter per service)
  for (let i = 1; i <= 3; i++) {
    await prisma.allocationState.upsert({
      where: { serviceId: i },
      update: {},
      create: { serviceId: i, counter: 0 },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
