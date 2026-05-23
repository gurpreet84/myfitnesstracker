import { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import type { FoodEntry, WorkoutEntry, WeightEntry, UserProfile } from '../types';
import { getDailySummary, predictWeightLoss, calculateBMI, getLast7Days } from '../utils/calculations';

interface Props {
  foodEntries: FoodEntry[];
  workoutEntries: WorkoutEntry[];
  weightEntries: WeightEntry[];
  profile: UserProfile | null;
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#8b949e' },
  itemStyle: { color: '#e6edf3' },
};

function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: '#3b82f6' };
  if (bmi < 25) return { label: 'Normal', color: '#22c55e' };
  if (bmi < 30) return { label: 'Overweight', color: '#f59e0b' };
  return { label: 'Obese', color: '#ef4444' };
}

export default function WeightPrediction({ foodEntries, workoutEntries, weightEntries, profile }: Props) {
  const last7 = getLast7Days().map(d => getDailySummary(d, foodEntries, workoutEntries, weightEntries, profile));
  const avg7Deficit = last7.reduce((s, d) => s + d.calorieDeficit, 0) / 7;

  const latestWeight = weightEntries.sort((a, b) => b.date.localeCompare(a.date))[0];
  const currentWeight = latestWeight?.weight || profile?.currentWeight || 80;
  const targetWeight = profile?.targetWeight || currentWeight - 10;

  const effectiveDeficit = Math.max(0, avg7Deficit);

  const predictions = useMemo(() =>
    predictWeightLoss(currentWeight, targetWeight, effectiveDeficit, 730),
    [currentWeight, targetWeight, effectiveDeficit]
  );

  // Actual weight history for overlay
  const actualWeights = weightEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => ({
      date: w.date,
      actual: w.weight,
    }));

  // Merge predictions with actuals by date
  const allDates = new Set([
    ...predictions.map(p => p.date),
    ...actualWeights.map(w => w.date),
  ]);

  const mergedData = Array.from(allDates).sort().map(date => {
    const pred = predictions.find(p => p.date === date);
    const actual = actualWeights.find(w => w.date === date);
    return {
      date: format(new Date(date), 'MMM dd'),
      predicted: pred?.predicted ?? null,
      optimistic: pred?.optimistic ?? null,
      conservative: pred?.conservative ?? null,
      actual: actual?.actual ?? null,
    };
  });

  // ETA calculation
  const etaEntry = predictions.find(p => p.predicted <= targetWeight);
  const etaDays = etaEntry ? differenceInDays(new Date(etaEntry.date), new Date()) : null;

  // Weekly weight loss estimate
  const weeklyLoss = (effectiveDeficit * 7) / 7700;

  // BMI
  const bmi = profile ? calculateBMI(currentWeight, profile.height) : null;
  const bmiTarget = profile ? calculateBMI(targetWeight, profile.height) : null;
  const bmiCat = bmi ? getBMICategory(bmi) : null;
  const bmiTargetCat = bmiTarget ? getBMICategory(bmiTarget) : null;

  // Scenario table
  const scenarios = [
    { label: 'Conservative (85%)', deficit: effectiveDeficit * 0.85, color: '#f59e0b' },
    { label: 'Expected (100%)', deficit: effectiveDeficit, color: '#22c55e' },
    { label: 'Optimistic (115%)', deficit: effectiveDeficit * 1.15, color: '#3b82f6' },
  ].map(s => {
    const kgPerWeek = (s.deficit * 7) / 7700;
    const weeksToGoal = kgPerWeek > 0 ? (currentWeight - targetWeight) / kgPerWeek : Infinity;
    const months = weeksToGoal / 4.3;
    return { ...s, kgPerWeek: kgPerWeek.toFixed(2), months: months.toFixed(1), weeks: Math.round(weeksToGoal) };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary cards */}
      <div className="grid-cols-4">
        {[
          { label: 'Current Weight', value: `${currentWeight} kg`, sub: bmiCat ? `BMI: ${bmi} (${bmiCat.label})` : '—', color: bmiCat?.color || '#94a3b8' },
          { label: 'Target Weight', value: `${targetWeight} kg`, sub: bmiTargetCat ? `BMI: ${bmiTarget} (${bmiTargetCat.label})` : '—', color: bmiTargetCat?.color || '#22c55e' },
          { label: 'Avg Daily Deficit', value: `${Math.round(effectiveDeficit)} kcal`, sub: `Last 7 days avg`, color: effectiveDeficit >= 300 ? '#22c55e' : '#f59e0b' },
          {
            label: 'Est. Time to Goal',
            value: etaDays !== null ? (etaDays < 365 ? `~${Math.ceil(etaDays / 30)} months` : `~${(etaDays / 365).toFixed(1)} years`) : 'Set deficit',
            sub: etaDays ? `≈ ${etaDays} days` : effectiveDeficit <= 0 ? 'No deficit yet' : 'Already at goal',
            color: '#0ea5e9',
          },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color, letterSpacing: '-.02em' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Main prediction chart */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 2 }}>Predictive Weight Loss Chart</div>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
          Based on your 7-day average deficit of <span style={{ color: 'var(--green)' }}>{Math.round(effectiveDeficit)} kcal/day</span>.
          Shaded band = optimistic/conservative range. Green line = your actual logged weight.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={mergedData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(mergedData.length / 8)}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `${v}kg`}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(v, name) => [`${v} kg`, name as string]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text2)', paddingTop: 10 }} />
            {targetWeight && (
              <ReferenceLine
                y={targetWeight}
                stroke="#22c55e"
                strokeDasharray="6 3"
                label={{ value: `Target: ${targetWeight}kg`, fill: '#22c55e', fontSize: 10, position: 'insideTopRight' }}
              />
            )}
            {/* Band lines */}
            <Line
              type="monotone"
              dataKey="optimistic"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4 2"
              dot={false}
              name="Optimistic"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="conservative"
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="4 2"
              dot={false}
              name="Conservative"
              connectNulls
            />
            {/* Main prediction */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#e879f9"
              strokeWidth={2.5}
              dot={false}
              name="Predicted"
              connectNulls
            />
            {/* Actual */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={{ fill: '#22c55e', r: 4, strokeWidth: 0 }}
              name="Actual"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario comparison table */}
      <div className="card">
        <div className="section-title">Scenario Comparison</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Scenario', 'Daily Deficit', 'Loss/Week', 'Weeks to Goal', 'Months to Goal'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenarios.map(s => (
                <tr key={s.label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: s.color }}>{s.label}</td>
                  <td style={{ padding: '12px', color: 'var(--text2)' }}>{Math.round(s.deficit)} kcal</td>
                  <td style={{ padding: '12px', color: 'var(--text2)' }}>{s.kgPerWeek} kg</td>
                  <td style={{ padding: '12px', color: 'var(--text2)' }}>{s.weeks === Infinity ? '∞' : s.weeks}</td>
                  <td style={{ padding: '12px', color: 'var(--text2)' }}>{s.months === 'Infinity' ? '∞' : s.months}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BMI gauge */}
      <div className="card">
        <div className="section-title">BMI Overview</div>
        <div className="grid-cols-2">
          {[
            { label: 'Current BMI', bmi, cat: bmiCat },
            { label: 'Target BMI', bmi: bmiTarget, cat: bmiTargetCat },
          ].map(item => item.bmi && (
            <div key={item.label}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{item.label}</div>
              <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 4, letterSpacing: '-.03em', color: item.cat?.color }}>{item.bmi}</div>
              <div style={{ fontSize: 14, color: item.cat?.color }}>{item.cat?.label}</div>
              {/* BMI scale bar */}
              <div style={{ marginTop: 12, position: 'relative', height: 16, borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                {[
                  { label: 'Under', max: 18.5, color: '#3b82f6', from: 10 },
                  { label: 'Normal', max: 25, color: '#22c55e', from: 18.5 },
                  { label: 'Over', max: 30, color: '#f59e0b', from: 25 },
                  { label: 'Obese', max: 40, color: '#ef4444', from: 30 },
                ].map(seg => (
                  <div key={seg.label} style={{ flex: 1, position: 'relative', background: seg.color + '40' }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: seg.color, fontSize: 9 }}>
                      {seg.label}
                    </div>
                  </div>
                ))}
              </div>
              {/* Indicator */}
              <div style={{ position: 'relative', marginTop: 4, height: 4 }}>
                <div
                  style={{
                    position: 'absolute', width: 8, height: 8, borderRadius: '50%', marginTop: -2,
                    transform: 'translateX(-50%)',
                    left: `${Math.min(95, Math.max(5, ((item.bmi - 10) / 30) * 100))}%`,
                    background: item.cat?.color,
                    top: 0,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivation insight */}
      <div className="card">
        <div className="section-title">💡 Insights</div>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--text2)', paddingLeft: 0, listStyle: 'none' }}>
          {effectiveDeficit < 100 && (
            <li style={{ color: 'var(--amber)' }}>⚠ Your average daily deficit is very low. Try increasing activity or reducing calorie intake to reach your goal faster.</li>
          )}
          {effectiveDeficit >= 100 && effectiveDeficit < 300 && (
            <li style={{ color: 'var(--blue)' }}>ℹ A modest deficit detected. Sustainable progress, but consider increasing to 500 kcal/day for faster results.</li>
          )}
          {effectiveDeficit >= 300 && effectiveDeficit <= 750 && (
            <li style={{ color: 'var(--green)' }}>✓ Your deficit is in the healthy range (300–750 kcal). This promotes steady weight loss without muscle loss.</li>
          )}
          {effectiveDeficit > 750 && (
            <li style={{ color: 'var(--red)' }}>⚠ Very high deficit detected ({'>'} 750 kcal/day). Ensure you're getting adequate nutrition and consult a doctor.</li>
          )}
          {weeklyLoss > 0 && (
            <li>📉 At current pace, you're losing ~<span style={{ color: 'var(--purple)' }}>{weeklyLoss.toFixed(2)} kg/week</span> ({(weeklyLoss * 4.3).toFixed(1)} kg/month).</li>
          )}
          {profile && currentWeight > profile.targetWeight && etaDays && (
            <li>🎯 You're projected to reach your goal weight of <span style={{ color: 'var(--cyan)' }}>{targetWeight} kg</span> in approximately <span style={{ color: 'var(--cyan)' }}>{Math.ceil(etaDays / 30)} months</span>.</li>
          )}
          <li>🔥 1 kg of fat = 7,700 kcal. Every 7,700 kcal deficit = 1 kg lost.</li>
        </ul>
      </div>
    </div>
  );
}
