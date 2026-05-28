'use client';

import { useState } from 'react';
import Link from 'next/link';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  padding: '10px 12px',
  color: 'var(--text)',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--muted)',
  fontSize: '11px',
  marginBottom: '6px',
  letterSpacing: '0.05em',
};

type Status = 'idle' | 'loading' | 'success' | 'error' | 'duplicate';

export default function RequestServicePage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city: '',
    serviceId: '1',
    description: '',
  });
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ leadId: number; assignedProviders: number[] } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setResult(null);
    setMessage('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, serviceId: parseInt(form.serviceId) }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setStatus('duplicate');
        setMessage(data.error);
        return;
      }
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong.');
        return;
      }

      setStatus('success');
      setResult(data);
      setForm({ name: '', phone: '', city: '', serviceId: '1', description: '' });
    } catch {
      setStatus('error');
      setMessage('Network error.');
    }
  };

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '520px', margin: '0 auto' }}>
      <div style={{ marginBottom: '36px' }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
          ← back
        </Link>
        <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '6px', letterSpacing: '0.1em' }}>PROWIDER</p>
        <h1 style={{ fontSize: '18px', fontWeight: 400, color: 'var(--accent)' }}>Request a Service</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>NAME</label>
            <input
              style={inputStyle}
              placeholder="John Doe"
              value={form.name}
              onChange={set('name')}
              required
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={labelStyle}>PHONE</label>
            <input
              style={inputStyle}
              placeholder="9999999999"
              value={form.phone}
              onChange={set('phone')}
              required
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>CITY</label>
            <input
              style={inputStyle}
              placeholder="Mumbai"
              value={form.city}
              onChange={set('city')}
              required
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          <div>
            <label style={labelStyle}>SERVICE</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.serviceId}
              onChange={set('serviceId')}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <option value="1">Service 1</option>
              <option value="2">Service 2</option>
              <option value="3">Service 3</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>DESCRIPTION</label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            placeholder="Describe what you need..."
            value={form.description}
            onChange={set('description')}
            required
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '12px 20px',
            background: status === 'loading' ? 'var(--surface)' : 'var(--accent)',
            color: '#0a0a0a',
            border: '1px solid var(--border)',
            borderRadius: '3px',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            letterSpacing: '0.05em',
            fontSize: '12px',
            transition: 'opacity 0.15s',
          }}
        >
          {status === 'loading' ? 'Submitting...' : 'Submit Enquiry'}
        </button>
      </form>

      {/* Status messages */}
      {status === 'success' && result && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          border: '1px solid #1a3a1a',
          borderRadius: '4px',
          background: '#0f1f0f',
        }}>
          <p style={{ color: 'var(--green)', fontSize: '12px', marginBottom: '8px' }}>✓ Lead created</p>
          <p style={{ color: 'var(--muted)', fontSize: '11px' }}>Lead ID: #{result.leadId}</p>
          <p style={{ color: 'var(--muted)', fontSize: '11px' }}>
            Assigned to: {result.assignedProviders.map((p) => `P${p}`).join(', ')}
          </p>
        </div>
      )}

      {(status === 'error' || status === 'duplicate') && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          border: '1px solid #3a1a1a',
          borderRadius: '4px',
          background: '#1f0f0f',
        }}>
          <p style={{ color: 'var(--red)', fontSize: '12px' }}>
            {status === 'duplicate' ? '⚠ Duplicate' : '✕ Error'}
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px' }}>{message}</p>
        </div>
      )}
    </main>
  );
}
