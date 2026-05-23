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
import { fetchFoodEntries, fetchWorkoutEntries, fetchWeightEntries, fetchProfile, fetchGlucoseEntries,
         upsertFoodEntry, upsertWorkoutEntry, upsertWeightEntry, upsertGlucoseEntry } from './utils/db';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import FoodTracker from './components/FoodTracker';
import WorkoutTracker from './components/WorkoutTracker';
import GlucoseTracker from './components/GlucoseTracker';
import TrendAnalysis from './components/TrendAnalysis';
import WeightPrediction from './components/WeightPrediction';
import ProfileSetup from './components/ProfileSetup';

const NAV: { view: ViewType; label: string; icon: React.ReactNode; color: string }[] = [
  { view: 'dashboard',  label: 'Dashboard',  icon: <LayoutDashboard size={17} />, color: '#2563eb' },
  { view: 'food',       label: 'Food',        icon: <Apple size={17} />,           color: '#f59e0b' },
  { view: 'workout',    label: 'Workout',     icon: <Dumbbell size={17} />,        color: '#8b5cf6' },
  { view: 'glucose',    label: 'Glucose',     icon: <Droplets size={17} />,        color: '#06b6d4' },
  { view: 'trends',     label: 'Trends',      icon: <TrendingUp size={17} />,      color: '#22c55e' },
  { view: 'prediction', label: 'Prediction',  icon: <Brain size={17} />,           color: '#8b5cf6' },
  { view: 'profile',    label: 'Profile',     icon: <User size={17} />,            color: '#8b949e' },
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

  // Merge remote into local (remote wins on id conflicts, local-only entries survive),
  // then return the set of ids that exist only locally so we can push them up.
  function merge<T extends { id: string }>(key: string, remote: T[] | null): T[] {
    if (remote === null) return [];
    const local: T[] = JSON.parse(localStorage.getItem(key) || '[]');
    const remoteIds = new Set(remote.map(e => e.id));
    const localOnly = local.filter(e => !remoteIds.has(e.id));
    const map = new Map(local.map(e => [e.id, e]));
    remote.forEach(e => map.set(e.id, e));
    localStorage.setItem(key, JSON.stringify([...map.values()]));
    return localOnly;
  }

  const unsynced = {
    food:    merge(STORAGE_KEYS.food,    food),
    workout: merge(STORAGE_KEYS.workout, workout),
    weight:  merge(STORAGE_KEYS.weight,  weight),
    glucose: merge(STORAGE_KEYS.glucose, glucose),
  };
  if (profile) localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));

  // Push local-only entries to Supabase so they survive future logouts.
  unsynced.food   .forEach(e => upsertFoodEntry(uid, e).catch(() => {}));
  unsynced.workout.forEach(e => upsertWorkoutEntry(uid, e).catch(() => {}));
  unsynced.weight .forEach(e => upsertWeightEntry(uid, e).catch(() => {}));
  unsynced.glucose.forEach(e => upsertGlucoseEntry(uid, e).catch(() => {}));
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) { setSyncUser(session.user.id); await loadFromSupabase(session.user.id); setSession(session); refresh(); }
      else { setSyncUser(null); clearLocalData(); setSession(null); refresh(); }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--blue)', margin: '0 auto 12px' }} />
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
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'var(--blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={18} color="#fff" />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 6px' }}>
                <button onClick={() => setSelectedDate(d => adjustDate(d, -1))}
                  style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', minWidth: 88, textAlign: 'center' }}>
                  {isToday ? 'Today' : format(new Date(selectedDate), 'MMM dd, yyyy')}
                </span>
                <button onClick={() => !isToday && setSelectedDate(d => adjustDate(d, 1))}
                  disabled={isToday}
                  style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: 'none',
                    cursor: isToday ? 'default' : 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: isToday ? 'var(--text3)' : 'var(--text2)' }}>
                  <ChevronRight size={14} />
                </button>
                {!isToday && (
                  <button onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                    style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--card2)',
                      border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer' }}>
                    Today
                  </button>
                )}
              </div>
            )}

            {/* Logout */}
            <button onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) { setSyncUser(null); clearLocalData(); setSession(null); }
              }}
              title="Sign out"
              style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--card)',
                border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Profile nudge */}
      {!profile && view !== 'profile' && (
        <div style={{ background: 'rgba(37,99,235,.1)', borderBottom: '1px solid rgba(37,99,235,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '8px 20px', fontSize: 12, maxWidth: 1100, margin: '0 auto' }}>
          <span style={{ color: '#93bbf7' }}>Complete your profile to enable calorie calculations and predictions.</span>
          <button onClick={() => setView('profile')}
            style={{ color: 'var(--blue)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Set up now →
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px', paddingBottom: 90 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* ── Sidebar (desktop) ───────────────────────────────── */}
          <nav className="sidebar" style={{ position: 'sticky', top: 74 }}>
            <div className="card" style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV.map(item => {
                const active = view === item.view;
                return (
                  <button key={item.view} onClick={() => setView(item.view)}
                    className="nav-item"
                    style={{
                      background: active ? `${item.color}1f` : 'transparent',
                      color: active ? item.color : 'var(--text2)',
                    }}>
                    <span style={{ color: active ? item.color : 'var(--text3)', display: 'flex' }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ── Main content ────────────────────────────────────── */}
          <main style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                <span style={{ color: activeNav.color, display: 'flex' }}>{activeNav.icon}</span>
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
            {view === 'trends'     && <TrendAnalysis foodEntries={foodEntries} workoutEntries={workoutEntries} weightEntries={weightEntries} glucoseEntries={glucoseEntries} profile={profile} />}
            {view === 'prediction' && <WeightPrediction foodEntries={foodEntries} workoutEntries={workoutEntries} weightEntries={weightEntries} profile={profile} />}
            {view === 'profile'    && <ProfileSetup profile={profile} onSave={refresh} />}
          </main>
        </div>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────── */}
      <nav className="bottom-nav show-mobile">
        {NAV.map(item => {
          const active = view === item.view;
          return (
            <button key={item.view} onClick={() => setView(item.view)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '10px 2px', border: 'none', cursor: 'pointer',
                background: 'transparent', transition: 'all .15s',
                color: active ? item.color : 'var(--text3)',
              }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? `${item.color}1f` : 'transparent',
              }}>
                {item.icon}
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.02em' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
