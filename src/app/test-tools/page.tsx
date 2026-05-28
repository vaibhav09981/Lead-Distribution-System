'use client';

import { useState } from 'react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
  label: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  output: string;
}

const initResult = (label: string): TestResult => ({ label, status: 'idle', output: '' });

export default function TestToolsPage() {
  const [webhookKey] = useState(() => uuidv4());
  const [results, setResults] = useState<Record<string, TestResult>>({
    webhook: initResult('Reset Quota (Webhook)'),
    idempotency: initResult('Call Webhook Again (Idempotency Test)'),
    concurrency: initResult('Generate 10 Leads (Concurrency Test)'),
  });

  const update = (key: string, patch: Partial<TestResult>) =>
    setResults((r) => ({ ...r, [key]: { ...r[key], ...patch } }));

  const callWebhook = async (key: string, idempotencyKey: string) => {
    update(key, { status: 'loading', output: '' });
    try {
      const res = await fetch('/api/webhook/quota-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey }),
      });
      const data = await res.json();
      update(key, {
        status: res.ok ? 'success' : 'error',
        output: JSON.stringify(data, null, 2),
      });
    } catch (e: unknown) {
      update(key, { status: 'error', output: (e as Error).message });
    }
  };

  const handleConcurrency = async () => {
    update('concurrency', { status: 'loading', output: '' });
    try {
      const res = await fetch('/api/test/generate-leads', { method: 'POST' });
      const data = await res.json();
      update('concurrency', {
        status: res.ok ? 'success' : 'error',
        output: JSON.stringify(data, null, 2),
      });
    } catch (e: unknown) {
      update('concurrency', { status: 'error', output: (e as Error).message });
    }
  };

  const statusColor = (s: TestResult['status']) => {
    if (s === 'success') return 'var(--green)';
    if (s === 'error') return 'var(--red)';
    if (s === 'loading') return 'var(--yellow)';
    return 'var(--muted)';
  };

  const statusLabel = (s: TestResult['status']) => {
    if (s === 'success') return '✓';
    if (s === 'error') return '✕';
    if (s === 'loading') return '···';
    return '—';
  };

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '36px' }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
          ← back
        </Link>
        <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '6px', letterSpacing: '0.1em' }}>PROWIDER</p>
        <h1 style={{ fontSize: '18px', fontWeight: 400, color: 'var(--accent)' }}>Test Tools</h1>
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>
          Webhook simulation, idempotency verification, and concurrency stress tests.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Webhook reset */}
        <Panel title="Quota Reset Webhook" description="Simulates a payment gateway confirming subscription renewal. Resets all provider monthly quotas to 10 and allocation counters.">
          <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'var(--surface)', borderRadius: '3px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '10px', marginBottom: '4px' }}>IDEMPOTENCY KEY</p>
            <p style={{ color: 'var(--text)', fontSize: '11px', fontFamily: 'monospace' }}>{webhookKey}</p>
          </div>
          <StatusButton
            label={results.webhook.status === 'loading' ? 'Calling...' : 'Reset All Quotas'}
            disabled={results.webhook.status === 'loading'}
            onClick={() => callWebhook('webhook', webhookKey)}
            status={results.webhook.status}
          />
          {results.webhook.output && <Output result={results.webhook} statusColor={statusColor} statusLabel={statusLabel} />}
        </Panel>

        {/* Idempotency */}
        <Panel title="Idempotency Test" description="Calls the webhook again with the same key. Should be skipped without side effects.">
          <StatusButton
            label={results.idempotency.status === 'loading' ? 'Calling...' : 'Call Webhook Again (Same Key)'}
            disabled={results.idempotency.status === 'loading'}
            onClick={() => callWebhook('idempotency', webhookKey)}
            status={results.idempotency.status}
          />
          {results.idempotency.output && <Output result={results.idempotency} statusColor={statusColor} statusLabel={statusLabel} />}
        </Panel>

        {/* Concurrency */}
        <Panel title="Concurrency Stress Test" description="Creates 10 leads simultaneously (mix of all 3 services) to verify allocation correctness and data consistency under concurrent requests.">
          <StatusButton
            label={results.concurrency.status === 'loading' ? 'Generating...' : 'Generate 10 Leads Now'}
            disabled={results.concurrency.status === 'loading'}
            onClick={handleConcurrency}
            status={results.concurrency.status}
          />
          {results.concurrency.output && <Output result={results.concurrency} statusColor={statusColor} statusLabel={statusLabel} />}
        </Panel>

      </div>

      <div style={{ marginTop: '40px', padding: '16px', border: '1px solid var(--border)', borderRadius: '4px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '8px' }}>ALLOCATION RULES</p>
        {[
          'Service 1 → P1 (mandatory) + 2 from pool [P2,P3,P4]',
          'Service 2 → P5 (mandatory) + 2 from pool [P6,P7,P8]',
          'Service 3 → P1,P4 (mandatory) + 1 from pool [P2,P3,P5,P6,P7,P8]',
        ].map((r) => (
          <p key={r} style={{ color: 'var(--muted)', fontSize: '11px', lineHeight: '1.8' }}>· {r}</p>
        ))}
      </div>
    </main>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '4px', padding: '20px' }}>
      <p style={{ color: 'var(--accent)', fontSize: '13px', marginBottom: '6px' }}>{title}</p>
      <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '16px', lineHeight: '1.6' }}>{description}</p>
      {children}
    </div>
  );
}

function StatusButton({
  label, disabled, onClick, status,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  status: TestResult['status'];
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '10px 16px',
        background: 'transparent',
        border: '1px solid var(--border-hover)',
        borderRadius: '3px',
        color: disabled ? 'var(--muted)' : 'var(--accent)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        transition: 'border-color 0.15s',
        width: '100%',
        textAlign: 'left',
        opacity: status === 'loading' ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Output({ result, statusColor, statusLabel }: {
  result: TestResult;
  statusColor: (s: TestResult['status']) => string;
  statusLabel: (s: TestResult['status']) => string;
}) {
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ color: statusColor(result.status), fontSize: '11px' }}>{statusLabel(result.status)}</span>
        <span style={{ color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase' }}>{result.status}</span>
      </div>
      <pre style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '3px',
        padding: '12px',
        fontSize: '10px',
        color: 'var(--muted)',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        maxHeight: '200px',
        overflowY: 'auto',
      }}>
        {result.output}
      </pre>
    </div>
  );
}
