import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Dumbbell, Timer, Flame, Footprints } from 'lucide-react';
import type { WorkoutEntry, WorkoutType } from '../types';
import { saveWorkoutEntry, deleteWorkoutEntry, generateId } from '../utils/storage';
import { estimateCaloriesBurned } from '../utils/calculations';

interface Props {
  entries: WorkoutEntry[];
  onUpdate: () => void;
  selectedDate: string;
  userWeight: number;
}

const WORKOUT_ICONS: Record<WorkoutType, string> = {
  running: '🏃',
  walking: '🚶',
  cycling: '🚴',
  swimming: '🏊',
  weight_training: '🏋️',
  yoga: '🧘',
  hiit: '⚡',
  other: '💪',
};

const WORKOUT_COLORS: Record<WorkoutType, string> = {
  running: '#ef4444',
  walking: '#22c55e',
  cycling: '#f59e0b',
  swimming: '#3b82f6',
  weight_training: '#8b5cf6',
  yoga: '#ec4899',
  hiit: '#f97316',
  other: '#64748b',
};

const emptyForm = {
  type: 'walking' as WorkoutType,
  name: '',
  duration: '',
  caloriesBurned: '',
  distance: '',
  steps: '',
  intensity: 'moderate' as WorkoutEntry['intensity'],
  notes: '',
  time: format(new Date(), 'HH:mm'),
  autoCalc: true,
};

