import { useState } from 'react';
import { Activity, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Auth() {
  const [mode, setMode]       = useState<'login' | 'signup'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');

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
        if (error) setError(error.message);
      } else {
        const { error } = await Promise.race([
          supabase.auth.signUp({ email, password }),
          timeout,
        ]);
        if (error) setError(error.message);
        else setMessage('Account created! Check your email to confirm, then sign in.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error — Supabase may be unreachable.');
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

      <div style={{ width: '100%', maxWidth: 380, position: 'relative' }}>
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

            <button type="submit" disabled={loading} className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '12px' }}>
              {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
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
          Your data is encrypted and stored securely.
        </p>

        {/* Config diagnostic — only shows when env vars are missing */}
        {(!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
            fontSize: 12, color: '#fbbf24',
          }}>
            ⚠️ Supabase environment variables are missing. Set{' '}
            <code style={{ fontFamily: 'monospace' }}>VITE_SUPABASE_URL</code> and{' '}
            <code style={{ fontFamily: 'monospace' }}>VITE_SUPABASE_ANON_KEY</code>{' '}
            in your Vercel project settings, then redeploy.
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
