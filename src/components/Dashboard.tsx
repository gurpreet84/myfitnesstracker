import { format } from 'date-fns';
import { Flame, Apple, Dumbbell, TrendingDown, Scale, Target, Activity } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { FoodEntry, WorkoutEntry, WeightEntry, UserProfile } from '../types';
import { getDailySummary, calculateTDEE, calculateBMI, getGlycemicCategory, getLast7Days } from '../utils/calculations';
import { saveWeightEntry, generateId } from '../utils/storage';
import { useState } from 'react';

interface Props {
  foodEntries: FoodEntry[];
  workoutEntries: WorkoutEntry[];
  weightEntries: WeightEntry[];
  profile: UserProfile | null;
  selectedDate: string;
  onUpdate: () => void;
}

const MACRO_COLORS = ['#3b82f6', '#22c55e', '#f97316'];

export default function Dashboard({ foodEntries, workoutEntries, weightEntries, profile, selectedDate, onUpdate }: Props) {
  const [weightInput, setWeightInput] = useState('');

  const today = getDailySummary(selectedDate, foodEntries, workoutEntries, weightEntries, profile);
  const tdee = profile ? calculateTDEE(profile) : 2000;
  const calorieGoal = profile?.dailyCalorieGoal || tdee;
  const deficit = tdee - today.netCalories;
  const deficitGoal = profile?.dailyCalorieDeficitGoal || 500;

  // last 7 days sparkline
  const last7 = getLast7Days().map(date => {
    const s = getDailySummary(date, foodEntries, workoutEntries, weightEntries, profile);
    return {
      date: format(new Date(date), 'EEE'),
      calories: s.totalCaloriesConsumed,
      burned: s.totalCaloriesBurned,
      deficit: Math.max(0, s.calorieDeficit),
    };
  });

  // Macro pie data
  const macroData = [
    { name: 'Carbs', value: today.totalCarbs * 4 },
    { name: 'Protein', value: today.totalProtein * 4 },
    { name: 'Fat', value: today.totalFat * 9 },
  ].filter(d => d.value > 0);

  const calPct = Math.min(100, Math.round((today.totalCaloriesConsumed / calorieGoal) * 100));
  const deficitPct = Math.min(100, Math.round((deficit / deficitGoal) * 100));

  const bmi = profile ? calculateBMI(profile.currentWeight, profile.height) : null;
  const latestWeight = weightEntries.sort((a, b) => b.date.localeCompare(a.date))[0];

  function logWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!weightInput) return;
    saveWeightEntry({ id: generateId(), date: selectedDate, weight: Number(weightInput) });
    setWeightInput('');
    onUpdate();
  }

  const giCat = getGlycemicCategory(today.avgGlycemicIndex);

  return (
    <div className="space-y-5">
      {/* Top KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Calories In',
            value: today.totalCaloriesConsumed,
            unit: 'kcal',
            sub: `Goal: ${calorieGoal}`,
            icon: <Apple size={18} />,
            color: '#f59e0b',
            pct: calPct,
          },
          {
            label: 'Calories Burned',
            value: today.totalCaloriesBurned,
            unit: 'kcal',
            sub: `Exercise only`,
            icon: <Flame size={18} />,
            color: '#ef4444',
            pct: null,
          },
          {
            label: 'Calorie Deficit',
            value: deficit,
            unit: 'kcal',
            sub: `Goal: ${deficitGoal} kcal`,
            icon: <TrendingDown size={18} />,
            color: deficit >= deficitGoal ? '#22c55e' : deficit > 0 ? '#f59e0b' : '#ef4444',
            pct: deficitPct,
          },
          {
            label: 'Workout Time',
            value: today.workoutMinutes,
            unit: 'min',
            sub: today.steps ? `${today.steps.toLocaleString()} steps` : 'No steps logged',
            icon: <Dumbbell size={18} />,
            color: '#8b5cf6',
            pct: null,
          },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-4" style={{ background: '#1e293b' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">{kpi.label}</span>
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: kpi.color }}>
              {kpi.value.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mb-2">{kpi.unit} • {kpi.sub}</div>
            {kpi.pct !== null && (
              <div className="rounded-full h-1.5 w-full" style={{ background: '#334155' }}>
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${kpi.pct}%`, background: kpi.color }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Middle row: 7-day chart + macro pie + GI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day calorie chart */}
        <div className="lg:col-span-2 rounded-xl p-4" style={{ background: '#1e293b' }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-blue-400" /> 7-Day Calorie Overview
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={last7} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="calories" stroke="#f59e0b" strokeWidth={2} fill="url(#calGrad)" name="Consumed" />
              <Area type="monotone" dataKey="burned" stroke="#ef4444" strokeWidth={2} fill="url(#burnGrad)" name="Burned" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Macros + GI */}
        <div className="space-y-3">
          <div className="rounded-xl p-4" style={{ background: '#1e293b' }}>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Today's Macros</h3>
            {macroData.length > 0 ? (
              <div className="flex items-center gap-3">
                <PieChart width={100} height={100}>
                  <Pie data={macroData} cx={45} cy={45} innerRadius={30} outerRadius={48} dataKey="value" strokeWidth={0}>
                    {macroData.map((_, i) => <Cell key={i} fill={MACRO_COLORS[i]} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-1">
                  {[
                    { name: 'Carbs', val: today.totalCarbs, color: MACRO_COLORS[0] },
                    { name: 'Protein', val: today.totalProtein, color: MACRO_COLORS[1] },
                    { name: 'Fat', val: today.totalFat, color: MACRO_COLORS[2] },
                  ].map(m => (
                    <div key={m.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-slate-400 w-12">{m.name}</span>
                      <span className="text-slate-200 font-medium">{m.val.toFixed(1)}g</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 text-center py-4">Log food to see macros</p>
            )}
          </div>

          <div className="rounded-xl p-4" style={{ background: '#1e293b' }}>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Avg Glycemic Index</h3>
            {today.avgGlycemicIndex > 0 ? (
              <>
                <div className="text-3xl font-bold" style={{ color: giCat.color }}>{today.avgGlycemicIndex}</div>
                <div className="text-xs mt-1" style={{ color: giCat.color }}>{giCat.label} GI</div>
                <div className="mt-2 h-2 rounded-full" style={{ background: '#334155' }}>
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(100, today.avgGlycemicIndex)}%`, background: giCat.color }} />
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>Low &lt;55</span><span>Med &lt;70</span><span>High</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-600 py-2">No GI data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Weight + Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weight log */}
        <div className="rounded-xl p-4" style={{ background: '#1e293b' }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Scale size={16} className="text-cyan-400" /> Weight Log
          </h3>
          <form onSubmit={logWeight} className="flex gap-2 mb-3">
            <input
              type="number"
              step="0.1"
              min="30"
              max="300"
              className="flex-1 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
              style={{ background: '#0f172a', border: '1px solid #334155' }}
              placeholder="Today's weight (kg)"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
            />
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#0ea5e9', color: '#fff' }}>
              Log
            </button>
          </form>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {weightEntries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(w => (
              <div key={w.id} className="flex justify-between text-xs text-slate-400 px-2 py-1 rounded" style={{ background: '#0f172a' }}>
                <span>{format(new Date(w.date), 'MMM dd, yyyy')}</span>
                <span className="text-cyan-400 font-medium">{w.weight} kg</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile / Goals summary */}
        <div className="rounded-xl p-4" style={{ background: '#1e293b' }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Target size={16} className="text-green-400" /> Profile & Goals
          </h3>
          {profile ? (
            <div className="space-y-2">
              {[
                { label: 'Current Weight', value: `${latestWeight?.weight || profile.currentWeight} kg` },
                { label: 'Target Weight', value: `${profile.targetWeight} kg` },
                { label: 'To Lose', value: `${Math.max(0, (latestWeight?.weight || profile.currentWeight) - profile.targetWeight).toFixed(1)} kg` },
                { label: 'BMI', value: bmi ? String(bmi) : '—' },
                { label: 'TDEE', value: `${tdee} kcal/day` },
                { label: 'Deficit Goal', value: `${deficitGoal} kcal/day` },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-xs">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="text-slate-200 font-medium">{item.value}</span>
                </div>
              ))}
              <div className="mt-3 pt-2" style={{ borderTop: '1px solid #334155' }}>
                <div className="text-xs text-slate-500 mb-1">Progress to target</div>
                {(() => {
                  const start = profile.currentWeight;
                  const current = latestWeight?.weight || profile.currentWeight;
                  const target = profile.targetWeight;
                  const pct = start > target
                    ? Math.min(100, Math.round(((start - current) / (start - target)) * 100))
                    : 0;
                  return (
                    <>
                      <div className="h-2 rounded-full" style={{ background: '#334155' }}>
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: '#22c55e' }} />
                      </div>
                      <div className="text-xs text-green-400 mt-1">{pct}% achieved</div>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Complete your profile to see goals.</p>
          )}
        </div>
      </div>
    </div>
  );
}