export default function WorkoutTracker({ entries, onUpdate, selectedDate, userWeight }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const dayEntries = entries
    .filter(e => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const totalMins = dayEntries.reduce((s, e) => s + e.duration, 0);
  const totalBurned = dayEntries.reduce((s, e) => s + e.caloriesBurned, 0);
  const totalSteps = dayEntries.reduce((s, e) => s + (e.steps || 0), 0);
  const totalDist = dayEntries.reduce((s, e) => s + (e.distance || 0), 0);

  function handleTypeChange(type: WorkoutType) {
    const label = type.replace('_', ' ');
    const estimated = form.autoCalc && form.duration
      ? String(estimateCaloriesBurned(type, Number(form.duration), userWeight, form.intensity))
      : form.caloriesBurned;
    setForm(f => ({
      ...f,
      type,
      name: label.charAt(0).toUpperCase() + label.slice(1),
      caloriesBurned: estimated,
    }));
  }

  function handleDurationChange(val: string) {
    const dur = Number(val);
    const estimated = form.autoCalc && dur > 0
      ? String(estimateCaloriesBurned(form.type, dur, userWeight, form.intensity))
      : form.caloriesBurned;
    setForm(f => ({ ...f, duration: val, caloriesBurned: estimated }));
  }

  function handleIntensityChange(intensity: WorkoutEntry['intensity']) {
    const estimated = form.autoCalc && form.duration
      ? String(estimateCaloriesBurned(form.type, Number(form.duration), userWeight, intensity))
      : form.caloriesBurned;
    setForm(f => ({ ...f, intensity, caloriesBurned: estimated }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entry: WorkoutEntry = {
      id: generateId(),
      date: selectedDate,
      time: form.time,
      type: form.type,
      name: form.name || form.type.replace('_', ' '),
      duration: Number(form.duration),
      caloriesBurned: Number(form.caloriesBurned),
      distance: form.distance ? Number(form.distance) : undefined,
      steps: form.steps ? Number(form.steps) : undefined,
      intensity: form.intensity,
      notes: form.notes || undefined,
    };
    saveWorkoutEntry(entry);
    onUpdate();
    setForm(emptyForm);
    setShowForm(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Day summary */}
      <div className="grid-cols-4">
        {[
          { label: 'Duration', value: totalMins, unit: 'min', icon: <Timer size={16} />, color: 'var(--blue)' },
          { label: 'Burned', value: totalBurned, unit: 'kcal', icon: <Flame size={16} />, color: 'var(--red)' },
          { label: 'Steps', value: totalSteps.toLocaleString(), unit: 'steps', icon: <Footprints size={16} />, color: 'var(--green)' },
          { label: 'Distance', value: totalDist.toFixed(1), unit: 'km', icon: <Dumbbell size={16} />, color: 'var(--amber)' },
        ].map(m => (
          <div key={m.label} className="card" style={{ padding: 16, borderLeft: `3px solid ${m.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
              <span style={{ color: m.color, display: 'flex' }}>{m.icon}</span> {m.label}
            </div>
            <div className="stat-value" style={{ color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{m.unit}</div>
          </div>
        ))}
      </div>

      <div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn"
          style={{ background: 'var(--purple)', color: '#fff' }}>
          <Plus size={16} /> Log Workout
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-title">
            <Dumbbell size={16} style={{ color: 'var(--purple)' }} /> Add Workout
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Workout type grid */}
            <div>
              <label className="label">Activity Type</label>
              <div className="grid-cols-4">
                {(Object.keys(WORKOUT_ICONS) as WorkoutType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    style={{
                      borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all .15s',
                      background: form.type === t ? WORKOUT_COLORS[t] + '33' : 'var(--card2)',
                      border: `1px solid ${form.type === t ? WORKOUT_COLORS[t] : 'var(--border)'}`,
                      color: form.type === t ? WORKOUT_COLORS[t] : 'var(--text2)',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{WORKOUT_ICONS[t]}</span>
                    <span style={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-cols-2">
              <div>
                <label className="label">Workout Name</label>
                <input className="inp"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Morning Run"
                />
              </div>
              <div>
                <label className="label">Time</label>
                <input type="time" className="inp"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>

            {/* Intensity */}
            <div>
              <label className="label">Intensity</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['low', 'moderate', 'high'] as const).map(lvl => {
                  const c = lvl === 'low' ? 'var(--green)' : lvl === 'moderate' ? 'var(--amber)' : 'var(--red)';
                  const active = form.intensity === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleIntensityChange(lvl)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        textTransform: 'capitalize', cursor: 'pointer', transition: 'all .15s',
                        background: active ? (lvl === 'low' ? '#22c55e33' : lvl === 'moderate' ? '#f59e0b33' : '#ef444433') : 'var(--card2)',
                        border: `1px solid ${active ? c : 'var(--border)'}`,
                        color: active ? c : 'var(--text2)',
                      }}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid-cols-3">
              <div>
                <label className="label">Duration (min) *</label>
                <input required type="number" min="1" className="inp"
                  value={form.duration}
                  onChange={e => handleDurationChange(e.target.value)}
                />
              </div>
              <div>
                <label className="label">
                  Calories Burned
                  <button
                    type="button"
                    style={{ marginLeft: 8, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
                    onClick={() => setForm(f => ({ ...f, autoCalc: !f.autoCalc }))}
                  >
                    ({form.autoCalc ? 'auto' : 'manual'})
                  </button>
                </label>
                <input type="number" min="0" className="inp"
                  value={form.caloriesBurned}
                  onChange={e => setForm(f => ({ ...f, caloriesBurned: e.target.value, autoCalc: false }))}
                />
              </div>
              <div>
                <label className="label">Distance (km)</label>
                <input type="number" min="0" step="0.1" className="inp"
                  value={form.distance}
                  onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid-cols-2">
              <div>
                <label className="label">Steps</label>
                <input type="number" min="0" className="inp"
                  value={form.steps}
                  onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="inp"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="How did it feel?"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="submit" className="btn" style={{ background: 'var(--purple)', color: '#fff' }}>
                Save Workout
              </button>
              <button type="button" className="btn btn-ghost"
                onClick={() => { setShowForm(false); setForm(emptyForm); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workout list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {dayEntries.map(entry => (
          <div key={entry.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 30 }}>{WORKOUT_ICONS[entry.type]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{entry.name}</span>
                <span className="tag" style={{ textTransform: 'capitalize', background: WORKOUT_COLORS[entry.type] + '22', color: WORKOUT_COLORS[entry.type] }}>
                  {entry.intensity}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--text3)', flexWrap: 'wrap' }}>
                <span><Timer size={10} style={{ display: 'inline', marginRight: 4 }} />{entry.duration} min</span>
                <span><Flame size={10} style={{ display: 'inline', marginRight: 4 }} />{entry.caloriesBurned} kcal</span>
                {entry.distance && <span>📍 {entry.distance} km</span>}
                {entry.steps && <span><Footprints size={10} style={{ display: 'inline', marginRight: 4 }} />{entry.steps.toLocaleString()} steps</span>}
              </div>
              {entry.notes && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>"{entry.notes}"</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{entry.time}</div>
              <button type="button" onClick={() => { deleteWorkoutEntry(entry.id); onUpdate(); }}
                style={{ marginTop: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', marginLeft: 'auto' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {dayEntries.length === 0 && !showForm && (
          <div className="empty-state">
            <Dumbbell size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No workouts logged for this day.</p>
          </div>
        )}
      </div>
    </div>
  );
}
