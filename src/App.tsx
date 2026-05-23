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

const NAV_ITEMS: { view: ViewType; label: string; icon: React.ReactNode; color: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, color: '#2563eb' },
  { view: 'food',      label: 'Food',      icon: <Apple size={18} />,           color: '#f59e0b' },
  { view: 'workout',   label: 'Workout',   icon: <Dumbbell size={18} />,        color: '#7c3aed' },
  { view: 'glucose',   label: 'Glucose',   icon: <Droplets size={18} />,        color: '#3b82f6' },
  { view: 'trends',    label: 'Trends',    icon: <TrendingUp size={18} />,      color: '#22c55e' },
  { view: 'prediction',label: 'Prediction',icon: <Brain size={18} />,           color: '#0ea5e9' },
  { view: 'profile',   label: 'Profile',   icon: <User size={18} />,            color: '#64748b' },
];

function adjustDate(date: string, delta: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return format(d, 'yyyy-MM-dd');
}

async function loadFromSupabase(userId: string) {
  const [food, workout, weight, glucose, profile] = await Promise.all([
    fetchFoodEntries(userId),
    fetchWorkoutEntries(userId),
    fetchWeightEntries(userId),
    fetchGlucoseEntries(userId),
    fetchProfile(userId),
  ]);
  localStorage.setItem(STORAGE_KEYS.food,    JSON.stringify(food));
  localStorage.setItem(STORAGE_KEYS.workout, JSON.stringify(workout));
  localStorage.setItem(STORAGE_KEYS.weight,  JSON.stringify(weight));
  localStorage.setItem(STORAGE_KEYS.glucose, JSON.stringify(glucose));
  if (profile) localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

export default function App() {
  const [session, setSession]     = useState<Session | null>(null);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<ViewType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  const foodEntries    = getFoodEntries();
  const workoutEntries = getWorkoutEntries();
  const weightEntries  = getWeightEntries();
  const glucoseEntries = getGlucoseEntries();
  const profile        = getProfile();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSyncUser(session.user.id);
        await loadFromSupabase(session.user.id);
        setSession(session);
        refresh();
      }
      setLoading(false);
    });

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setSyncUser(session.user.id);
        await loadFromSupabase(session.user.id);
        setSession(session);
        refresh();
      } else {
        setSyncUser(null);
        clearLocalData();
        setSession(null);
        refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading your data…</p>
        </div>
      </div>
    );
  }

  if (!session) return <Auth />;

  const isToday   = selectedDate === format(new Date(), 'yyyy-MM-dd');
  const activeNav = NAV_ITEMS.find(n => n.view === view)!;
  const needsProfile = !profile && view !== 'profile';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      {/* Header */}
      <header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2563eb' }}>
                <Activity size={18} color="#fff" />
              </div>
              <div>
                <div className="font-bold text-slate-100 text-sm leading-tight">FitTracker Pro</div>
                {profile?.name
                  ? <div className="text-xs text-slate-500">Hi, {profile.name}</div>
                  : <div className="text-xs text-slate-600">{session.user.email}</div>
                }
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date picker */}
              {(view === 'food' || view === 'workout' || view === 'dashboard' || view === 'glucose') && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedDate(d => adjustDate(d, -1))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                    style={{ background: '#1e293b' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <div className="text-xs font-medium text-slate-300 min-w-24 text-center">
                    {isToday ? 'Today' : format(new Date(selectedDate), 'MMM dd, yyyy')}
                  </div>
                  <button onClick={() => !isToday && setSelectedDate(d => adjustDate(d, 1))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: '#1e293b', opacity: isToday ? 0.3 : 1 }}
                    disabled={isToday}>
                    <ChevronRight size={14} />
                  </button>
                  {!isToday && (
                    <button onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                      className="text-xs px-2 py-1 rounded-md"
                      style={{ background: '#1e293b', color: '#94a3b8' }}>
                      Today
                    </button>
                  )}
                </div>
              )}

              {/* Logout */}
              <button onClick={handleLogout}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                style={{ background: '#1e293b' }}
                title="Sign out">
                <LogOut size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Profile nudge */}
      {needsProfile && (
        <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ background: '#1e3a5f', borderBottom: '1px solid #1e4d80' }}>
          <span className="text-blue-300">Complete your profile to enable calorie calculations and predictions.</span>
          <button onClick={() => setView('profile')} className="text-blue-400 font-medium hover:underline">Set up now →</button>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
        <div className="flex gap-5">
          {/* Sidebar nav */}
          <nav className="hidden lg:flex flex-col gap-1 w-44 shrink-0">
            {NAV_ITEMS.map(item => (
              <button key={item.view} onClick={() => setView(item.view)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
                style={{
                  background: view === item.view ? item.color + '22' : 'transparent',
                  color:      view === item.view ? item.color : '#64748b',
                  border:    `1px solid ${view === item.view ? item.color + '44' : 'transparent'}`,
                }}>
                {item.icon}{item.label}
              </button>
            ))}
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="mb-5">
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span style={{ color: activeNav.color }}>{activeNav.icon}</span>
                {activeNav.label}
              </h1>
              {(view === 'food' || view === 'workout' || view === 'glucose') && (
                <p className="text-xs text-slate-500 mt-0.5">
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

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex" style={{ background: '#0f172a', borderTop: '1px solid #1e293b' }}>
        {NAV_ITEMS.map(item => (
          <button key={item.view} onClick={() => setView(item.view)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all"
            style={{ color: view === item.view ? item.color : '#475569' }}>
            {item.icon}
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
