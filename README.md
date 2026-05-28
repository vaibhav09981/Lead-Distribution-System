# Prowider — Mini Lead Distribution System

Minimalist lead generation and distribution platform built with Next.js + PostgreSQL.

---

## Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Server-Sent Events (SSE)
- **Language**: TypeScript

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo-url>
cd prowider
npm install
```

### 2. Configure database

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL to your PostgreSQL connection string
```

### 3. Push schema & seed

```bash
npm run db:setup
# This runs: prisma db push + seed (8 providers, 3 services, allocation state)
```

### 4. Run

```bash
npm run dev       # development
npm run build && npm start  # production
```

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Home |
| `/request-service` | Customer lead submission form |
| `/dashboard` | Real-time provider dashboard |
| `/test-tools` | Webhook simulation & stress tests |

### API

| Endpoint | Method | Description |
|---|---|---|
| `/api/leads` | POST | Create lead + trigger allocation |
| `/api/leads` | GET | Fetch all leads |
| `/api/providers` | GET | Fetch providers with assignments |
| `/api/events` | GET | SSE stream for real-time updates |
| `/api/webhook/quota-reset` | POST | Idempotent quota reset |
| `/api/test/generate-leads` | POST | Generate 10 concurrent leads |

---

## Allocation Algorithm

### Mandatory Rules
Every new lead is pre-assigned mandatory providers:
- **Service 1** → Provider 1 always receives
- **Service 2** → Provider 5 always receives
- **Service 3** → Provider 1 AND Provider 4 always receive

### Fair Pool Distribution (Round-Robin)
Remaining slots (to reach exactly 3 total providers per lead) are filled from per-service pools using a persistent round-robin counter:

- **Service 1** pool: [P2, P3, P4] → picks 2
- **Service 2** pool: [P6, P7, P8] → picks 2
- **Service 3** pool: [P2, P3, P5, P6, P7, P8] → picks 1

The counter is stored in `AllocationState` table, persists across server restarts, and increments atomically per lead.

Providers that have exhausted their monthly quota (10 leads/month) are skipped during selection.

---

## Concurrency Handling

Allocation runs inside a **Serializable transaction** with a **PostgreSQL advisory lock** (`pg_advisory_xact_lock`) scoped per service ID. This ensures:

- No double-assignment of the same provider to the same lead
- Correct round-robin counter increments under simultaneous requests
- No quota over-assignment even if 10 leads are created at the same moment

The `LeadAssignment` table also has a `UNIQUE(leadId, providerId)` constraint as a hard database-level guard.

---

## Webhook Idempotency

The `POST /api/webhook/quota-reset` endpoint requires an `idempotencyKey` (UUID) in the request body.

- On first call: processes the reset, records the key in `WebhookEvent` table
- On duplicate call: detects the key, returns `{ skipped: true }` without any side effects
- Safe to call from payment gateways that retry on timeout

---

## Real-Time Updates

The `/dashboard` page connects to `/api/events` (Server-Sent Events). When:
- A new lead is assigned → `lead-assigned` event fires → dashboard re-fetches provider data
- Quotas are reset → `quota-reset` event fires → dashboard re-fetches

SSE uses a global in-memory controller registry (suitable for single-server deployments). For multi-instance deployments, replace with Redis pub/sub.

---

## Database Schema

```
Service          (id, name)
Provider         (id, name, monthlyQuota, currentMonthLeads)
Lead             (id, customerName, phone, city, description, serviceId, createdAt)
                  UNIQUE(phone, serviceId)
LeadAssignment   (id, leadId, providerId, assignedAt)
                  UNIQUE(leadId, providerId)
AllocationState  (id, serviceId, counter)
WebhookEvent     (id[idempotencyKey], type, processedAt)
```
