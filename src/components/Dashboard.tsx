import { useState } from 'react';
import { format } from 'date-fns';
import { Flame, Apple, Dumbbell, TrendingDown, Scale, Target, Activity, Droplets } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from 'recharts';
import type { FoodEntry, WorkoutEntry, WeightEntry, UserProfile, GlucoseEntry } from '../types';
import { getDailySummary, calculateTDEE, calculateBMI, getGlycemicCategory, getLast7Days } from '../utils/calculations';
import { saveWeightEntry, generateId } from '../utils/storage';
import { getGlucoseStatus, estimateHbA1c } from './GlucoseTracker';

interface Props {
  foodEntries: FoodEntry[];
  workoutEntries: WorkoutEntry[];
  weightEntries: WeightEntry[];
  glucoseEntries: GlucoseEntry[];
  profile: UserProfile | null;
  selectedDate: string;
  onUpdate: () => void;
}

const TT = {
  contentStyle: { background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#8b949e' },
  itemStyle: { color: '#e6edf3' },
};

export default function Dashboard({ foodEntries, workoutEntries, weightEntries, glucoseEntries, profile, selectedDate, onUpdate }: Props) {
  const [weightInput, setWeightInput] = useState('');

  const today       = getDailySummary(selectedDate, foodEntries, workoutEntries, weightEntries, profile);
  const tdee        = profile ? calculateTDEE(profile) : 2000;
  const calorieGoal = profile?.dailyCalorieGoal || tdee;
  const deficit     = tdee - today.netCalories;
  const deficitGoal = profile?.dailyCalorieDeficitGoal || 500;
  const calPct      = Math.min(100, Math.round((today.totalCaloriesConsumed / calorieGoal) * 100));
  const deficitPct  = Math.min(100, Math.round((deficit / deficitGoal) * 100));
  const bmi         = profile ? calculateBMI(profile.currentWeight, profile.height) : null;
  const latestWeight = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
  const giCat       = getGlycemicCategory(today.avgGlycemicIndex);

  // 7-day chart
  const last7 = getLast7Days().map(date => {
    const s = getDailySummary(date, foodEntries, workoutEntries, weightEntries, profile);
    return { date: format(new Date(date), 'EEE'), calories: s.totalCaloriesConsumed, burned: s.totalCaloriesBurned };
  });

  const macroData = [
    { name: 'Carbs',   value: today.totalCarbs * 4 },
    { name: 'Protein', value: today.totalProtein * 4 },
    { name: 'Fat',     value: today.totalFat * 9 },
  ].filter(d => d.value > 0);

  // Glucose
  const hba1c = estimateHbA1c(glucoseEntries);
  const recentGlucose = [...glucoseEntries]
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(-20)
    .map(e => ({ label: `${format(new Date(e.date), 'MMM d')} ${e.time}`, value: e.value, color: getGlucoseStatus(e.value, e.context).color }));
  const latestGlucose = recentGlucose[recentGlucose.length - 1];

  function logWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!weightInput) return;
    saveWeightEntry({ id: generateId(), date: selectedDate, weight: Number(weightInput) });
    setWeightInput('');
    onUpdate();
  }

  const MACRO_COLORS = ['#4f8ef5', '#2dd4a0', '#f0ac3c'];

  const kpis = [
    { label: 'Calories In',    value: today.totalCaloriesConsumed, unit: 'kcal',
      sub: `Goal: ${calorieGoal}`, icon: <Apple size={16} />, color: '#f0ac3c',
      pct: calPct, glow: 'kpi-amber',
      grad: 'linear-gradient(135deg, rgba(240,172,60,.12), rgba(240,172,60,.04))' },
    { label: 'Calories Burned', value: today.totalCaloriesBurned, unit: 'kcal',
      sub: 'Exercise', icon: <Flame size={16} />, color: '#f06060',
      pct: null, glow: 'kpi-red',
      grad: 'linear-gradient(135deg, rgba(240,96,96,.12), rgba(240,96,96,.04))' },
    { label: 'Calorie Deficit', value: deficit, unit: 'kcal',
      sub: `Goal: ${deficitGoal}`, icon: <TrendingDown size={16} />,
      color: deficit >= deficitGoal ? '#2dd4a0' : deficit > 0 ? '#f0ac3c' : '#f06060',
      pct: deficitPct, glow: deficit >= deficitGoal ? 'kpi-green' : 'kpi-amber',
      grad: `linear-gradient(135deg, ${deficit >= deficitGoal ? 'rgba(45,212,160,.12)' : 'rgba(240,172,60,.12)'}, transparent)` },
    { label: 'Workout Time',   value: today.workoutMinutes, unit: 'min',
      sub: today.steps ? `${today.steps.toLocaleString()} steps` : 'No steps',
      icon: <Dumbbell size={16} />, color: '#a855f7',
      pct: null, glow: 'kpi-purple',
      grad: 'linear-gradient(135deg, rgba(168,85,247,.12), rgba(168,85,247,.04))' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* KPI row */}
      <div className="grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="card"
            style={{ padding: 18, background: k.grad }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{k.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${k.color}22`, color: k.color }}>{k.icon}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color, letterSpacing: '-.02em', lineHeight: 1 }}>
              {k.value.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{k.unit} · {k.sub}</div>
            {k.pct !== null && (
              <div className="progress" style={{ marginTop: 12 }}>
                <div className="progress-bar" style={{ width: `${k.pct}%`, background: k.color }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 7-day chart + macros */}
      <div className="grid-dash-2-1">
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={15} style={{ color: 'var(--blue)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>7-Day Calorie Overview</span>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={last7} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f0ac3c" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f0ac3c" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f06060" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f06060" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Area type="monotone" dataKey="calories" stroke="#f0ac3c" strokeWidth={2} fill="url(#cg1)" name="Consumed" />
              <Area type="monotone" dataKey="burned"   stroke="#f06060" strokeWidth={2} fill="url(#cg2)" name="Burned" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Macros */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Today's Macros</div>
            {macroData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PieChart width={90} height={90}>
                  <Pie data={macroData} cx={42} cy={42} innerRadius={27} outerRadius={44} dataKey="value" strokeWidth={0}>
                    {macroData.map((_, i) => <Cell key={i} fill={MACRO_COLORS[i]} />)}
                  </Pie>
                </PieChart>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { name: 'Carbs',   val: today.totalCarbs,   color: MACRO_COLORS[0] },
                    { name: 'Protein', val: today.totalProtein, color: MACRO_COLORS[1] },
                    { name: 'Fat',     val: today.totalFat,     color: MACRO_COLORS[2] },
                  ].map(m => (
                    <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text2)', width: 44 }}>{m.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.val.toFixed(1)}g</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>Log food to see macros</p>
            )}
          </div>

          {/* GI */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Avg Glycemic Index</div>
            {today.avgGlycemicIndex > 0 ? (
              <>
                <div style={{ fontSize: 36, fontWeight: 800, color: giCat.color, letterSpacing: '-.03em', lineHeight: 1 }}>
                  {today.avgGlycemicIndex}
                </div>
                <div style={{ fontSize: 11, color: giCat.color, marginTop: 3, fontWeight: 600 }}>{giCat.label}</div>
                <div className="progress" style={{ marginTop: 10 }}>
                  <div className="progress-bar" style={{ width: `${Math.min(100, today.avgGlycemicIndex)}%`, background: giCat.color }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                  <span>Low &lt;55</span><span>Med &lt;70</span><span>High</span>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>No GI data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Glucose section */}
      <div className="grid-dash-2-1">
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Droplets size={15} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Blood Glucose (mg/dL)</span>
          </div>
          {recentGlucose.length > 0 ? (
            <ResponsiveContainer width="100%" height={155}>
              <LineChart data={recentGlucose} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(recentGlucose.length / 5) - 1)} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip {...TT} formatter={(v: any) => [`${v} mg/dL`, 'Glucose']} />
                <ReferenceLine y={70}  stroke="rgba(240,96,96,.4)"  strokeDasharray="4 4" />
                <ReferenceLine y={140} stroke="rgba(240,172,60,.4)" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="value" stroke="var(--cyan)" strokeWidth={2}
                  dot={(p: any) => <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill={p.payload.color} />} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 155, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: 'var(--text3)' }}>
              No glucose readings — log from the Glucose tab
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, rgba(34,212,232,.1), transparent)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Estimated HbA1c</div>
            {hba1c != null ? (
              <>
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1,
                  color: hba1c < 5.7 ? '#2dd4a0' : hba1c < 6.5 ? '#f0ac3c' : '#f06060' }}>
                  {hba1c}%
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4,
                  color: hba1c < 5.7 ? '#2dd4a0' : hba1c < 6.5 ? '#f0ac3c' : '#f06060' }}>
                  {hba1c < 5.7 ? 'Normal range' : hba1c < 6.5 ? 'Prediabetes range' : 'Diabetes range'}
                </div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[['<5.7%', 'Normal', '#2dd4a0'], ['5.7–6.4%', 'Prediabetes', '#f0ac3c'], ['≥6.5%', 'Diabetes', '#f06060']].map(([r, l, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: 'var(--text3)' }}>{l}</span>
                      <span style={{ color: c, fontWeight: 600 }}>{r}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text3)', paddingTop: 4 }}>Log glucose to see estimate</p>
            )}
          </div>

          {latestGlucose && (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Latest Glucose</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: latestGlucose.color, letterSpacing: '-.02em' }}>
                {latestGlucose.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>mg/dL · {latestGlucose.label}</div>
            </div>
          )}
        </div>
      </div>

      {/* Weight + Goals */}
      <div className="grid-cols-2">
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Scale size={15} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Weight Log</span>
          </div>
          <form onSubmit={logWeight} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="number" step="0.1" min="30" max="300" className="inp"
              placeholder="Today's weight (kg)" value={weightInput}
              onChange={e => setWeightInput(e.target.value)} />
            <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px', flexShrink: 0, whiteSpace: 'nowrap' }}>
              Log
            </button>
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
            {[...weightEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(w => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 10, background: 'var(--bg)' }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{format(new Date(w.date), 'MMM dd, yyyy')}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{w.weight} kg</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Target size={15} style={{ color: '#2dd4a0' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Goals & Profile</span>
          </div>
          {profile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Current Weight', value: `${latestWeight?.weight || profile.currentWeight} kg` },
                { label: 'Target Weight',  value: `${profile.targetWeight} kg` },
                { label: 'To Lose',        value: `${Math.max(0, (latestWeight?.weight || profile.currentWeight) - profile.targetWeight).toFixed(1)} kg` },
                { label: 'BMI',            value: bmi ? String(bmi) : '—' },
                { label: 'TDEE',           value: `${tdee} kcal/day` },
                { label: 'Deficit Goal',   value: `${deficitGoal} kcal/day` },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--text2)' }}>{item.label}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Progress to target</div>
                {(() => {
                  const start = profile.currentWeight;
                  const current = latestWeight?.weight || profile.currentWeight;
                  const target = profile.targetWeight;
                  const pct = start > target ? Math.min(100, Math.round(((start - current) / (start - target)) * 100)) : 0;
                  return (
                    <>
                      <div className="progress">
                        <div className="progress-bar" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #2dd4a0, #4f8ef5)' }} />
                      </div>
                      <div style={{ fontSize: 12, color: '#2dd4a0', fontWeight: 600, marginTop: 5 }}>{pct}% achieved</div>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>Complete your profile to see goals.</p>
          )}
        </div>
      </div>

    </div>
  );
}
