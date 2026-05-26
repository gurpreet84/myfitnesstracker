import { useState, useMemo } from 'react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { Trophy, Flame, Target, Zap, Droplets, Heart, TrendingDown, Smile } from 'lucide-react';
import type { FoodEntry, WorkoutEntry, GlucoseEntry, UserProfile, MoodEntry } from '../types';

interface Props {
  foodEntries: FoodEntry[];
  workoutEntries: WorkoutEntry[];
  glucoseEntries: GlucoseEntry[];
  moodEntries: MoodEntry[];
  profile: UserProfile | null;
}

interface ChallengeProgress {
  challengeId: string;
  startDate: string;
}

const STORAGE_KEY = 'fit_challenges';

function load(): ChallengeProgress[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function save(data: ChallengeProgress[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface ChallengeDef {
  id: string;
  name: string;
  description: string;
  days: number;
  icon: React.ReactNode;
  color: string;
  check: (date: string, ctx: CheckContext) => boolean;
}

interface CheckContext {
  foodEntries: FoodEntry[];
  workoutEntries: WorkoutEntry[];
  glucoseEntries: GlucoseEntry[];
  moodEntries: MoodEntry[];
  profile: UserProfile | null;
}

const CHALLENGES: ChallengeDef[] = [
  {
    id: 'protein-30',
    name: 'Protein Power',
    description: 'Hit 100g+ protein every day for 30 days',
    days: 30,
    icon: <Flame size={18} />,
    color: '#f59e0b',
    check: (date, { foodEntries }) => {
      const total = foodEntries.filter(e => e.date === date).reduce((s, e) => s + e.protein, 0);
      return total >= 100;
    },
  },
  {
    id: 'workout-21',
    name: 'Movement Streak',
    description: 'Log at least one workout every day for 21 days',
    days: 21,
    icon: <Zap size={18} />,
    color: '#8b5cf6',
    check: (date, { workoutEntries }) => workoutEntries.some(e => e.date === date),
  },
  {
    id: 'calorie-14',
    name: 'Calorie Control',
    description: 'Stay within your calorie goal for 14 days',
    days: 14,
    icon: <Target size={18} />,
    color: '#22c55e',
    check: (date, { foodEntries, profile }) => {
      if (!profile?.dailyCalorieGoal) return false;
      const total = foodEntries.filter(e => e.date === date).reduce((s, e) => s + e.calories, 0);
      return total > 0 && total <= profile.dailyCalorieGoal;
    },
  },
  {
    id: 'deficit-28',
    name: 'Deficit Master',
    description: 'Maintain a calorie deficit every day for 28 days',
    days: 28,
    icon: <TrendingDown size={18} />,
    color: '#06b6d4',
    check: (date, { foodEntries, workoutEntries, profile }) => {
      if (!profile?.dailyCalorieGoal) return false;
      const eaten  = foodEntries.filter(e => e.date === date).reduce((s, e) => s + e.calories, 0);
      const burned = workoutEntries.filter(e => e.date === date).reduce((s, e) => s + e.caloriesBurned, 0);
      return eaten > 0 && eaten - burned < profile.dailyCalorieGoal;
    },
  },
  {
    id: 'glucose-14',
    name: 'Glucose Guardian',
    description: 'Log glucose at least once every day for 14 days',
    days: 14,
    icon: <Droplets size={18} />,
    color: '#3b82f6',
    check: (date, { glucoseEntries }) => glucoseEntries.some(e => e.date === date),
  },
  {
    id: 'low-gi-7',
    name: 'Low GI Week',
    description: 'Keep average GI under 55 every day for 7 days',
    days: 7,
    icon: <Heart size={18} />,
    color: '#ef4444',
    check: (date, { foodEntries }) => {
      const day = foodEntries.filter(e => e.date === date && e.glycemicIndex > 0);
      if (!day.length) return false;
      const avg = day.reduce((s, e) => s + e.glycemicIndex, 0) / day.length;
      return avg < 55;
    },
  },
  {
    id: 'mood-14',
    name: 'Mood Logger',
    description: 'Track your mood every day for 14 days',
    days: 14,
    icon: <Smile size={18} />,
    color: '#f97316',
    check: (date, { moodEntries }) => moodEntries.some(e => e.date === date),
  },
  {
    id: 'workout-burn-14',
    name: 'Burn 200 Daily',
    description: 'Burn 200+ calories working out every day for 14 days',
    days: 14,
    icon: <Flame size={18} />,
    color: '#ec4899',
    check: (date, { workoutEntries }) => {
      const burned = workoutEntries.filter(e => e.date === date).reduce((s, e) => s + e.caloriesBurned, 0);
      return burned >= 200;
    },
  },
];

export default function Challenges({ foodEntries, workoutEntries, glucoseEntries, moodEntries, profile }: Props) {
  const [joined, setJoined] = useState<ChallengeProgress[]>(load);
  const today = format(new Date(), 'yyyy-MM-dd');

  const ctx: CheckContext = { foodEntries, workoutEntries, glucoseEntries, moodEntries, profile };

  const progressMap = useMemo(() => {
    const map: Record<string, { completed: number; pct: number; done: boolean; daysLeft: number }> = {};
    for (const j of joined) {
      const start  = parseISO(j.startDate);
      const chal   = CHALLENGES.find(c => c.id === j.challengeId)!;
      const period = eachDayOfInterval({ start, end: new Date(Math.min(Date.now(), new Date(j.startDate).getTime() + (chal.days - 1) * 86400000)) });
      const completed = period.filter(d => chal.check(format(d, 'yyyy-MM-dd'), ctx)).length;
      const totalDays  = chal.days;
      const elapsed    = period.length;
      const daysLeft   = Math.max(0, totalDays - elapsed);
      map[j.challengeId] = { completed, pct: completed / totalDays, done: completed >= totalDays, daysLeft };
    }
    return map;
  }, [joined, foodEntries, workoutEntries, glucoseEntries, moodEntries]);

  function join(id: string) {
    const next = [...joined.filter(j => j.challengeId !== id), { challengeId: id, startDate: today }];
    setJoined(next); save(next);
  }

  function leave(id: string) {
    const next = joined.filter(j => j.challengeId !== id);
    setJoined(next); save(next);
  }

  const active    = CHALLENGES.filter(c => joined.some(j => j.challengeId === c.id));
  const available = CHALLENGES.filter(c => !joined.some(j => j.challengeId === c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Active challenges */}
      {active.length > 0 && (
        <div>
          <div className="section-title"><Trophy size={16} style={{ color: 'var(--amber)' }} /> Active Challenges</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {active.map(c => {
              const prog = progressMap[c.id] || { completed: 0, pct: 0, done: false, daysLeft: c.days };
              const j    = joined.find(j => j.challengeId === c.id)!;
              const todayDone = c.check(today, ctx);
              return (
                <div key={c.id} className="card slide-up" style={{ borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${c.color}22`, color: c.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {prog.done ? <Trophy size={18} /> : c.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{c.name}</span>
                        {prog.done && <span className="tag" style={{ background: `${c.color}22`, color: c.color }}>✓ Complete!</span>}
                        {!prog.done && todayDone && <span className="tag" style={{ background: '#22c55e22', color: '#22c55e' }}>Today ✓</span>}
                        {!prog.done && !todayDone && <span className="tag" style={{ background: '#ef444422', color: '#ef4444' }}>Today pending</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>{c.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="progress" style={{ flex: 1 }}>
                          <div className="progress-bar" style={{ width: `${Math.min(100, prog.pct * 100)}%`, background: c.color }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: c.color, whiteSpace: 'nowrap' }}>
                          {prog.completed}/{c.days}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                        Started {j.startDate} · {prog.done ? 'Completed!' : `${prog.daysLeft} days left in window`}
                      </div>
                    </div>
                    <button onClick={() => leave(c.id)} className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 11, flexShrink: 0 }}>
                      Leave
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available challenges */}
      <div>
        <div className="section-title"><Zap size={16} style={{ color: 'var(--blue)' }} /> Available Challenges</div>
        {available.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <Trophy size={32} style={{ color: 'var(--amber)', margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>You're in all challenges!</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>Complete them to free up slots.</div>
          </div>
        ) : (
          <div className="grid-cols-2">
            {available.map(c => (
              <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `${c.color}22`, color: c.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{c.description}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{c.days} days</span>
                  <button onClick={() => join(c.id)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {joined.length > 0 && (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(139,92,246,.08))', border: '1px solid rgba(139,92,246,.2)' }}>
          <div className="section-title"><Trophy size={14} style={{ color: 'var(--amber)' }} /> Challenge Stats</div>
          <div className="grid-cols-3">
            {[
              { label: 'Active',     value: active.length,                                         color: 'var(--blue)'   },
              { label: 'Completed',  value: active.filter(c => progressMap[c.id]?.done).length,    color: 'var(--green)'  },
              { label: 'Total Days', value: active.reduce((s, c) => s + (progressMap[c.id]?.completed || 0), 0), color: 'var(--amber)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
