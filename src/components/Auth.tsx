import { useState, useEffect } from 'react';
import { Activity, Mail, Lock, Loader2, Eye, EyeOff, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

type ConnStatus = 'checking' | 'ok' | 'fail' | 'unknown';

function maskUrl(url: string | undefined): string {
  if (!url) return '(not set)';
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return url.slice(0, 40) + (url.length > 40 ? '…' : '');
  }
}

function DiagnosticPanel({ connStatus }: { connStatus: ConnStatus }) {
  const missingUrl = !SUPABASE_URL || SUPABASE_URL === 'undefined';
  const missingKey = !SUPABASE_KEY || SUPABASE_KEY === 'undefined';

  return (
    <div style={{
      marginTop: 14, padding: '12px 14px', borderRadius: 10,
      background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)',
      fontSize: 12, color: '#fbbf24', lineHeight: 1.6,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>⚙️ Connection Diagnostics</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div>
          <span style={{ color: 'var(--text3)' }}>Supabase URL: </span>
          <code style={{ fontFamily: 'monospace', color: missingUrl ? '#f87171' : '#fbbf24' }}>
            {missingUrl ? '❌ NOT SET' : maskUrl(SUPABASE_URL)}
          </code>
        </div>
        <div>
          <span style={{ color: 'var(--text3)' }}>Anon Key: </span>
          <code style={{ fontFamily: 'monospace', color: missingKey ? '#f87171' : '#fbbf24' }}>
            {missingKey ? '❌ NOT SET' : `${SUPABASE_KEY!.slice(0, 20)}…`}
          </code>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ color: 'var(--text3)' }}>Server reachable: </span>
          {connStatus === 'checking' && <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Checking…</>}
          {connStatus === 'ok'       && <><Wifi size={11} color="#22c55e" /> <span style={{ color: '#22c55e' }}>Yes — server is up</span></>}
          {connStatus === 'fail'     && <><WifiOff size={11} color="#f87171" /> <span style={{ color: '#f87171' }}>No — cannot reach server</span></>}
          {connStatus === 'unknown'  && <><AlertCircle size={11} /> Unknown</>}
        </div>
      </div>

      {(missingUrl || missingKey) && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(245,158,11,.2)', fontSize: 11 }}>
          Fix: Go to <strong>Vercel → Project → Settings → Environment Variables</strong> and set both
          <code style={{ display: 'block', marginTop: 4, color: '#fbbf24' }}>VITE_SUPABASE_URL = https://xxxx.supabase.co</code>
          <code style={{ display: 'block', marginTop: 2, color: '#fbbf24' }}>VITE_SUPABASE_ANON_KEY = eyJ…</code>
          Then click <strong>Redeploy</strong>.
        </div>
      )}
      {!missingUrl && connStatus === 'fail' && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(245,158,11,.2)', fontSize: 11 }}>
          The URL is set but the server is unreachable. Check:<br />
          • Is the Supabase project paused? (supabase.com → your project)<br />
          • Is the URL format exactly <code>https://xxxx.supabase.co</code> (no trailing slash)?<br />
          • Redeploy after fixing any env var changes.
        </div>
      )}
    </div>
  );
}

export default function Auth() {
  const [mode, setMode]       = useState<'login' | 'signup'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');
  const [connStatus, setConnStatus] = useState<ConnStatus>('unknown');
  const [showDiag, setShowDiag] = useState(false);

  const missingVars = !SUPABASE_URL || SUPABASE_URL === 'undefined' ||
                      !SUPABASE_KEY || SUPABASE_KEY === 'undefined';

  useEffect(() => {
    if (missingVars) { setShowDiag(true); return; }
    // Quick health-check ping to Supabase REST endpoint
    setConnStatus('checking');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    fetch(`${SUPABASE_URL}/rest/v1/`, {
      signal: ctrl.signal,
      headers: { apikey: SUPABASE_KEY! },
    })
      .then(r => setConnStatus(r.status < 500 ? 'ok' : 'fail'))
      .catch(() => setConnStatus('fail'))
      .finally(() => clearTimeout(timer));
    return () => ctrl.abort();
  }, []);

  // Auto-show diagnostics when connection fails
  useEffect(() => {
    if (connStatus === 'fail') setShowDiag(true);
  }, [connStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out — check your internet connection or try again.')), 12000)
      );
      if (mode === 'login') {
        const { error } = await Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          timeout,
        ]);
        if (error) {
          if (error.message.includes('fetch') || error.message.includes('network')) {
            setError('Cannot reach Supabase — check the diagnostics below.');
            setShowDiag(true);
          } else {
            setError(error.message);
          }
        }
      } else {
        const { error } = await Promise.race([
          supabase.auth.signUp({ email, password }),
          timeout,
        ]);
        if (error) setError(error.message);
        else setMessage('Account created! Check your email to confirm, then sign in.');
      }
    } catch (err: any) {
      const msg: string = err.message || '';
      if (msg.includes('fetch') || msg.includes('network') || msg.toLowerCase().includes('failed to fetch')) {
        setError('Cannot reach Supabase (Failed to fetch). Check diagnostics below.');
        setShowDiag(true);
      } else {
        setError(msg || 'Network error — Supabase may be unreachable.');
      }
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(37,99,235,.08) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: 'var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 36px rgba(37,99,235,.4)',
          }}>
            <Activity size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-.03em', color: 'var(--text)' }}>
            FitTracker Pro
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6 }}>
            Your personal health companion
          </p>
        </div>

        {/* Connection status chip */}
        {connStatus !== 'unknown' && (
          <div
            onClick={() => setShowDiag(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              marginBottom: 12, fontSize: 12, cursor: 'pointer',
              color: connStatus === 'ok' ? '#22c55e' : connStatus === 'checking' ? 'var(--text3)' : '#f87171',
            }}
          >
            {connStatus === 'checking' && <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Checking connection…</>}
            {connStatus === 'ok'       && <><Wifi size={11} /> Connected to Supabase</>}
            {connStatus === 'fail'     && <><WifiOff size={11} /> Cannot reach Supabase — tap for details</>}
          </div>
        )}

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 22px', color: 'var(--text)' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  type="email" required className="inp" style={{ paddingLeft: 36 }}
                  placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input
                  type={showPw ? 'text' : 'password'} required minLength={6} className="inp"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  placeholder="Min. 6 characters" value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(240,96,96,.1)', border: '1px solid rgba(240,96,96,.2)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ background: 'rgba(45,212,160,.1)', border: '1px solid rgba(45,212,160,.2)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#2dd4a0' }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading || connStatus === 'fail'} className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '12px',
                opacity: connStatus === 'fail' ? 0.5 : 1 }}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {connStatus === 'fail' ? 'Server Unreachable' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text3)', marginTop: 18, marginBottom: 0 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
              style={{ color: 'var(--blue)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 16 }}>
          Your data is encrypted and stored securely.{' '}
          <button
            onClick={() => setShowDiag(s => !s)}
            style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {showDiag ? 'Hide' : 'Show'} diagnostics
          </button>
        </p>

        {showDiag && <DiagnosticPanel connStatus={connStatus} />}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
