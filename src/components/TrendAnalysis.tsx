import { useState } from 'react';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, ComposedChart, Area,
  PieChart, Pie, Cell,
} from 'recharts';
import type { FoodEntry, WorkoutEntry, WeightEntry, UserProfile, GlucoseEntry } from '../types';
import { getDailySummary, getWeeklyData, getMonthlyData, getLast7Days } from '../utils/calculations';
import { getGlucoseStatus } from './GlucoseTracker';

interface Props {
  foodEntries: FoodEntry[];
  workoutEntries: WorkoutEntry[];
  weightEntries: WeightEntry[];
  glucoseEntries: GlucoseEntry[];
  profile: UserProfile | null;
}

type Period = 'weekly' | 'monthly' | 'yearly';

const TT = {
  contentStyle: { background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#8b949e' },
  itemStyle: { color: '#e6edf3' },
};

const WORKOUT_COLORS: Record<string, string> = {
  running: '#ef4444', walking: '#22c55e', cycling: '#f59e0b',
  swimming: '#3b82f6', weight_training: '#8b5cf6', yoga: '#ec4899',
  hiit: '#f97316', other: '#64748b',
};

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#f59e0b', lunch: '#3b82f6', dinner: '#8b5cf6', snack: '#22c55e',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function calcStreak(days: string[], hasActivity: (date: string) => boolean): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (hasActivity(days[i])) streak++;
    else break;
  }
  return streak;
}

