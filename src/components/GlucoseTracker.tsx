import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Droplets } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { GlucoseEntry } from '../types';
import { saveGlucoseEntry, deleteGlucoseEntry, generateId } from '../utils/storage';

interface Props {
  entries: GlucoseEntry[];
  onUpdate: () => void;
  selectedDate: string;
}

const CONTEXT_LABELS: Record<GlucoseEntry['context'], string> = {
  fasting:     'Fasting',
  before_meal: 'Before Meal',
  after_meal:  'After Meal',
  bedtime:     'Bedtime',
  random:      'Random',
};

const CONTEXT_COLORS: Record<GlucoseEntry['context'], string> = {
  fasting:     '#3b82f6',
  before_meal: '#8b5cf6',
  after_meal:  '#f59e0b',
  bedtime:     '#64748b',
  random:      '#22c55e',
};

export function getGlucoseStatus(value: number, context: GlucoseEntry['context']) {
  if (value < 70) return { label: 'Low', color: '#ef4444' };
  if (context === 'fasting' || context === 'before_meal') {
    if (value <= 99)  return { label: 'Normal', color: '#22c55e' };
    if (value <= 125) return { label: 'Elevated', color: '#f59e0b' };
    return { label: 'High', color: '#ef4444' };
  }
  if (context === 'after_meal') {
    if (value <= 139) return { label: 'Normal', color: '#22c55e' };
    if (value <= 199) return { label: 'Elevated', color: '#f59e0b' };
    return { label: 'High', color: '#ef4444' };
  }
  if (value <= 139) return { label: 'Normal', color: '#22c55e' };
  if (value <= 199) return { label: 'Elevated', color: '#f59e0b' };
  return { label: 'High', color: '#ef4444' };
}

// Nathan equation: HbA1c = (avgGlucose + 46.7) / 28.7
export function estimateHbA1c(entries: GlucoseEntry[]): number | null {
  if (entries.length === 0) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const recent = entries.filter(e => new Date(e.date) >= cutoff);
  const pool = recent.length >= 5 ? recent : entries;
  const avg = pool.reduce((s, e) => s + e.value, 0) / pool.length;
  return Math.round(((avg + 46.7) / 28.7) * 10) / 10;
}

export default function GlucoseTracker({ entries, onUpdate, selectedDate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [value, setValue] = useState('');
  const [context, setContext] = useState<GlucoseEntry['context']>('fasting');
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));

  const todayEntries = entries
    .filter(e => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Last 14 days chart data — one point per reading
  const chartData = [...entries]
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(-60)
    .map(e => ({
      label: `${format(new Date(e.date), 'MMM dd')} ${e.time}`,
      value: e.value,
      context: e.context,
      color: getGlucoseStatus(e.value, e.context).color,
    }));

  const hba1c = estimateHbA1c(entries);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    saveGlucoseEntry({
      id: generateId(),
      date: selectedDate,
      time,
      value: Number(value),
      context,
      notes: notes.trim() || undefined,
    });
    onUpdate();
    setValue('');
    setNotes('');
    setShowForm(false);
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    return <circle cx={cx} cy={cy} r={4} fill={payload.color} stroke="none" />;
  };

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Today's Readings",
            value: todayEntries.length,
            unit: 'readings',
            color: '#3b82f6',
          },
          {
            label: 'Last Reading',
            value: todayEntries.length
              ? todayEntries[todayEntries.length - 1].value
              : entries.length
                ? [...entries].sort((a,b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))[0].value
                : '—',
            unit: 'mg/dL',
            color: todayEntries.length
              ? getGlucoseStatus(todayEntries[todayEntries.length - 1].value, todayEntries[todayEntries.length - 1].context).color
              : '#64748b',
          },
          {
            label: 'Est. HbA1c',
            value: hba1c ?? '—',
            unit: hba1c ? '%' : '',
            color: hba1c == null ? '#64748b' : hba1c < 5.7 ? '#22c55e' : hba1c < 6.5 ? '#f59e0b' : '#ef4444',
          },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#1e293b', borderLeft: `3px solid ${s.color}` }}>
            <div className="text-xs text-slate-400 mb-1">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Log button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: '#2563eb', color: '#fff' }}
      >
        <Plus size={16} /> Log Glucose
      </button>

      {/* Log form */}
      {showForm && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: '#1e293b' }}>
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Droplets size={18} className="text-blue-400" /> Add Glucose Reading
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Glucose (mg/dL) *</label>
                <input
                  required type="number" min="20" max="600"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="e.g. 95"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Time</label>
                <input
                  type="time"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-2 block">Context</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(CONTEXT_LABELS) as [GlucoseEntry['context'], string][]).map(([val, label]) => (
                  <button
                    key={val} type="button"
                    onClick={() => setContext(val)}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: context === val ? CONTEXT_COLORS[val] + '33' : '#0f172a',
                      border: `1px solid ${context === val ? CONTEXT_COLORS[val] : '#334155'}`,
                      color: context === val ? CONTEXT_COLORS[val] : '#94a3b8',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                style={{ background: '#0f172a', border: '1px solid #334155' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. after lunch, felt dizzy"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: '#2563eb', color: '#fff' }}>
                Save Reading
              </button>
              <button type="button" className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: '#334155', color: '#cbd5e1' }}
                onClick={() => { setShowForm(false); setValue(''); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 60-reading chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: '#1e293b' }}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Droplets size={16} className="text-blue-400" /> Glucose History
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: any, _: any, p: any) => [`${v} mg/dL — ${CONTEXT_LABELS[p.payload.context as GlucoseEntry['context']]}`, 'Glucose']}
              />
              <ReferenceLine y={70}  stroke="#ef4444" strokeDasharray="4 4" label={{ value: '70', fill: '#ef4444', fontSize: 10 }} />
              <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '100', fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '140', fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '200', fill: '#ef4444', fontSize: 10 }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2}
                dot={<CustomDot />} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-end">
            {[['#22c55e', 'Normal'], ['#f59e0b', 'Elevated'], ['#ef4444', 'High/Low']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1 text-xs text-slate-500">
                <div className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's readings list */}
      {todayEntries.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: '#1e293b' }}>
          <div className="px-4 py-3" style={{ borderLeft: '3px solid #3b82f6' }}>
            <h4 className="font-semibold text-sm text-blue-400">Today's Readings</h4>
          </div>
          {todayEntries.map(entry => {
            const status = getGlucoseStatus(entry.value, entry.context);
            return (
              <div key={entry.id} className="px-4 py-3 flex items-center gap-3" style={{ borderTop: '1px solid #0f172a' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: status.color + '22' }}>
                  <Droplets size={16} style={{ color: status.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold" style={{ color: status.color }}>{entry.value}</span>
                    <span className="text-xs text-slate-500">mg/dL</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: status.color + '22', color: status.color }}>
                      {status.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#334155', color: '#94a3b8' }}>
                      {CONTEXT_LABELS[entry.context]}
                    </span>
                  </div>
                  {entry.notes && <div className="text-xs text-slate-500 mt-0.5">{entry.notes}</div>}
                </div>
                <span className="text-xs text-slate-600">{entry.time}</span>
                <button onClick={() => { deleteGlucoseEntry(entry.id); onUpdate(); }}
                  className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-500">
          <Droplets size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No glucose readings yet.</p>
          <p className="text-xs mt-1">Click "Log Glucose" to start tracking.</p>
        </div>
      )}
    </div>
  );
}
