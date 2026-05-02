import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
  LayoutDashboard, Apple, Dumbbell, TrendingUp, Brain, User,
  ChevronLeft, ChevronRight, Activity,
} from 'lucide-react';
import type { ViewType } from './types';
import { getFoodEntries, getWorkoutEntries, getWeightEntries, getProfile } from './utils/storage';
import Dashboard from './components/Dashboard';
import FoodTracker from './components/FoodTracker';
import WorkoutTracker from './components/WorkoutTracker';
import TrendAnalysis from './components/TrendAnalysis';
import WeightPrediction from './components/WeightPrediction';
import ProfileSetup from './components/ProfileSetup';

function useData() {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  const foodEntries = getFoodEntries();
  const workoutEntries = getWorkoutEntries();
  const weightEntries = getWeightEntries();
  const profile = getProfile();
  return { foodEntries, workoutEntries, weightEntries, profile, refresh };
}

const NAV_ITEMS: { view: ViewType; label: string; icon: React.ReactNode; color: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, color: '#2563eb' },
  { view: 'food', label: 'Food', icon: <Apple size={18} />, color: '#f59e0b' },
  { view: 'workout', label: 'Workout', icon: <Dumbbell size={18} />, color: '#7c3aed' },
  { view: 'trends', label: 'Trends', icon: <TrendingUp size={18} />, color: '#22c55e' },
  { view: 'prediction', label: 'Prediction', icon: <Brain size={18} />, color: '#0ea5e9' },
  { view: 'profile', label: 'Profile', icon: <User size={18} />, color: '#64748b' },
];

function adjustDate(date: string, delta: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return format(d, 'yyyy-MM-dd');
}

export default function App() {
  const [view, setView] = useState<ViewType>('dashboard');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { foodEntries, workoutEntries, weightEntries, profile, refresh } = useData();

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
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
                {profile?.name && <div className="text-xs text-slate-500">Hi, {profile.name}</div>}
              </div>
            </div>

            {/* Date picker — only for food/workout/dashboard */}
            {(view === 'food' || view === 'workout' || view === 'dashboard') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDate(d => adjustDate(d, -1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                  style={{ background: '#1e293b' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="text-xs font-medium text-slate-300 min-w-24 text-center">
                  {isToday ? 'Today' : format(new Date(selectedDate), 'MMM dd, yyyy')}
                </div>
                <button
                  onClick={() => !isToday && setSelectedDate(d => adjustDate(d, 1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: '#1e293b', opacity: isToday ? 0.3 : 1 }}
                  disabled={isToday}
                >
                  <ChevronRight size={14} />
                </button>
                {!isToday && (
                  <button
                    onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                    className="text-xs px-2 py-1 rounded-md"
                    style={{ background: '#1e293b', color: '#94a3b8' }}
                  >
                    Today
                  </button>
                )}
              </div>
            )}
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
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
                style={{
                  background: view === item.view ? item.color + '22' : 'transparent',
                  color: view === item.view ? item.color : '#64748b',
                  border: `1px solid ${view === item.view ? item.color + '44' : 'transparent'}`,
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Page title */}
            <div className="mb-5">
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span style={{ color: activeNav.color }}>{activeNav.icon}</span>
                {activeNav.label}
              </h1>
              {(view === 'food' || view === 'workout') && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {format(new Date(selectedDate), 'EEEE, MMMM do, yyyy')}
                </p>
              )}
            </div>

            {view === 'dashboard' && (
              <Dashboard
                foodEntries={foodEntries}
                workoutEntries={workoutEntries}
                weightEntries={weightEntries}
                profile={profile}
                selectedDate={selectedDate}
                onUpdate={refresh}
              />
            )}
            {view === 'food' && (
              <FoodTracker
                entries={foodEntries}
                onUpdate={refresh}
                selectedDate={selectedDate}
              />
            )}
            {view === 'workout' && (
              <WorkoutTracker
                entries={workoutEntries}
                onUpdate={refresh}
                selectedDate={selectedDate}
                userWeight={profile?.currentWeight || 70}
              />
            )}
            {view === 'trends' && (
              <TrendAnalysis
                foodEntries={foodEntries}
                workoutEntries={workoutEntries}
                weightEntries={weightEntries}
                profile={profile}
              />
            )}
            {view === 'prediction' && (
              <WeightPrediction
                foodEntries={foodEntries}
                workoutEntries={workoutEntries}
                weightEntries={weightEntries}
                profile={profile}
              />
            )}
            {view === 'profile' && (
              <ProfileSetup profile={profile} onSave={refresh} />
            )}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex" style={{ background: '#0f172a', borderTop: '1px solid #1e293b' }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-all"
            style={{ color: view === item.view ? item.color : '#475569' }}
          >
            {item.icon}
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
