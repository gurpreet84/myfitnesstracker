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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary row */}
      <div className="grid-cols-3">
        {[
          {
            label: "Today's Readings",
            value: todayEntries.length,
            unit: 'readings',
            color: 'var(--blue)',
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
            color: hba1c == null ? '#64748b' : hba1c < 5.7 ? 'var(--green)' : hba1c < 6.5 ? 'var(--amber)' : 'var(--red)',
          },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: 16, borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Log button */}
      <div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus size={16} /> Log Glucose
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-title">
            <Droplets size={16} style={{ color: 'var(--blue)' }} /> Add Glucose Reading
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid-cols-2">
              <div>
                <label className="label">Glucose (mg/dL) *</label>
                <input required type="number" min="20" max="600" className="inp"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="e.g. 95"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Time</label>
                <input type="time" className="inp"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Context</label>
              <div className="grid-cols-3">
                {(Object.entries(CONTEXT_LABELS) as [GlucoseEntry['context'], string][]).map(([val, label]) => (
                  <button
                    key={val} type="button"
                    onClick={() => setContext(val)}
                    style={{
                      padding: '7px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                      background: context === val ? CONTEXT_COLORS[val] + '33' : 'var(--card2)',
                      border: `1px solid ${context === val ? CONTEXT_COLORS[val] : 'var(--border)'}`,
                      color: context === val ? CONTEXT_COLORS[val] : 'var(--text2)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <input className="inp"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. after lunch, felt dizzy"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="submit" className="btn btn-primary">Save Reading</button>
              <button type="button" className="btn btn-ghost"
                onClick={() => { setShowForm(false); setValue(''); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 60-reading chart */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="section-title">
            <Droplets size={16} style={{ color: 'var(--blue)' }} /> Glucose History
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#8b949e' }}
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
          <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'flex-end' }}>
            {[['#22c55e', 'Normal'], ['#f59e0b', 'Elevated'], ['#ef4444', 'High/Low']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text3)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's readings list */}
      {todayEntries.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderLeft: '3px solid var(--blue)' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>Today's Readings</span>
          </div>
          {todayEntries.map(entry => {
            const status = getGlucoseStatus(entry.value, entry.context);
            return (
              <div key={entry.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: status.color + '22' }}>
                  <Droplets size={16} style={{ color: status.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: status.color }}>{entry.value}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>mg/dL</span>
                    <span className="tag" style={{ background: status.color + '22', color: status.color }}>
                      {status.label}
                    </span>
                    <span className="tag" style={{ background: 'var(--card2)', color: 'var(--text2)' }}>
                      {CONTEXT_LABELS[entry.context]}
                    </span>
                  </div>
                  {entry.notes && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{entry.notes}</div>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{entry.time}</span>
                <button type="button" onClick={() => { deleteGlucoseEntry(entry.id); onUpdate(); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <div className="empty-state">
          <Droplets size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>No glucose readings yet.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Click "Log Glucose" to start tracking.</p>
        </div>
      )}
    </div>
  );
}
