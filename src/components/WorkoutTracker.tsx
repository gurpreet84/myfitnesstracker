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
    <div className="space-y-4">
      {/* Day summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Duration', value: totalMins, unit: 'min', icon: <Timer size={16} />, color: '#3b82f6' },
          { label: 'Burned', value: totalBurned, unit: 'kcal', icon: <Flame size={16} />, color: '#ef4444' },
          { label: 'Steps', value: totalSteps.toLocaleString(), unit: 'steps', icon: <Footprints size={16} />, color: '#22c55e' },
          { label: 'Distance', value: totalDist.toFixed(1), unit: 'km', icon: <Dumbbell size={16} />, color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ background: '#1e293b', borderLeft: `3px solid ${m.color}` }}>
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
              <span style={{ color: m.color }}>{m.icon}</span> {m.label}
            </div>
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
            <div className="text-xs text-slate-500">{m.unit}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
        style={{ background: '#7c3aed', color: '#fff' }}
      >
        <Plus size={16} /> Log Workout
      </button>

      {showForm && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: '#1e293b' }}>
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Dumbbell size={18} className="text-purple-400" /> Add Workout
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Workout type grid */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Activity Type</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(WORKOUT_ICONS) as WorkoutType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className="rounded-lg py-2 px-2 text-xs font-medium flex flex-col items-center gap-1 transition-all"
                    style={{
                      background: form.type === t ? WORKOUT_COLORS[t] + '33' : '#0f172a',
                      border: `1px solid ${form.type === t ? WORKOUT_COLORS[t] : '#334155'}`,
                      color: form.type === t ? WORKOUT_COLORS[t] : '#94a3b8',
                    }}
                  >
                    <span>{WORKOUT_ICONS[t]}</span>
                    <span className="capitalize">{t.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Workout Name</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Morning Run"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Time</label>
                <input
                  type="time"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>

            {/* Intensity */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Intensity</label>
              <div className="flex gap-2">
                {(['low', 'moderate', 'high'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleIntensityChange(lvl)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: form.intensity === lvl
                        ? lvl === 'low' ? '#22c55e33' : lvl === 'moderate' ? '#f59e0b33' : '#ef444433'
                        : '#0f172a',
                      border: `1px solid ${form.intensity === lvl
                        ? lvl === 'low' ? '#22c55e' : lvl === 'moderate' ? '#f59e0b' : '#ef4444'
                        : '#334155'}`,
                      color: form.intensity === lvl
                        ? lvl === 'low' ? '#22c55e' : lvl === 'moderate' ? '#f59e0b' : '#ef4444'
                        : '#94a3b8',
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Duration (min) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.duration}
                  onChange={e => handleDurationChange(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Calories Burned
                  <button
                    type="button"
                    className="ml-2 text-blue-400"
                    onClick={() => setForm(f => ({ ...f, autoCalc: !f.autoCalc }))}
                  >
                    ({form.autoCalc ? 'auto' : 'manual'})
                  </button>
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.caloriesBurned}
                  onChange={e => setForm(f => ({ ...f, caloriesBurned: e.target.value, autoCalc: false }))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Distance (km)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.distance}
                  onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Steps</label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.steps}
                  onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notes</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="How did it feel?"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: '#7c3aed', color: '#fff' }}>
                Save Workout
              </button>
              <button type="button" className="px-5 py-2 rounded-lg text-sm font-medium" style={{ background: '#334155', color: '#cbd5e1' }}
                onClick={() => { setShowForm(false); setForm(emptyForm); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workout list */}
      <div className="space-y-3">
        {dayEntries.map(entry => (
          <div key={entry.id} className="rounded-xl p-4 flex items-center gap-4" style={{ background: '#1e293b' }}>
            <div className="text-3xl">{WORKOUT_ICONS[entry.type]}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{entry.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: WORKOUT_COLORS[entry.type] + '22', color: WORKOUT_COLORS[entry.type] }}>
                  {entry.intensity}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span><Timer size={10} className="inline mr-1" />{entry.duration} min</span>
                <span><Flame size={10} className="inline mr-1" />{entry.caloriesBurned} kcal</span>
                {entry.distance && <span>📍 {entry.distance} km</span>}
                {entry.steps && <span><Footprints size={10} className="inline mr-1" />{entry.steps.toLocaleString()} steps</span>}
              </div>
              {entry.notes && <p className="text-xs text-slate-600 mt-1 italic">"{entry.notes}"</p>}
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-600">{entry.time}</div>
              <button onClick={() => { deleteWorkoutEntry(entry.id); onUpdate(); }} className="mt-2 text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {dayEntries.length === 0 && !showForm && (
          <div className="text-center py-12 text-slate-500">
            <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No workouts logged for this day.</p>
          </div>
        )}
      </div>
    </div>
  );
}
