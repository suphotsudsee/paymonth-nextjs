'use client';

import { useState, type FormEvent } from 'react';
import { PasswordInput } from '@/components/PasswordInput';

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

  const onSubmit = async (e: FormEvent) => {
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
        const userLabel = [data.user?.fname, data.user?.lname].filter(Boolean).join(' ').trim() || data.user?.cid || 'User';
        window.localStorage.setItem('userName', userLabel);
        const status: string = String(data.user?.status || '').toLowerCase();
        const userCid: string = String(data.user?.cid || '').trim();
        window.localStorage.setItem('userStatus', status);
        if (userCid) {
          window.localStorage.setItem('userCid', userCid);
        }
        const next = new URLSearchParams(window.location.search).get('next');
        const userDefault = userCid ? `/officers/${userCid}` : '/officers/paydirect';
        const defaultTarget = status === 'user' ? userDefault : '/officers';
        const target = status === 'user' ? userDefault : next || defaultTarget;
        setRedirectTo(target);
        setTimeout(() => {
          window.location.href = target;
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
    <main className="d-flex flex-grow-1 align-items-center justify-content-center bg-dark py-5 px-3">
      {/* 520px = ความกว้างกล่อง login เดิม */}
      <div className="card shadow-lg w-100" style={{ maxWidth: 520 }}>
        <div className="card-body p-4 p-sm-5">
          <h1 className="h3 mb-4">Login</h1>
          <div className="border border-primary-subtle rounded bg-primary-subtle p-3 mb-4">
            <div className="fw-semibold small text-primary-emphasis mb-2">Login with ThaiID (DOPA Digital ID)</div>
            <button
              type="button"
              onClick={startThaiIdLogin}
              disabled={thaiIdLoading}
              className="btn btn-light border w-100 p-0 overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ThaID_banner.jpg"
                alt="ThaiID banner"
                className="d-block w-100 object-fit-cover"
                // 160px = ความสูงแบนเนอร์เดิม
                style={{ maxHeight: 160 }}
              />
              <div className="py-2 px-3 fw-semibold small text-primary-emphasis">
                {thaiIdLoading ? 'Connecting to ThaiID...' : 'Login with ThaiID'}
              </div>
            </button>
          </div>
          <form onSubmit={onSubmit} className="vstack gap-3">
            <div>
              <label className="form-label small mb-1" htmlFor="login-username">
                Username <span className="text-danger">*</span>
              </label>
              <input
                id="login-username"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label small mb-1" htmlFor="login-password">
                Password <span className="text-danger">*</span>
              </label>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label className="form-label small mb-1" htmlFor="login-captcha">Verification Code</label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={captchaSrc}
                alt="captcha"
                title="คลิกเพื่อเปลี่ยนรหัส"
                className="d-block border rounded bg-light object-fit-contain user-select-none mb-2"
                // 160x70 = ขนาดภาพ captcha เดิม
                style={{ width: 160, height: 70, cursor: 'pointer' }}
                onClick={refreshCaptcha}
              />
              <input
                id="login-captcha"
                className="form-control"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                placeholder=""
              />
            </div>
            <div className="form-check">
              <input
                id="login-remember"
                className="form-check-input"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label className="form-check-label small" htmlFor="login-remember">
                Remember me next time
              </label>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-100">
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          {result && <div className="alert alert-info small mt-3 mb-0">{result}</div>}
          {redirectTo && <div className="text-secondary small mt-2">redirecting to {redirectTo}...</div>}
        </div>
      </div>
    </main>
  );
}
