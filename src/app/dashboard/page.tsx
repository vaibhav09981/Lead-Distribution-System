'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Lead {
  id: number;
  customerName: string;
  phone: string;
  city: string;
  description: string;
  createdAt: string;
  service: { id: number; name: string };
}

interface Assignment {
  id: number;
  assignedAt: string;
  lead: Lead;
}

interface Provider {
  id: number;
  name: string;
  monthlyQuota: number;
  currentMonthLeads: number;
  assignments: Assignment[];
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [connected, setConnected] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      setProviders(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // SSE connection for real-time updates
  useEffect(() => {
    const es = new EventSource('/api/events');

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.addEventListener('lead-assigned', () => {
      fetchProviders();
    });

    es.addEventListener('quota-reset', () => {
      fetchProviders();
    });

    return () => es.close();
  }, [fetchProviders]);

  const selectedProvider = providers.find((p) => p.id === selected);
  const quotaPercent = (p: Provider) =>
    Math.round((p.currentMonthLeads / p.monthlyQuota) * 100);

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <Link href="/" style={{ color: 'var(--muted)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
            ← back
          </Link>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '6px', letterSpacing: '0.1em' }}>PROWIDER</p>
          <h1 style={{ fontSize: '18px', fontWeight: 400, color: 'var(--accent)' }}>Provider Dashboard</h1>
        </div>
        <div style={{ textAlign: 'right', paddingTop: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
            <span style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: connected ? 'var(--green)' : 'var(--muted)',
            }} />
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
              {connected ? 'live' : 'connecting'}
            </span>
          </div>
          {lastUpdate && (
            <p style={{ color: 'var(--muted)', fontSize: '10px', marginTop: '4px' }}>
              updated {lastUpdate}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '12px' }}>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', alignItems: 'start' }}>
          {/* Provider list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {providers.map((p) => {
              const pct = quotaPercent(p);
              const isSelected = selected === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(isSelected ? null : p.id)}
                  style={{
                    background: isSelected ? 'var(--surface)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--border-hover)' : 'var(--border)'}`,
                    borderRadius: '3px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--accent)', fontSize: '12px' }}>{p.name}</span>
                    <span style={{
                      color: p.currentMonthLeads >= p.monthlyQuota ? 'var(--red)' : 'var(--muted)',
                      fontSize: '11px',
                    }}>
                      {p.currentMonthLeads}/{p.monthlyQuota}
                    </span>
                  </div>
                  {/* Quota bar */}
                  <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(pct, 100)}%`,
                      background: pct >= 100 ? 'var(--red)' : pct >= 70 ? 'var(--yellow)' : 'var(--green)',
                      borderRadius: '1px',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '10px' }}>
                      {p.monthlyQuota - p.currentMonthLeads} remaining
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: '10px' }}>
                      · {p.assignments.length} total
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Lead detail panel */}
          <div>
            {!selectedProvider ? (
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '48px 24px',
                textAlign: 'center',
              }}>
                <p style={{ color: 'var(--muted)', fontSize: '12px' }}>Select a provider to view assigned leads</p>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: 'var(--accent)', fontSize: '13px' }}>{selectedProvider.name}</p>
                  <p style={{ color: 'var(--muted)', fontSize: '11px' }}>
                    {selectedProvider.assignments.length} lead{selectedProvider.assignments.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {selectedProvider.assignments.length === 0 ? (
                  <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '32px 24px',
                    textAlign: 'center',
                  }}>
                    <p style={{ color: 'var(--muted)', fontSize: '12px' }}>No leads assigned yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {selectedProvider.assignments.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: '3px',
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--accent)', fontSize: '12px' }}>{a.lead.customerName}</span>
                          <span style={{
                            color: 'var(--muted)',
                            fontSize: '10px',
                            background: 'var(--surface)',
                            padding: '2px 6px',
                            borderRadius: '2px',
                          }}>
                            {a.lead.service.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{a.lead.phone}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{a.lead.city}</span>
                        </div>
                        <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '8px' }}>
                          {a.lead.description}
                        </p>
                        <p style={{ color: 'var(--muted)', fontSize: '10px' }}>
                          {new Date(a.assignedAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
