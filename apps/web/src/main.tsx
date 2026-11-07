import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import type { HealthResponse } from '@tstaff/contracts';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${apiUrl}/health`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthResponse | null) => {
        setHealth(data);
        setLoading(false);
      })
      .catch(() => {
        setHealth(null);
        setLoading(false);
      });
  }, []);

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Tahoma, sans-serif',
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid #334155',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: health?.status === 'ok' ? '#22c55e' : '#f59e0b',
            }}
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            سامانه مدیریت شبکه پژوهشگران (TStaff)
          </h1>
        </div>

        <p style={{ color: '#94a3b8', lineHeight: 1.6, marginTop: 0 }}>
          پوسته اجرایی مرحله M1 با پشته <strong>NestJS + Prisma + React + Vite</strong> در ساختار Modular Monolith.
        </p>

        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            fontSize: '0.9rem',
            border: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span style={{ color: '#94a3b8' }}>وضعیت اتصال به API:</span>
            <span>
              {loading ? 'در حال بررسی...' : health ? 'متصل (آنلاین)' : 'در انتظار راه‌اندازی سرور'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span style={{ color: '#94a3b8' }}>نگاشت پایگاه داده (ORM):</span>
            <span style={{ color: '#38bdf8' }}>Prisma ORM (PostgreSQL)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span style={{ color: '#94a3b8' }}>نسخه سامانه:</span>
            <span>0.1.0 (فاز M1)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}
