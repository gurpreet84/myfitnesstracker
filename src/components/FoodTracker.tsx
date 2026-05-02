import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Apple, Search } from 'lucide-react';
import type { FoodEntry } from '../types';
import { saveFoodEntry, deleteFoodEntry, generateId } from '../utils/storage';
import { getGlycemicCategory } from '../utils/calculations';

interface Props {
  entries: FoodEntry[];
  onUpdate: () => void;
  selectedDate: string;
}

const MEAL_COLORS = {
  breakfast: '#f59e0b',
  lunch: '#3b82f6',
  dinner: '#8b5cf6',
  snack: '#22c55e',
};

const COMMON_FOODS = [
  { name: 'White Rice (1 cup)', calories: 206, glycemicIndex: 73, glycemicLoad: 43, carbs: 45, protein: 4, fat: 0.4, servingSize: '1 cup (186g)' },
  { name: 'Brown Rice (1 cup)', calories: 216, glycemicIndex: 55, glycemicLoad: 18, carbs: 45, protein: 5, fat: 1.8, servingSize: '1 cup (202g)' },
  { name: 'Oatmeal (1 cup)', calories: 154, glycemicIndex: 55, glycemicLoad: 13, carbs: 27, protein: 5, fat: 3, servingSize: '1 cup (240ml)' },
  { name: 'Banana (medium)', calories: 105, glycemicIndex: 51, glycemicLoad: 13, carbs: 27, protein: 1.3, fat: 0.4, servingSize: '1 medium (118g)' },
  { name: 'Apple (medium)', calories: 95, glycemicIndex: 36, glycemicLoad: 5, carbs: 25, protein: 0.5, fat: 0.3, servingSize: '1 medium (182g)' },
  { name: 'Chicken Breast (100g)', calories: 165, glycemicIndex: 0, glycemicLoad: 0, carbs: 0, protein: 31, fat: 3.6, servingSize: '100g' },
  { name: 'Egg (1 large)', calories: 78, glycemicIndex: 0, glycemicLoad: 0, carbs: 0.6, protein: 6, fat: 5, servingSize: '1 large (50g)' },
  { name: 'Whole Wheat Bread (1 slice)', calories: 69, glycemicIndex: 71, glycemicLoad: 9, carbs: 12, protein: 4, fat: 1, servingSize: '1 slice (28g)' },
  { name: 'White Bread (1 slice)', calories: 79, glycemicIndex: 75, glycemicLoad: 10, carbs: 15, protein: 2.7, fat: 1, servingSize: '1 slice (30g)' },
  { name: 'Potato (baked)', calories: 161, glycemicIndex: 85, glycemicLoad: 26, carbs: 37, protein: 4.3, fat: 0.2, servingSize: '1 medium (173g)' },
  { name: 'Sweet Potato', calories: 103, glycemicIndex: 63, glycemicLoad: 11, carbs: 24, protein: 2.3, fat: 0.1, servingSize: '1 medium (130g)' },
  { name: 'Lentils (1 cup)', calories: 230, glycemicIndex: 32, glycemicLoad: 8, carbs: 40, protein: 18, fat: 0.8, servingSize: '1 cup (200g)' },
  { name: 'Greek Yogurt (100g)', calories: 59, glycemicIndex: 11, glycemicLoad: 1, carbs: 3.6, protein: 10, fat: 0.4, servingSize: '100g' },
  { name: 'Salmon (100g)', calories: 208, glycemicIndex: 0, glycemicLoad: 0, carbs: 0, protein: 20, fat: 13, servingSize: '100g' },
  { name: 'Pasta (1 cup cooked)', calories: 220, glycemicIndex: 49, glycemicLoad: 24, carbs: 43, protein: 8, fat: 1.3, servingSize: '1 cup (140g)' },
];

const emptyForm = {
  name: '',
  calories: '',
  glycemicIndex: '',
  glycemicLoad: '',
  carbs: '',
  protein: '',
  fat: '',
  servingSize: '',
  mealType: 'breakfast' as FoodEntry['mealType'],
  time: format(new Date(), 'HH:mm'),
};

