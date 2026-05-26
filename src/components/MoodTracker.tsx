import { useState } from 'react';
import { format } from 'date-fns';
import { Smile, Zap, Trash2 } from 'lucide-react';
import type { MoodEntry } from '../types';
import { saveMoodEntry, deleteMoodEntry, generateId } from '../utils/storage';

interface Props {
  entries: MoodEntry[];
  onUpdate: () => void;
  selectedDate: string;
}

const MOOD_OPTIONS: { value: MoodEntry['mood']; emoji: string; label: string; color: string }[] = [
  { value: 1, emoji: '😞', label: 'Rough',   color: '#ef4444' },
  { value: 2, emoji: '😕', label: 'Low',     color: '#f97316' },
  { value: 3, emoji: '😐', label: 'Okay',    color: '#f59e0b' },
  { value: 4, emoji: '😊', label: 'Good',    color: '#22c55e' },
  { value: 5, emoji: '😄', label: 'Amazing', color: '#2563eb' },
];

const ENERGY_OPTIONS: { value: MoodEntry['energy']; emoji: string; label: string; color: string }[] = [
  { value: 1, emoji: '🪫', label: 'Drained',  color: '#ef4444' },
  { value: 2, emoji: '😴', label: 'Low',      color: '#f97316' },
  { value: 3, emoji: '⚡', label: 'Moderate', color: '#f59e0b' },
  { value: 4, emoji: '🔋', label: 'High',     color: '#22c55e' },
  { value: 5, emoji: '🚀', label: 'Charged',  color: '#2563eb' },
];

function avgColor(values: number[], options: { value: number; color: string }[]): string {
  if (!values.length) return 'var(--text3)';
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const idx = Math.max(0, Math.min(4, Math.round(avg) - 1));
  return options[idx]?.color ?? 'var(--text3)';
}

export default function MoodTracker({ entries, onUpdate, selectedDate }: Props) {
  const [mood,   setMood]   = useState<MoodEntry['mood'] | null>(null);
  const [energy, setEnergy] = useState<MoodEntry['energy'] | null>(null);
  const [notes,  setNotes]  = useState('');

  const dayEntries = entries
    .filter(e => e.date === selectedDate)
    .sort((a, b) => b.time.localeCompare(a.time));

  function submit() {
    if (!mood || !energy) return;
    saveMoodEntry({ id: generateId(), date: selectedDate, time: format(new Date(), 'HH:mm'), mood, energy, notes: notes.trim() || undefined });
    onUpdate();
    setMood(null); setEnergy(null); setNotes('');
  }

  const avgMood   = dayEntries.map(e => e.mood);
  const avgEnergy = dayEntries.map(e => e.energy);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary */}
      {dayEntries.length > 0 && (
        <div className="grid-cols-2">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>
              {MOOD_OPTIONS[Math.round(avgMood.reduce((s, v) => s + v, 0) / avgMood.length) - 1]?.emoji}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Avg Mood</div>
            <div className="stat-value" style={{ fontSize: 18, color: avgColor(avgMood, MOOD_OPTIONS), marginTop: 4 }}>
              {(avgMood.reduce((s, v) => s + v, 0) / avgMood.length).toFixed(1)}/5
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>
              {ENERGY_OPTIONS[Math.round(avgEnergy.reduce((s, v) => s + v, 0) / avgEnergy.length) - 1]?.emoji}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>Avg Energy</div>
            <div className="stat-value" style={{ fontSize: 18, color: avgColor(avgEnergy, ENERGY_OPTIONS), marginTop: 4 }}>
              {(avgEnergy.reduce((s, v) => s + v, 0) / avgEnergy.length).toFixed(1)}/5
            </div>
          </div>
        </div>
      )}

      {/* Log form */}
      <div className="card">
        <div className="section-title"><Smile size={16} style={{ color: 'var(--amber)' }} /> Log Check-in</div>

        <div style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 10 }}>How are you feeling?</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MOOD_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setMood(o.value)}
                style={{
                  flex: 1, minWidth: 52, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${mood === o.value ? o.color : 'var(--border)'}`,
                  background: mood === o.value ? `${o.color}22` : 'var(--card2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{o.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: mood === o.value ? o.color : 'var(--text3)' }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 10 }}><Zap size={12} style={{ display: 'inline', marginRight: 4 }} />Energy level?</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ENERGY_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setEnergy(o.value)}
                style={{
                  flex: 1, minWidth: 52, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${energy === o.value ? o.color : 'var(--border)'}`,
                  background: energy === o.value ? `${o.color}22` : 'var(--card2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{o.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: energy === o.value ? o.color : 'var(--text3)' }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Notes (optional)</label>
          <input className="inp" placeholder="What's on your mind?" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <button onClick={submit} disabled={!mood || !energy} className="btn btn-primary" style={{ width: '100%' }}>
          Log Check-in
        </button>
      </div>

      {/* History */}
      {dayEntries.length > 0 && (
        <div className="card">
          <div className="section-title">Today's Check-ins</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayEntries.map(e => {
              const mOpt = MOOD_OPTIONS.find(o => o.value === e.mood)!;
              const eOpt = ENERGY_OPTIONS.find(o => o.value === e.energy)!;
              return (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--card2)', borderRadius: 10, padding: '10px 14px',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 20 }}>{mOpt.emoji}</span>
                  <span style={{ fontSize: 20 }}>{eOpt.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                      <span style={{ color: mOpt.color }}>{mOpt.label}</span>
                      <span style={{ color: 'var(--text3)', margin: '0 6px' }}>·</span>
                      <span style={{ color: eOpt.color }}>{eOpt.label} energy</span>
                    </div>
                    {e.notes && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{e.notes}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{e.time}</div>
                  </div>
                  <button onClick={() => { deleteMoodEntry(e.id); onUpdate(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dayEntries.length === 0 && (
        <div className="empty-state">
          <Smile size={32} style={{ margin: '0 auto 12px', color: 'var(--text3)', display: 'block' }} />
          No check-ins today — how are you feeling?
        </div>
      )}
    </div>
  );
}