function last84Days(): string[] {
  return Array.from({ length: 84 }, (_, i) =>
    format(subDays(new Date(), 83 - i), 'yyyy-MM-dd')
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TrendAnalysis({ foodEntries, workoutEntries, weightEntries, glucoseEntries, profile }: Props) {
  const [period, setPeriod] = useState<Period>('weekly');

  const deficitGoal = profile?.dailyCalorieDeficitGoal || 500;

  // ── existing aggregations ─────────────────────────────────────────────────

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
    };
  });

  const weeklyData  = getWeeklyData(foodEntries, workoutEntries, weightEntries, profile, 12);
  const monthlyData = getMonthlyData(foodEntries, workoutEntries, weightEntries, profile, 12);

  const chartData = (period === 'weekly' ? weeklyData : monthlyData).map(w => ({
    label: w.label,
    calories: w.avgCalories,
    burned: Math.round(w.totalBurned / (period === 'weekly' ? 7 : 30)),
    deficit: w.avgDeficit,
    workoutMins: w.totalWorkoutMins,
    weight: w.avgWeight,
  }));

  const last7 = getLast7Days().map(d => getDailySummary(d, foodEntries, workoutEntries, weightEntries, profile));
  const avg7Deficit  = Math.round(last7.reduce((s, d) => s + d.calorieDeficit, 0) / 7);
  const avg7Calories = Math.round(last7.reduce((s, d) => s + d.totalCaloriesConsumed, 0) / 7);
  const avg7Workout  = Math.round(last7.reduce((s, d) => s + d.workoutMinutes, 0) / 7);

  const weightSorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const weightChange = weightSorted.length >= 2
    ? parseFloat((weightSorted[weightSorted.length - 1].weight - weightSorted[0].weight).toFixed(1))
    : null;

  // ── NEW: Streaks ──────────────────────────────────────────────────────────

  const allDays84 = last84Days();
  const foodDates    = new Set(foodEntries.map(e => e.date));
  const workoutDates = new Set(workoutEntries.map(e => e.date));
  const deficitDays  = new Set(
    allDays84.filter(d => {
      const s = getDailySummary(d, foodEntries, workoutEntries, weightEntries, profile);
      return s.totalCaloriesConsumed > 0 && s.calorieDeficit >= deficitGoal;
    })
  );

  const foodStreak    = calcStreak(allDays84, d => foodDates.has(d));
  const workoutStreak = calcStreak(allDays84, d => workoutDates.has(d));
  const deficitStreak = calcStreak(allDays84, d => deficitDays.has(d));

  // ── NEW: 12-week Heatmap (84 days) ───────────────────────────────────────

  const heatmapData = allDays84.map(date => {
    const s = getDailySummary(date, foodEntries, workoutEntries, weightEntries, profile);
    const hasFood = s.totalCaloriesConsumed > 0;
    const pct     = hasFood ? Math.min(1, s.calorieDeficit / deficitGoal) : null;
    const color   = pct === null ? '#1c2128'
      : pct >= 1   ? '#22c55e'
      : pct >= 0.5 ? '#f59e0b'
      : pct >= 0   ? '#3b82f6'
      : '#ef4444';
    return { date, pct, color, label: format(new Date(date), 'MMM d') };
  });

  // ── NEW: Macro Ratio Trend (last 28 days) ─────────────────────────────────

  const macroTrend = Array.from({ length: 28 }, (_, i) => {
    const date = format(subDays(new Date(), 27 - i), 'yyyy-MM-dd');
    const s = getDailySummary(date, foodEntries, workoutEntries, weightEntries, profile);
    const total = s.totalCarbs * 4 + s.totalProtein * 4 + s.totalFat * 9;
    return {
      date: format(new Date(date), 'MMM d'),
      carbs:   total > 0 ? Math.round((s.totalCarbs * 4 / total) * 100) : 0,
      protein: total > 0 ? Math.round((s.totalProtein * 4 / total) * 100) : 0,
      fat:     total > 0 ? Math.round((s.totalFat * 9 / total) * 100) : 0,
    };
  }).filter(d => d.carbs + d.protein + d.fat > 0);

  // ── NEW: Meal Timing Breakdown ────────────────────────────────────────────

  const mealStats = (['breakfast', 'lunch', 'dinner', 'snack'] as const).map(meal => {
    const items = foodEntries.filter(e => e.mealType === meal);
    const days  = new Set(items.map(e => e.date)).size || 1;
    return {
      meal,
      avgCals: Math.round(items.reduce((s, e) => s + e.calories, 0) / days),
      count: items.length,
    };
  });

  // ── NEW: Workout Distribution ─────────────────────────────────────────────

  const workoutDist = Object.entries(
    workoutEntries.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({ type, count, color: WORKOUT_COLORS[type] || '#64748b' }))
   .sort((a, b) => b.count - a.count);

  const totalWorkouts = workoutDist.reduce((s, w) => s + w.count, 0);
  const workoutsPerWeek = (totalWorkouts / Math.max(1, allDays84.filter(d => workoutDates.has(d)).length / 7)).toFixed(1);

  // ── NEW: Glucose by Context ───────────────────────────────────────────────

  const glucoseByContext = (['fasting', 'before_meal', 'after_meal', 'bedtime', 'random'] as const)
    .map(ctx => {
      const readings = glucoseEntries.filter(e => e.context === ctx);
      const avg = readings.length > 0
        ? Math.round(readings.reduce((s, e) => s + e.value, 0) / readings.length)
        : null;
      return { context: ctx, label: ctx.replace('_', ' '), avg, count: readings.length };
    })
    .filter(c => c.avg !== null);

  // ── NEW: Goal Achievement Rate (last 8 weeks) ─────────────────────────────

  const goalRate = Array.from({ length: 8 }, (_, wi) => {
    const weekDays = Array.from({ length: 7 }, (_, di) =>
      format(subDays(new Date(), wi * 7 + (6 - di)), 'yyyy-MM-dd')
    );
    const daysWithFood = weekDays.filter(d => foodDates.has(d));
    const daysHit      = weekDays.filter(d => deficitDays.has(d)).length;
    const rate         = daysWithFood.length > 0 ? Math.round((daysHit / 7) * 100) : null;
    return { week: format(new Date(weekDays[0]), 'MMM d'), rate, hit: daysHit };
  }).reverse();

  // ── NEW: Top Foods by Calories ────────────────────────────────────────────

  const foodTotals = Object.values(
    foodEntries.reduce((acc, e) => {
      if (!acc[e.name]) acc[e.name] = { name: e.name, totalCals: 0, count: 0 };
      acc[e.name].totalCals += e.calories;
      acc[e.name].count++;
      return acc;
    }, {} as Record<string, { name: string; totalCals: number; count: number }>)
  ).sort((a, b) => b.totalCals - a.totalCals).slice(0, 8);

  const maxFoodCals = foodTotals[0]?.totalCals || 1;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI row ── */}
      <div className="grid-cols-4">
        {[
          { label: '7-Day Avg Deficit', value: avg7Deficit, unit: 'kcal/day', color: avg7Deficit >= deficitGoal ? '#22c55e' : avg7Deficit > 0 ? '#f59e0b' : '#ef4444', good: avg7Deficit >= deficitGoal },
          { label: '7-Day Avg Calories', value: avg7Calories, unit: 'kcal/day', color: '#f59e0b', good: null },
          { label: 'Avg Workout', value: avg7Workout, unit: 'min/day', color: '#8b5cf6', good: avg7Workout >= 30 },
          { label: 'Weight Change', value: weightChange !== null ? (weightChange > 0 ? `+${weightChange}` : String(weightChange)) : '—', unit: 'kg total', color: weightChange !== null && weightChange < 0 ? '#22c55e' : weightChange !== null && weightChange > 0 ? '#ef4444' : '#64748b', good: weightChange !== null && weightChange < 0 },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{c.label}</div>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{c.unit}</div>
            {c.good !== null && (
              <div style={{ marginTop: 8, fontSize: 12, color: c.good ? '#22c55e' : '#f59e0b' }}>
                {c.good ? '✓ On track' : '⚠ Needs attention'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Streaks ── */}
      <div className="card">
        <div className="section-title">🔥 Current Streaks</div>
        <div className="grid-cols-3">
          {[
            { label: 'Food Logging', streak: foodStreak, icon: '🍽️', color: '#f59e0b' },
            { label: 'Deficit Goal', streak: deficitStreak, icon: '🎯', color: '#22c55e' },
            { label: 'Exercise',     streak: workoutStreak, icon: '💪', color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 6 }}>
                {s.streak}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>day{s.streak !== 1 ? 's' : ''}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 12-week Calorie Heatmap ── */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 4 }}>📅 12-Week Deficit Heatmap</div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
          <span style={{ color: '#22c55e' }}>■</span> Goal met &nbsp;
          <span style={{ color: '#f59e0b' }}>■</span> Partial &nbsp;
          <span style={{ color: '#3b82f6' }}>■</span> Surplus &nbsp;
          <span style={{ color: '#ef4444' }}>■</span> Deficit missed &nbsp;
          <span style={{ color: '#1c2128', border: '1px solid #30363d', display: 'inline-block', width: 10, height: 10 }} /> No data
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
          {Array.from({ length: 12 }, (_, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {heatmapData.slice(wi * 7, wi * 7 + 7).map((d, di) => (
                <div
                  key={di}
                  title={`${d.label}: ${d.pct === null ? 'No data' : d.pct >= 1 ? 'Goal met' : d.pct >= 0 ? `${Math.round(d.pct * 100)}% of goal` : 'Surplus'}`}
                  style={{
                    height: 14, borderRadius: 3,
                    background: d.color,
                    opacity: d.pct === null ? 0.3 : 1,
                    cursor: 'default',
                  }}
                />
              ))}
              <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', marginTop: 2 }}>
                {format(new Date(heatmapData[wi * 7].date), 'MMM d')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Goal Achievement Rate ── */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 2 }}>🎯 Weekly Goal Achievement Rate</div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>% of days per week where calorie deficit ≥ {deficitGoal} kcal</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={goalRate} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip {...TT} formatter={(v: any) => [`${v}%`, 'Days hitting goal']} />
            <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 4" label={{ value: '70%', fill: '#22c55e', fontSize: 10 }} />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} name="Goal Rate %"
              fill="#22c55e"
              label={{ position: 'top', fontSize: 10, fill: '#8b949e', formatter: (v: any) => v !== null ? `${v}%` : '' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Macro Ratio Trend ── */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 2 }}>🥗 Macro Ratio Trend (Last 28 Days)</div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>% of daily calories from each macronutrient</p>
        {macroTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={macroTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} stackOffset="expand">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tickFormatter={v => `${Math.round(v * 100)}%`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={(v: any) => [`${v}%`, '']} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
              <Bar dataKey="carbs"   stackId="a" fill="#4f8ef5" name="Carbs %" />
              <Bar dataKey="protein" stackId="a" fill="#22c55e" name="Protein %" />
              <Bar dataKey="fat"     stackId="a" fill="#f59e0b" name="Fat %" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">Log food to see macro ratios.</div>
        )}
      </div>

      {/* ── Meal Timing + Workout Distribution ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Meal Timing */}
        <div className="card">
          <div className="section-title">🍽️ Avg Calories by Meal</div>
          {mealStats.some(m => m.avgCals > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={mealStats} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="meal" type="category" tick={{ fill: '#8b949e', fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip {...TT} formatter={(v: any) => [`${v} kcal`, 'Avg/day']} />
                <Bar dataKey="avgCals" radius={[0, 4, 4, 0]} name="Avg kcal">
                  {mealStats.map((m) => (
                    <Cell key={m.meal} fill={MEAL_COLORS[m.meal]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">Log meals to see breakdown.</div>
          )}
        </div>

        {/* Workout Distribution */}
        <div className="card">
          <div className="section-title">🏋️ Workout Distribution</div>
          {workoutDist.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PieChart width={110} height={110}>
                  <Pie data={workoutDist} cx={52} cy={52} innerRadius={30} outerRadius={52} dataKey="count" strokeWidth={0}>
                    {workoutDist.map((w, i) => <Cell key={i} fill={w.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {workoutDist.slice(0, 5).map(w => (
                    <div key={w.type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: w.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1, textTransform: 'capitalize' }}>{w.type.replace('_', ' ')}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: w.color }}>{w.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text2)' }}>Total workouts</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{totalWorkouts}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                <span style={{ color: 'var(--text2)' }}>Avg per week</span>
                <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{workoutsPerWeek}</span>
              </div>
            </>
          ) : (
            <div className="empty-state">Log workouts to see distribution.</div>
          )}
        </div>
      </div>

      {/* ── Glucose by Context ── */}
      {glucoseByContext.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 2 }}>🩸 Average Glucose by Context</div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Average mg/dL reading for each measurement context (all time)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={glucoseByContext} margin={{ top: 5, right: 30, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
              <Tooltip {...TT} formatter={(v: any) => [`${v} mg/dL`, 'Avg Glucose']} />
              <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '100', fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '140', fill: '#ef4444', fontSize: 10 }} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]} name="Avg mg/dL"
                label={{ position: 'top', fontSize: 11, fill: '#8b949e' }}>
                {glucoseByContext.map((c) => {
                  const status = getGlucoseStatus(c.avg!, c.context as GlucoseEntry['context']);
                  return <Cell key={c.context} fill={status.color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {glucoseByContext.map(c => (
              <div key={c.context} style={{ fontSize: 11, color: 'var(--text3)' }}>
                <span style={{ color: 'var(--text2)', textTransform: 'capitalize' }}>{c.label}</span>: {c.count} readings
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Foods by Calories ── */}
      {foodTotals.length > 0 && (
        <div className="card">
          <div className="section-title">🏆 Top Foods by Total Calories</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {foodTotals.map((f, i) => (
              <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i < 3 ? '#f59e0b' : 'var(--text3)', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {f.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>
                      {f.totalCals.toLocaleString()} kcal
                    </span>
                  </div>
                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${(f.totalCals / maxFoodCals) * 100}%`, background: i < 3 ? '#f59e0b' : '#3b82f6' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                  ×{f.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Period selector ── */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 4, borderRadius: 8, width: 'fit-content', background: 'var(--card)', border: '1px solid var(--border)' }}>
        {(['weekly', 'monthly', 'yearly'] as Period[]).map(p => (
          <button key={p} type="button" onClick={() => setPeriod(p)}
            style={{ padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', border: 'none', transition: 'all .15s', background: period === p ? 'var(--blue)' : 'transparent', color: period === p ? '#fff' : 'var(--text2)' }}>
            {p}
          </button>
        ))}
      </div>

      {/* ── Calorie Deficit Trend ── */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 2 }}>Calorie Deficit Trend</div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Positive = deficit (burning more than consuming). Target: {deficitGoal} kcal</p>
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
            <Tooltip {...TT} />
            <ReferenceLine y={deficitGoal} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Goal', fill: '#22c55e', fontSize: 10 }} />
            <ReferenceLine y={0} stroke="#334155" />
            <Area type="monotone" dataKey="deficit" stroke="#22c55e" strokeWidth={2} fill="url(#defGrad)" name="Avg Deficit" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Calories Consumed vs Burned ── */}
      <div className="card">
        <div className="section-title">Calories Consumed vs. Burned</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...TT} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
            <Bar dataKey="calories" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Avg Consumed" />
            <Bar dataKey="burned"   fill="#ef4444" radius={[3, 3, 0, 0]} name="Avg Burned" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Workout Minutes ── */}
      <div className="card">
        <div className="section-title">Workout Minutes Trend</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...TT} />
            <ReferenceLine y={150} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: 'WHO Rec.', fill: '#8b5cf6', fontSize: 10 }} />
            <Bar dataKey="workoutMins" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Workout Mins" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Weight Trend ── */}
      <div className="card">
        <div className="section-title">Weight Trend</div>
        {chartData.some(d => d.weight !== null) ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.filter(d => d.weight !== null)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} formatter={(v) => [`${v} kg`, 'Avg Weight']} />
              {profile?.targetWeight && (
                <ReferenceLine y={profile.targetWeight} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Target', fill: '#22c55e', fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={2.5} dot={{ fill: '#0ea5e9', r: 4 }} name="Avg Weight (kg)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state" style={{ padding: '32px 20px', fontSize: 14 }}>Log your weight daily to see the trend.</div>
        )}
      </div>

      {/* ── GI Trend ── */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 2 }}>Glycemic Index Trend (Last 30 Days)</div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Average GI of all foods consumed per day</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyData.filter(d => d.gi > 0)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...TT} formatter={(v) => [Number(v).toFixed(1), 'Avg GI']} />
            <ReferenceLine y={55} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Low/Med', fill: '#22c55e', fontSize: 9 }} />
            <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Med/High', fill: '#f59e0b', fontSize: 9 }} />
            <Line type="monotone" dataKey="gi" stroke="#e879f9" strokeWidth={2} dot={false} name="Avg GI" />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