export default function FoodTracker({ entries, onUpdate, selectedDate }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const dayEntries = entries
    .filter(e => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const filtered = COMMON_FOODS.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  function selectFood(food: typeof COMMON_FOODS[0]) {
    setForm(f => ({
      ...f,
      name: food.name,
      calories: String(food.calories),
      glycemicIndex: String(food.glycemicIndex),
      glycemicLoad: String(food.glycemicLoad),
      carbs: String(food.carbs),
      protein: String(food.protein),
      fat: String(food.fat),
      servingSize: food.servingSize,
    }));
    setSearch(food.name);
    setShowSuggestions(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entry: FoodEntry = {
      id: generateId(),
      date: selectedDate,
      time: form.time,
      name: form.name,
      calories: Number(form.calories),
      glycemicIndex: Number(form.glycemicIndex),
      glycemicLoad: Number(form.glycemicLoad),
      carbs: Number(form.carbs),
      protein: Number(form.protein),
      fat: Number(form.fat),
      servingSize: form.servingSize,
      mealType: form.mealType,
    };
    saveFoodEntry(entry);
    onUpdate();
    setForm(emptyForm);
    setSearch('');
    setShowForm(false);
  }

  const totalCals = dayEntries.reduce((s, e) => s + e.calories, 0);
  const totalCarbs = dayEntries.reduce((s, e) => s + e.carbs, 0);
  const totalProtein = dayEntries.reduce((s, e) => s + e.protein, 0);
  const totalFat = dayEntries.reduce((s, e) => s + e.fat, 0);

  const mealGroups = (['breakfast', 'lunch', 'dinner', 'snack'] as const).map(meal => ({
    meal,
    items: dayEntries.filter(e => e.mealType === meal),
  }));

  return (
    <div className="space-y-4">
      {/* Daily macro summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Calories', value: totalCals, unit: 'kcal', color: '#f59e0b' },
          { label: 'Carbs', value: totalCarbs.toFixed(1), unit: 'g', color: '#3b82f6' },
          { label: 'Protein', value: totalProtein.toFixed(1), unit: 'g', color: '#22c55e' },
          { label: 'Fat', value: totalFat.toFixed(1), unit: 'g', color: '#f97316' },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-4" style={{ background: '#1e293b', borderLeft: `3px solid ${m.color}` }}>
            <div className="text-xs text-slate-400 mb-1">{m.label}</div>
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
            <div className="text-xs text-slate-500">{m.unit}</div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{ background: '#2563eb', color: '#fff' }}
      >
        <Plus size={16} /> Log Food
      </button>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: '#1e293b' }}>
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Apple size={18} className="text-green-400" /> Add Food Entry
          </h3>

          {/* Search / quick fill */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: '#0f172a' }}>
              <Search size={14} className="text-slate-400" />
              <input
                className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-500"
                placeholder="Search common foods to auto-fill..."
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
              />
            </div>
            {showSuggestions && search && filtered.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg overflow-hidden shadow-xl" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                {filtered.slice(0, 6).map(f => (
                  <button
                    key={f.name}
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 text-slate-300 flex justify-between"
                    onClick={() => selectFood(f)}
                  >
                    <span>{f.name}</span>
                    <span className="text-slate-500">{f.calories} kcal | GI: {f.glycemicIndex || 'N/A'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Food Name *</label>
                <input
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Oatmeal"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Serving Size</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.servingSize}
                  onChange={e => setForm(f => ({ ...f, servingSize: e.target.value }))}
                  placeholder="e.g. 1 cup"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Calories (kcal) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.calories}
                  onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Glycemic Index</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.glycemicIndex}
                  onChange={e => setForm(f => ({ ...f, glycemicIndex: e.target.value }))}
                  placeholder="0-100"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Glycemic Load</label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.glycemicLoad}
                  onChange={e => setForm(f => ({ ...f, glycemicLoad: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(['carbs', 'protein', 'fat'] as const).map(macro => (
                <div key={macro}>
                  <label className="text-xs text-slate-400 mb-1 block capitalize">{macro} (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                    style={{ background: '#0f172a', border: '1px solid #334155' }}
                    value={form[macro]}
                    onChange={e => setForm(f => ({ ...f, [macro]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Meal Type</label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.mealType}
                  onChange={e => setForm(f => ({ ...f, mealType: e.target.value as FoodEntry['mealType'] }))}
                >
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(m => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
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

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#2563eb', color: '#fff' }}
              >
                Save Entry
              </button>
              <button
                type="button"
                className="px-5 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#334155', color: '#cbd5e1' }}
                onClick={() => { setShowForm(false); setSearch(''); setForm(emptyForm); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meal groups */}
      {mealGroups.map(({ meal, items }) => items.length > 0 && (
        <div key={meal} className="rounded-xl overflow-hidden" style={{ background: '#1e293b' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderLeft: `3px solid ${MEAL_COLORS[meal]}` }}>
            <h4 className="font-semibold text-sm capitalize" style={{ color: MEAL_COLORS[meal] }}>{meal}</h4>
            <span className="text-xs text-slate-400">{items.reduce((s, e) => s + e.calories, 0)} kcal</span>
          </div>
          {items.map(entry => {
            const giCat = getGlycemicCategory(entry.glycemicIndex);
            return (
              <div key={entry.id} className="px-4 py-3 flex items-center gap-3" style={{ borderTop: '1px solid #0f172a' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{entry.name}</span>
                    {entry.servingSize && (
                      <span className="text-xs text-slate-500">• {entry.servingSize}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>{entry.calories} kcal</span>
                    <span>C: {entry.carbs}g</span>
                    <span>P: {entry.protein}g</span>
                    <span>F: {entry.fat}g</span>
                    {entry.glycemicIndex > 0 && (
                      <span style={{ color: giCat.color }}>GI: {entry.glycemicIndex} ({giCat.label})</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-600">{entry.time}</span>
                <button
                  onClick={() => { deleteFoodEntry(entry.id); onUpdate(); }}
                  className="text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {dayEntries.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-500">
          <Apple size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No food logged for this day.</p>
          <p className="text-xs mt-1">Click "Log Food" to get started.</p>
        </div>
      )}
    </div>
  );
}
