import { useState } from 'react';
import { Activity, Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Account created! Check your email to confirm, then log in.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#2563eb' }}>
            <Activity size={32} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">FitTracker Pro</h1>
          <p className="text-sm text-slate-400 mt-1">Your personal fitness companion</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ background: '#1e293b' }}>
          <h2 className="text-lg font-semibold text-slate-200 mb-5">
            {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Email</label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                <Mail size={14} className="text-slate-500 shrink-0" />
                <input
                  type="email"
                  required
                  className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Password</label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                <Lock size={14} className="text-slate-500 shrink-0" />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-400 bg-red-950 px-3 py-2 rounded-lg">{error}</p>}
            {message && <p className="text-xs text-green-400 bg-green-950 px-3 py-2 rounded-lg">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: '#2563eb', color: '#fff' }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-xs text-center text-slate-500 mt-4">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              className="text-blue-400 hover:underline"
              onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
