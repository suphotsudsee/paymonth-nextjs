'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type ExchangeResponse = {
  state?: string;
  token?: unknown;
  profile?: unknown;
  error?: string;
  [key: string]: unknown;
};

export default function ThaiIdCallbackPage() {
  const searchParams = useSearchParams();
  const redirected = useRef(false);
  const [exchangeResult, setExchangeResult] = useState<ExchangeResponse | null>(null);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const paramsObj = useMemo(() => {
    if (!searchParams) return {};
    const entries: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      entries[key] = value;
    });
    return entries;
  }, [searchParams]);

  useEffect(() => {
    if (redirected.current || !searchParams) return;
    console.log('ThaiID callback params:', Object.fromEntries(searchParams.entries()));
  }, [searchParams]);

  const proceed = () => {
    if (!searchParams) return;
    const nextAuthCallbackUrl = `/api/auth/callback/thaiid?${searchParams.toString()}`;
    redirected.current = true;
    window.location.href = nextAuthCallbackUrl;
  };

  const fetchThaiIdResult = async () => {
    if (!searchParams) return;
    const code = searchParams.get('code');
    const state = searchParams.get('state') || undefined;
    if (!code) {
      setExchangeError('missing code');
      return;
    }
    setLoading(true);
    setExchangeError(null);
    try {
      const res = await fetch('/api/thaiid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });
      const data = (await res.json()) as ExchangeResponse;
      if (!res.ok) {
        setExchangeError(data?.error || 'exchange failed');
        setExchangeResult(data);
      } else {
        setExchangeResult(data);
        console.log('ThaiID exchange result:', data);
        const pid =
          typeof data?.token === 'object' &&
          data?.token !== null &&
          (data as any).token?.pid;
        if (typeof pid === 'string' && pid) {
          try {
            const loginRes = await fetch('/api/auth/thaiid-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pid }),
            });
            const loginJson = await loginRes.json();
            console.log('ThaiID login result:', loginJson);
            if (!loginRes.ok) {
              setExchangeError(`login failed: ${loginJson?.error || loginRes.status}`);
            } else {
              const next = searchParams.get('state') || '/officers';
              window.location.href = next;
            }
          } catch (err) {
            setExchangeError(`login error: ${String(err)}`);
          }
        } else {
          setExchangeError('pid missing in token');
        }
      }
    } catch (error) {
      setExchangeError(String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f1220', color: '#fff' }}>
      <div style={{ background: '#1b1e2b', padding: '24px 28px', borderRadius: 10, width: 560, maxWidth: '90vw' }}>
        <h2 style={{ margin: 0, marginBottom: 12, fontSize: 20 }}>ThaiID callback</h2>
        <p style={{ margin: 0, marginBottom: 12, color: '#cfd3ff' }}>
          ได้รับข้อมูลจาก ThaiID แล้ว (code/state) เลือกดำเนินการต่อ: ส่งให้ NextAuth หรือขอดึงผลลัพธ์ดิบจาก ThaiID
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            onClick={proceed}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: '#2f7bff',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ดำเนินการเข้าสู่ระบบต่อ (NextAuth)
          </button>
          <button
            type="button"
            onClick={fetchThaiIdResult}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: loading ? '#555' : '#14a37f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: 700,
            }}
          >
            {loading ? 'กำลังดึงข้อมูลจาก ThaiID...' : 'ขอดึงผลลัพธ์จาก ThaiID (debug)'}
          </button>
        </div>
        {exchangeError && (
          <div style={{ marginBottom: 10, padding: 10, background: '#412020', border: '1px solid #aa4b4b', borderRadius: 6 }}>
            Error: {exchangeError}
          </div>
        )}
        <pre
          style={{
            background: '#0f1220',
            border: '1px solid #2f3140',
            borderRadius: 6,
            padding: 12,
            fontSize: 12,
            overflowX: 'auto',
            color: '#cfd3ff',
            marginBottom: 10,
          }}
        >
          {JSON.stringify(paramsObj, null, 2)}
        </pre>
        {exchangeResult && (
          <pre
            style={{
              background: '#0f1220',
              border: '1px solid #2f3140',
              borderRadius: 6,
              padding: 12,
              fontSize: 12,
              overflowX: 'auto',
              color: '#cfd3ff',
            }}
          >
            {JSON.stringify(exchangeResult, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
