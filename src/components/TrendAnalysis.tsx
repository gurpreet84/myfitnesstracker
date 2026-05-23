import { useState } from 'react';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, ComposedChart, Area,
} from 'recharts';
import type { FoodEntry, WorkoutEntry, WeightEntry, UserProfile } from '../types';
import { getDailySummary, getWeeklyData, getMonthlyData, getLast7Days } from '../utils/calculations';

interface Props {
  foodEntries: FoodEntry[];
  workoutEntries: WorkoutEntry[];
  weightEntries: WeightEntry[];
  profile: UserProfile | null;
}

type Period = 'weekly' | 'monthly' | 'yearly';

const TOOLTIP_STYLE = {
  contentStyle: { background: 'var(--bg)', border: '1px solid var(--border-hi)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--text2)' },
  itemStyle: { color: 'var(--text)' },
};

export default function TrendAnalysis({ foodEntries, workoutEntries, weightEntries, profile }: Props) {
  const [period, setPeriod] = useState<Period>('weekly');

  // Daily data (last 30 days)
  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
    const s = getDailySummary(date, foodEntries, workoutEntries, weightEntries, profile);
    return {
      date: format(new Date(date), 'MMM dd'),
      calories: s.totalCaloriesConsumed,
      burned: s.totalCaloriesBurned,
      deficit: s.calorieDeficit,
      gi: s.avgGlycemicIndex,
      workoutMins: s.workoutMinutes,
      weight: s.weight ?? null,
      netCalories: s.netCalories,
    };
  });

  const weeklyData = getWeeklyData(foodEntries, workoutEntries, weightEntries, profile, 12);
  const monthlyData = getMonthlyData(foodEntries, workoutEntries, weightEntries, profile, 12);

  const chartData = period === 'weekly' ? weeklyData.map(w => ({
    label: w.label,
    calories: w.avgCalories,
    burned: Math.round(w.totalBurned / 7),
    deficit: w.avgDeficit,
    workoutMins: w.totalWorkoutMins,
    weight: w.avgWeight,
  })) : period === 'monthly' ? monthlyData.map(m => ({
    label: m.label,
    calories: m.avgCalories,
    burned: Math.round(m.totalBurned / 30),
    deficit: m.avgDeficit,
    workoutMins: m.totalWorkoutMins,
    weight: m.avgWeight,
  })) : monthlyData.map(m => ({
    label: m.label,
    calories: m.avgCalories,
    burned: Math.round(m.totalBurned / 30),
    deficit: m.avgDeficit,
    workoutMins: m.totalWorkoutMins,
    weight: m.avgWeight,
  }));

  // Compute stats for insight cards
  const last7 = getLast7Days().map(d => getDailySummary(d, foodEntries, workoutEntries, weightEntries, profile));
  const avg7Deficit = Math.round(last7.reduce((s, d) => s + d.calorieDeficit, 0) / 7);
  const avg7Calories = Math.round(last7.reduce((s, d) => s + d.totalCaloriesConsumed, 0) / 7);
  const avg7Workout = Math.round(last7.reduce((s, d) => s + d.workoutMinutes, 0) / 7);

  const weightSorted = weightEntries.sort((a, b) => a.date.localeCompare(b.date));
  const weightChange = weightSorted.length >= 2
    ? parseFloat((weightSorted[weightSorted.length - 1].weight - weightSorted[0].weight).toFixed(1))
    : null;

  return (
    <div className="space-y-5">
      {/* Insight cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '7-Day Avg Deficit', value: avg7Deficit, unit: 'kcal/day', color: avg7Deficit >= 0 ? '#22c55e' : '#ef4444', good: avg7Deficit >= 300 },
          { label: '7-Day Avg Calories', value: avg7Calories, unit: 'kcal/day', color: '#f59e0b', good: null },
          { label: 'Avg Workout', value: avg7Workout, unit: 'min/day', color: '#8b5cf6', good: avg7Workout >= 30 },
          {
            label: 'Weight Change',
            value: weightChange !== null ? (weightChange > 0 ? `+${weightChange}` : String(weightChange)) : '—',
            unit: 'kg total',
            color: weightChange !== null && weightChange < 0 ? '#22c55e' : weightChange !== null && weightChange > 0 ? '#ef4444' : '#64748b',
            good: weightChange !== null && weightChange < 0,
          },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <div className="text-xs text-slate-400 mb-2">{c.label}</div>
            <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs text-slate-500">{c.unit}</div>
            {c.good !== null && (
              <div className="mt-2 text-xs" style={{ color: c.good ? '#22c55e' : '#f59e0b' }}>
                {c.good ? '✓ On track' : '⚠ Needs attention'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
        {(['weekly', 'monthly', 'yearly'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
            style={{
              background: period === p ? '#2563eb' : 'transparent',
              color: period === p ? '#fff' : '#94a3b8',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Calorie deficit trend */}
      <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <h3 className="text-sm font-semibold text-slate-300 mb-1">Calorie Deficit Trend</h3>
        <p className="text-xs text-slate-500 mb-4">Positive = deficit (burning more than consuming). Target: {profile?.dailyCalorieDeficitGoal || 500} kcal</p>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="defGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <ReferenceLine y={profile?.dailyCalorieDeficitGoal || 500} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#22c55e', fontSize: 10 }} />
            <ReferenceLine y={0} stroke="#334155" />
            <Area type="monotone" dataKey="deficit" stroke="#22c55e" strokeWidth={2} fill="url(#defGrad)" name="Avg Deficit" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Calories in vs burned */}
      <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Calories Consumed vs. Burned</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
            <Bar dataKey="calories" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Avg Consumed" />
            <Bar dataKey="burned" fill="#ef4444" radius={[3, 3, 0, 0]} name="Avg Burned" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Workout minutes trend */}
      <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Workout Minutes Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <ReferenceLine y={150} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: 'WHO Rec.', fill: '#8b5cf6', fontSize: 10 }} />
            <Bar dataKey="workoutMins" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Workout Mins" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weight trend (line) */}
      <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Weight Trend</h3>
        {chartData.some(d => d.weight !== null) ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.filter(d => d.weight !== null)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, 'Avg Weight']} />
              {profile?.targetWeight && (
                <ReferenceLine y={profile.targetWeight} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Target', fill: '#22c55e', fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={2.5} dot={{ fill: '#0ea5e9', r: 4 }} name="Avg Weight (kg)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">Log your weight daily to see the trend.</div>
        )}
      </div>

      {/* Daily GI trend (last 30 days) */}
      <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <h3 className="text-sm font-semibold text-slate-300 mb-1">Glycemic Index Trend (Last 30 Days)</h3>
        <p className="text-xs text-slate-500 mb-4">Average GI of all foods consumed per day</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyData.filter(d => d.gi > 0)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [Number(v).toFixed(1), 'Avg GI']} />
            <ReferenceLine y={55} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Low/Med', fill: '#22c55e', fontSize: 9 }} />
            <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Med/High', fill: '#f59e0b', fontSize: 9 }} />
            <Line type="monotone" dataKey="gi" stroke="#e879f9" strokeWidth={2} dot={false} name="Avg GI" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
