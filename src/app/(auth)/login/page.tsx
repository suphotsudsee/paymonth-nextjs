'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [remember, setRemember] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [thaiIdLoading, setThaiIdLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [captchaSrc, setCaptchaSrc] = useState('/api/auth/captcha');




  const refreshCaptcha = () => {
    setCaptcha('');
    setCaptchaSrc(`/api/auth/captcha?ts=${Date.now()}`);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, captcha }),
      });
      const data = await res.json();
      if (res.ok) {
        const fullName = `Welcome ${data.user?.fname || ''} ${data.user?.lname || ''}`.trim();
        setResult(fullName);

        // Store user name for header display
        const userLabel = [data.user?.fname, data.user?.lname].filter(Boolean).join(" ").trim() || data.user?.cid || "User";
        window.localStorage.setItem("userName", userLabel);

        const next = new URLSearchParams(window.location.search).get('next');
        setRedirectTo(next || '/officers');
        setTimeout(() => {
          window.location.href = next || '/officers';
        }, 500);
      } else {
        setResult(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error', error);
      setResult('Network error');
    } finally {
      setLoading(false);
      refreshCaptcha();
    }
  };

  const startThaiIdLogin = async () => {
    console.log('Starting ThaiID login flow');
    setThaiIdLoading(true);
    try {
      const currentHost = window.location.origin;
      const next = new URLSearchParams(window.location.search).get('next');
      const state = encodeURIComponent(next || '/officers');
      const thaiIdUrl = `https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/?client_id=ZWcyY3NoanR2ZVBBV2xQckV0VHdrVVlzMUxYUkJnbDQ&response_type=code&state=${state}&scope=pid&redirect_uri=${encodeURIComponent(`${currentHost}/callback`)}`;
      window.location.href = thaiIdUrl;
    } catch (error) {
      console.error('ThaiID login error:', error);
      setResult('ThaiID login failed');
      setThaiIdLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f1220', display: 'grid', placeItems: 'center', padding: '2rem' }}>
      <div
        style={{
          width: 520,
          maxWidth: '90vw',
          background: '#1b1e2b',
          borderRadius: '10px',
          paddingTop: '60px',
          position: 'relative',
          boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -22,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 70,
            height: 46,
            background: 'linear-gradient(180deg, #2f2f37 0%, #1d1d24 100%)',
            borderRadius: '6px',
            border: '1px solid #3a3a45',
            boxShadow: '0 6px 12px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid #8c8c97',
              background: '#0f1220',
            }}
          />
        </div>
        <div
          style={{
            background: 'linear-gradient(180deg, #f7f7f7 0%, #e6e6e6 100%)',
            borderRadius: '0 0 10px 10px',
            padding: '32px 40px 36px',
          }}
        >
          <h1 style={{ margin: '0 0 20px', fontSize: 28, color: '#202124' }}>Login</h1>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <label style={{ fontSize: 13, color: '#2b2b2b' }}>
                Username <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #b6b6b6',
                  borderRadius: 2,
                  background: '#fff',
                  color: '#000',
                }}
              />
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <label style={{ fontSize: 13, color: '#2b2b2b' }}>
                Password <span style={{ color: '#c00' }}>*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #b6b6b6',
                  borderRadius: 2,
                  background: '#fff',
                  color: '#000',
                }}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#2b2b2b' }}>Verification Code</label>
              {/* Captcha image comes from server; Next/Image is not ideal for this endpoint */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={captchaSrc}
                alt="captcha"
                style={{
                  width: 160,
                  height: 70,
                  border: '1px solid #d2d2d2',
                  background: '#f4f4f4',
                  borderRadius: 4,
                  objectFit: 'contain',
                  userSelect: 'none',
                }}
                onClick={refreshCaptcha}
              />
              <input
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                placeholder=""
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #b6b6b6',
                  borderRadius: 2,
                  background: '#fff',
                  color: '#000',
                }}
              />
            </div>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#2b2b2b' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 14, height: 14 }}
              />
              Remember me next time
            </label>
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '6px 14px',
                background: '#f5f5f5',
                border: '1px solid #888',
                borderRadius: 2,
                cursor: loading ? 'wait' : 'pointer',
                color: '#000',
              }}
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
          <div
            style={{
              marginTop: 16,
              padding: '12px',
              background: '#f4f6ff',
              border: '1px dashed #97a8ff',
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#1b2a5a' }}>
              หรือเข้าสู่ระบบด้วย ThaiID (DOPA Digital ID)
            </div>
            <button
              type="button"
              onClick={startThaiIdLogin}
              disabled={thaiIdLoading}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'linear-gradient(90deg, #1f52ff, #3a79ff)',
                color: '#fff',
                fontWeight: 700,
                letterSpacing: 0.2,
                border: 'none',
                borderRadius: 4,
                cursor: thaiIdLoading ? 'wait' : 'pointer',
                boxShadow: '0 8px 20px rgba(31,82,255,0.25)',
              }}
            >
              {thaiIdLoading ? 'กำลังพาไปยัง ThaiID...' : 'เข้าสู่ระบบด้วย ThaiID'}
            </button>
          </div>
          {result && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: '#eef7ff',
                border: '1px solid #b6d6ff',
                color: '#1a3c78',
                fontSize: 13,
              }}
            >
              {result}
            </div>
          )}
          {redirectTo && <div style={{ color: '#555', marginTop: 6 }}>redirecting to {redirectTo}…</div>}
        </div>
      </div>
    </div>
  );
}
