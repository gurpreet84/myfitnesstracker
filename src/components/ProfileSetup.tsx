import { useState } from 'react';
import { User, Save } from 'lucide-react';
import type { UserProfile } from '../types';
import { saveProfile } from '../utils/storage';
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

  const activityLabels = {
    sedentary: 'Sedentary (little/no exercise)',
    lightly_active: 'Lightly active (1-3 days/week)',
    moderately_active: 'Moderately active (3-5 days/week)',
    very_active: 'Very active (6-7 days/week)',
    extra_active: 'Extra active (2x/day training)',
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="section-title" style={{ marginBottom: 20 }}>
          <User size={16} style={{ color: 'var(--blue)' }} /> Your Profile & Goals
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Basic info */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Personal Info</h4>
            <div className="grid-cols-2">
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Your Name</label>
                <input className="inp"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="label">Age</label>
                <input type="number" min="10" max="120" className="inp"
                  value={form.age}
                  onChange={e => set('age', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="inp"
                  value={form.gender}
                  onChange={e => set('gender', e.target.value as UserProfile['gender'])}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Height (cm)</label>
                <input type="number" min="100" max="250" className="inp"
                  value={form.height}
                  onChange={e => set('height', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Current Weight (kg)</label>
                <input type="number" min="30" max="300" step="0.1" className="inp"
                  value={form.currentWeight}
                  onChange={e => set('currentWeight', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Goals */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Goals</h4>
            <div className="grid-cols-2">
              <div>
                <label className="label">Target Weight (kg)</label>
                <input type="number" min="30" max="300" step="0.1" className="inp"
                  value={form.targetWeight}
                  onChange={e => set('targetWeight', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Daily Calorie Deficit Goal (kcal)</label>
                <input type="number" min="100" max="1500" step="50" className="inp"
                  value={form.dailyCalorieDeficitGoal}
                  onChange={e => set('dailyCalorieDeficitGoal', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Activity level */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Activity Level</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(Object.entries(activityLabels) as [UserProfile['activityLevel'], string][]).map(([val, label]) => (
                <label key={val} style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: 12, borderRadius: 8, transition: 'all .15s',
                    background: form.activityLevel === val ? '#2563eb22' : 'var(--card2)',
                    border: `1px solid ${form.activityLevel === val ? 'var(--blue)' : 'var(--border)'}`,
                  }}>
                  <input type="radio" name="activity" value={val} checked={form.activityLevel === val}
                    onChange={() => set('activityLevel', val)} style={{ display: 'none' }} />
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderColor: form.activityLevel === val ? 'var(--blue)' : 'var(--border)' }}>
                    {form.activityLevel === val && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />}
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text2)' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Calculated values preview */}
          <div style={{ background: 'var(--card2)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Calculated Values</h4>
            <div className="grid-cols-3">
              {[
                { label: 'TDEE', value: `${tdee} kcal/day`, sub: 'Total daily energy', color: 'var(--amber)' },
                { label: 'Calorie Goal', value: `${tdee - form.dailyCalorieDeficitGoal} kcal/day`, sub: 'To hit deficit', color: 'var(--blue)' },
                { label: 'BMI', value: String(bmi), sub: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese', color: bmi < 25 ? 'var(--green)' : bmi < 30 ? 'var(--amber)' : 'var(--red)' },
              ].map(c => (
                <div key={c.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit"
            className="btn"
            style={{ width: '100%', padding: 12, justifyContent: 'center', background: saved ? 'var(--green)' : 'var(--blue)', color: '#fff' }}>
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Profile'}
          </button>
        </form>
      </div>

    </div>
  );
}
