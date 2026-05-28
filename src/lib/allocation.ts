/**
 * Lead Allocation Engine
 * ----------------------
 * Mandatory rules:
 *   Service 1 → Provider 1 (always)
 *   Service 2 → Provider 5 (always)
 *   Service 3 → Provider 1 AND Provider 4 (always)
 *
 * Pool (fair, round-robin):
 *   Service 1 → [2, 3, 4]  → needs 2 from pool
 *   Service 2 → [6, 7, 8]  → needs 2 from pool
 *   Service 3 → [2,3,5,6,7,8] → needs 1 from pool
 *
 * Concurrency: entire allocation runs inside a serializable transaction
 * with advisory locks to prevent double-assignments under simultaneous requests.
 */

import { prisma } from './prisma';
import { broadcastEvent } from './events';

const MANDATORY: Record<number, number[]> = {
  1: [1],
  2: [5],
  3: [1, 4],
};

const POOL: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
};

const TOTAL_SLOTS = 3;

export async function assignLead(leadId: number, serviceId: number): Promise<number[]> {
  const assigned: number[] = [];

  await prisma.$transaction(
    async (tx) => {
      // Advisory lock per service to serialize concurrent allocations for the same service
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(${100 + serviceId})`
      );

      // Fetch current allocation counter (locked for update)
      const [stateRow] = await tx.$queryRaw<{ id: number; counter: number }[]>`
        SELECT id, counter FROM "AllocationState"
        WHERE "serviceId" = ${serviceId}
        FOR UPDATE
      `;

      // Fetch all 8 providers with their current quota usage (locked)
      const providers = await tx.$queryRaw<
        { id: number; "monthlyQuota": number; "currentMonthLeads": number }[]
      >`
        SELECT id, "monthlyQuota", "currentMonthLeads"
        FROM "Provider"
        ORDER BY id
        FOR UPDATE
      `;

      const quotaMap = new Map(providers.map((p) => [p.id, p]));

      const hasQuota = (pid: number) => {
        const p = quotaMap.get(pid);
        return p ? p.currentMonthLeads < p.monthlyQuota : false;
      };

      const mandatoryIds = MANDATORY[serviceId] ?? [];
      const poolIds = POOL[serviceId] ?? [];
      const neededFromPool = TOTAL_SLOTS - mandatoryIds.length;

      // Resolve mandatory providers (skip if quota exhausted)
      for (const pid of mandatoryIds) {
        if (hasQuota(pid)) {
          assigned.push(pid);
        }
      }

      // Fill remaining slots from pool using round-robin
      const eligiblePool = poolIds.filter(
        (pid) => !assigned.includes(pid) && hasQuota(pid)
      );

      let counter = stateRow.counter;
      let picked = 0;
      let attempts = 0;

      while (picked < neededFromPool && attempts < eligiblePool.length) {
        const idx = counter % eligiblePool.length;
        const pid = eligiblePool[idx];
        if (!assigned.includes(pid)) {
          assigned.push(pid);
          picked++;
        }
        counter++;
        attempts++;
      }

      if (assigned.length === 0) {
        throw new Error('No providers available (all quotas exhausted)');
      }

      // Persist assignments
      for (const pid of assigned) {
        await tx.leadAssignment.create({
          data: { leadId, providerId: pid },
        });
        await tx.provider.update({
          where: { id: pid },
          data: { currentMonthLeads: { increment: 1 } },
        });
      }

      // Persist updated counter
      await tx.allocationState.update({
        where: { serviceId },
        data: { counter },
      });
    },
    {
      isolationLevel: 'Serializable',
      timeout: 15000,
    }
  );

  // Broadcast SSE event to all dashboard clients
  broadcastEvent('lead-assigned', { leadId, serviceId, providerIds: assigned });

  return assigned;
}
