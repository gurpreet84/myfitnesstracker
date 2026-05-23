import { useState } from 'react';
import { User, Save, Key, Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from '../types';
import { saveProfile, getApiKey, saveApiKey } from '../utils/storage';
import { calculateTDEE, calculateBMI } from '../utils/calculations';

interface Props {
  profile: UserProfile | null;
  onSave: () => void;
}

const DEFAULT: UserProfile = {
  name: '',
  age: 30,
  gender: 'male',
  height: 170,
  currentWeight: 80,
  targetWeight: 70,
  activityLevel: 'moderately_active',
  dailyCalorieGoal: 2000,
  dailyCalorieDeficitGoal: 500,
};

export default function ProfileSetup({ profile, onSave }: Props) {
  const [form, setForm] = useState<UserProfile>(profile || DEFAULT);
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState(getApiKey);
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const tdee = calculateTDEE(form);
  const bmi = calculateBMI(form.currentWeight, form.height);

  function set<K extends keyof UserProfile>(key: K, val: UserProfile[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const updated = { ...form, dailyCalorieGoal: tdee - form.dailyCalorieDeficitGoal };
    saveProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSave();
  }

  function handleSaveKey() {
    saveApiKey(apiKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  const activityLabels = {
    sedentary: 'Sedentary (little/no exercise)',
    lightly_active: 'Lightly active (1-3 days/week)',
    moderately_active: 'Moderately active (3-5 days/week)',
    very_active: 'Very active (6-7 days/week)',
    extra_active: 'Extra active (2x/day training)',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="rounded-xl p-5" style={{ background: '#1e293b' }}>
        <h3 className="font-semibold text-slate-200 mb-5 flex items-center gap-2">
          <User size={18} className="text-blue-400" /> Your Profile & Goals
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personal Info</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Your Name</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Age</label>
                <input type="number" min="10" max="120"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.age}
                  onChange={e => set('age', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Gender</label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.gender}
                  onChange={e => set('gender', e.target.value as UserProfile['gender'])}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Height (cm)</label>
                <input type="number" min="100" max="250"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.height}
                  onChange={e => set('height', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Current Weight (kg)</label>
                <input type="number" min="30" max="300" step="0.1"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.currentWeight}
                  onChange={e => set('currentWeight', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Goals */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Goals</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Target Weight (kg)</label>
                <input type="number" min="30" max="300" step="0.1"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.targetWeight}
                  onChange={e => set('targetWeight', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Daily Calorie Deficit Goal (kcal)</label>
                <input type="number" min="100" max="1500" step="50"
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  style={{ background: '#0f172a', border: '1px solid #334155' }}
                  value={form.dailyCalorieDeficitGoal}
                  onChange={e => set('dailyCalorieDeficitGoal', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Activity level */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Activity Level</h4>
            <div className="space-y-2">
              {(Object.entries(activityLabels) as [UserProfile['activityLevel'], string][]).map(([val, label]) => (
                <label key={val} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all"
                  style={{
                    background: form.activityLevel === val ? '#2563eb22' : '#0f172a',
                    border: `1px solid ${form.activityLevel === val ? '#2563eb' : '#334155'}`,
                  }}>
                  <input type="radio" name="activity" value={val} checked={form.activityLevel === val}
                    onChange={() => set('activityLevel', val)} className="hidden" />
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: form.activityLevel === val ? '#2563eb' : '#334155' }}>
                    {form.activityLevel === val && <div className="w-2 h-2 rounded-full" style={{ background: '#2563eb' }} />}
                  </div>
                  <span className="text-sm text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Calculated values preview */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#0f172a' }}>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Calculated Values</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'TDEE', value: `${tdee} kcal/day`, sub: 'Total daily energy', color: '#f59e0b' },
                { label: 'Calorie Goal', value: `${tdee - form.dailyCalorieDeficitGoal} kcal/day`, sub: 'To hit deficit', color: '#3b82f6' },
                { label: 'BMI', value: String(bmi), sub: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese', color: bmi < 25 ? '#22c55e' : bmi < 30 ? '#f59e0b' : '#ef4444' },
              ].map(c => (
                <div key={c.label} className="text-center">
                  <div className="text-lg font-bold" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-xs text-slate-400">{c.label}</div>
                  <div className="text-xs text-slate-600">{c.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
            style={{ background: saved ? '#22c55e' : '#2563eb', color: '#fff' }}>
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* AI API Key */}
      <div className="rounded-xl p-5" style={{ background: '#1e293b' }}>
        <h3 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <Key size={18} className="text-purple-400" /> AI Food Lookup (OpenAI API)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Enter your OpenAI API key to enable AI-powered nutritional lookup for any food not in the database.
          Your key is stored locally and never sent anywhere except OpenAI's API.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              className="w-full rounded-lg px-3 py-2 text-sm text-slate-200 outline-none pr-10"
              style={{ background: '#0f172a', border: '1px solid #334155' }}
              placeholder="sk-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              onClick={() => setShowKey(s => !s)}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleSaveKey}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: keySaved ? '#22c55e' : '#7c3aed', color: '#fff' }}
          >
            {keySaved ? 'Saved!' : 'Save Key'}
          </button>
        </div>
        {apiKey && (
          <p className="text-xs text-green-400 mt-2">
            ✓ OpenAI API key configured — AI food lookup is enabled in the Food Tracker.
          </p>
        )}
      </div>
    </div>
  );
}
