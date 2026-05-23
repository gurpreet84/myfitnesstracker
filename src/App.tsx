import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import {
  LayoutDashboard, Apple, Dumbbell, TrendingUp, Brain, User,
  ChevronLeft, ChevronRight, Activity, LogOut, Loader2, Droplets,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { ViewType } from './types';
import { supabase } from './utils/supabase';
import { setSyncUser, clearLocalData, STORAGE_KEYS } from './utils/storage';
import { getFoodEntries, getWorkoutEntries, getWeightEntries, getProfile, getGlucoseEntries } from './utils/storage';
import { fetchFoodEntries, fetchWorkoutEntries, fetchWeightEntries, fetchProfile, fetchGlucoseEntries } from './utils/db';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import FoodTracker from './components/FoodTracker';
import WorkoutTracker from './components/WorkoutTracker';
import GlucoseTracker from './components/GlucoseTracker';
import TrendAnalysis from './components/TrendAnalysis';
import WeightPrediction from './components/WeightPrediction';
import ProfileSetup from './components/ProfileSetup';

const NAV: { view: ViewType; label: string; icon: React.ReactNode; color: string; gradient: string }[] = [
  { view: 'dashboard',  label: 'Dashboard',  icon: <LayoutDashboard size={17} />, color: '#4f8ef5', gradient: 'rgba(79,142,245,.15)' },
  { view: 'food',       label: 'Food',        icon: <Apple size={17} />,           color: '#f0ac3c', gradient: 'rgba(240,172,60,.15)' },
  { view: 'workout',    label: 'Workout',     icon: <Dumbbell size={17} />,        color: '#a855f7', gradient: 'rgba(168,85,247,.15)' },
  { view: 'glucose',    label: 'Glucose',     icon: <Droplets size={17} />,        color: '#22d4e8', gradient: 'rgba(34,212,232,.15)' },
  { view: 'trends',     label: 'Trends',      icon: <TrendingUp size={17} />,      color: '#2dd4a0', gradient: 'rgba(45,212,160,.15)' },
  { view: 'prediction', label: 'Prediction',  icon: <Brain size={17} />,           color: '#7c6ff0', gradient: 'rgba(124,111,240,.15)' },
  { view: 'profile',    label: 'Profile',     icon: <User size={17} />,            color: '#7e95b3', gradient: 'rgba(126,149,179,.15)' },
];

function adjustDate(date: string, delta: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return format(d, 'yyyy-MM-dd');
}

async function loadFromSupabase(uid: string) {
  const safe = <T,>(p: Promise<T[]>) => p.catch((): T[] | null => null);
  const [food, workout, weight, glucose, profile] = await Promise.all([
    safe(fetchFoodEntries(uid)),
    safe(fetchWorkoutEntries(uid)),
    safe(fetchWeightEntries(uid)),
    safe(fetchGlucoseEntries(uid)),
    fetchProfile(uid).catch(() => null),
  ]);

  // Merge remote into local: remote wins on id conflicts, local-only entries survive.
  // If fetch threw (null) we leave localStorage untouched.
  function merge<T extends { id: string }>(key: string, remote: T[] | null) {
    if (remote === null) return;
    const local: T[] = JSON.parse(localStorage.getItem(key) || '[]');
    const map = new Map(local.map(e => [e.id, e]));
    remote.forEach(e => map.set(e.id, e));
    localStorage.setItem(key, JSON.stringify([...map.values()]));
  }

  merge(STORAGE_KEYS.food,    food);
  merge(STORAGE_KEYS.workout, workout);
  merge(STORAGE_KEYS.weight,  weight);
  merge(STORAGE_KEYS.glucose, glucose);
  if (profile) localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

export default function App() {
  const [session, setSession]   = useState<Session | null>(null);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<ViewType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  const foodEntries    = getFoodEntries();
  const workoutEntries = getWorkoutEntries();
  const weightEntries  = getWeightEntries();
  const glucoseEntries = getGlucoseEntries();
  const profile        = getProfile();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) { setSyncUser(session.user.id); await loadFromSupabase(session.user.id); setSession(session); refresh(); }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) { setSyncUser(session.user.id); await loadFromSupabase(session.user.id); setSession(session); refresh(); }
      else if (event === 'SIGNED_OUT') { setSyncUser(null); clearLocalData(); setSession(null); refresh(); }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={32} style={{ color: 'var(--blue)', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Loading your data…</p>
      </div>
    </div>
  );

  if (!session) return <Auth />;

  const isToday   = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const activeNav = NAV.find(n => n.view === view)!;
  const showDate  = ['food', 'workout', 'dashboard', 'glucose'].includes(view);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{
        background: 'rgba(11,17,32,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(99,102,241,.35)',
              }}>
                <Activity size={19} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.02em', color: 'var(--text)' }}>
                  FitTracker Pro
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {profile?.name ? `Hi, ${profile.name}` : session.user.email}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Date picker */}
              {showDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 8px' }}>
                  <button onClick={() => setSelectedDate(d => adjustDate(d, -1))}
                    style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', minWidth: 90, textAlign: 'center' }}>
                    {isToday ? 'Today' : format(new Date(selectedDate), 'MMM dd, yyyy')}
                  </span>
                  <button onClick={() => !isToday && setSelectedDate(d => adjustDate(d, 1))}
                    disabled={isToday}
                    style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: 'none',
                      cursor: isToday ? 'default' : 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: isToday ? 'var(--text3)' : 'var(--text2)' }}>
                    <ChevronRight size={14} />
                  </button>
                  {!isToday && (
                    <button onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                      style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--card-hi)',
                        border: '1px solid var(--border-hi)', color: 'var(--text2)', cursor: 'pointer' }}>
                      Today
                    </button>
                  )}
                </div>
              )}

              {/* Logout */}
              <button onClick={() => supabase.auth.signOut()}
                title="Sign out"
                style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--card)',
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile nudge */}
      {!profile && view !== 'profile' && (
        <div style={{ background: 'rgba(79,142,245,.1)', borderBottom: '1px solid rgba(79,142,245,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', fontSize: 12 }}>
          <span style={{ color: '#93bbf7' }}>Complete your profile to enable calorie calculations and predictions.</span>
          <button onClick={() => setView('profile')}
            style={{ color: 'var(--blue)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            Set up now →
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px', paddingBottom: 90 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <nav style={{ width: 200, flexShrink: 0, position: 'sticky', top: 78, display: 'none' }}
            className="lg:block">
            <div className="card" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV.map(item => (
                <button key={item.view} onClick={() => setView(item.view)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'left',
                    transition: 'all .15s',
                    background: view === item.view ? item.gradient : 'transparent',
                    color: view === item.view ? item.color : 'var(--text2)',
                    boxShadow: view === item.view ? `0 0 0 1px ${item.color}30` : 'none',
                  }}>
                  <span style={{ color: view === item.view ? item.color : 'var(--text3)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* ── Main content ────────────────────────────────────── */}
          <main style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                <span style={{ color: activeNav.color }}>{activeNav.icon}</span>
                {activeNav.label}
              </h1>
              {showDate && view !== 'dashboard' && (
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                  {format(new Date(selectedDate), 'EEEE, MMMM do, yyyy')}
                </p>
              )}
            </div>

            {view === 'dashboard'  && <Dashboard foodEntries={foodEntries} workoutEntries={workoutEntries} weightEntries={weightEntries} glucoseEntries={glucoseEntries} profile={profile} selectedDate={selectedDate} onUpdate={refresh} />}
            {view === 'food'       && <FoodTracker entries={foodEntries} onUpdate={refresh} selectedDate={selectedDate} />}
            {view === 'workout'    && <WorkoutTracker entries={workoutEntries} onUpdate={refresh} selectedDate={selectedDate} userWeight={profile?.currentWeight || 70} />}
            {view === 'glucose'    && <GlucoseTracker entries={glucoseEntries} onUpdate={refresh} selectedDate={selectedDate} />}
            {view === 'trends'     && <TrendAnalysis foodEntries={foodEntries} workoutEntries={workoutEntries} weightEntries={weightEntries} profile={profile} />}
            {view === 'prediction' && <WeightPrediction foodEntries={foodEntries} workoutEntries={workoutEntries} weightEntries={weightEntries} profile={profile} />}
            {view === 'profile'    && <ProfileSetup profile={profile} onSave={refresh} />}
          </main>
        </div>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(11,17,32,0.92)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)',
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
      }} className="lg:hidden">
        {NAV.map(item => (
          <button key={item.view} onClick={() => setView(item.view)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '10px 4px', border: 'none', cursor: 'pointer',
              background: 'transparent', transition: 'all .15s',
              color: view === item.view ? item.color : 'var(--text3)',
            }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: view === item.view ? item.gradient : 'transparent',
              transition: 'all .15s',
            }}>
              {item.icon}
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.02em' }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .lg\\:block { display: block; }
        .lg\\:hidden { display: flex; }
        @media (min-width: 1024px) {
          .lg\\:block { display: block !important; }
          .lg\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
