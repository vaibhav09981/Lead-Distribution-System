'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '40px 24px',
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      <div style={{ marginBottom: '48px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '12px', letterSpacing: '0.1em' }}>
          PROWIDER
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 400, color: 'var(--accent)', marginBottom: '8px' }}>
          Lead Distribution System
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '12px' }}>
          Automated provider assignment with fair allocation and real-time updates.
        </p>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {[
          { href: '/request-service', label: 'request-service', desc: 'Submit a new service enquiry' },
          { href: '/dashboard', label: 'dashboard', desc: 'Provider lead management' },
          { href: '/test-tools', label: 'test-tools', desc: 'Webhook simulation & stress tests' },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            transition: 'border-color 0.15s',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <span style={{ color: 'var(--accent)' }}>/{item.label}</span>
            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{item.desc}</span>
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: '48px', color: 'var(--muted)', fontSize: '11px', lineHeight: '2' }}>
        <p>8 providers · 3 services · 10 lead quota/month</p>
        <p>Round-robin fair allocation · PostgreSQL · SSE real-time</p>
      </div>
    </main>
  );
}
