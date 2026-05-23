import type { FoodEntry, WorkoutEntry, WeightEntry, UserProfile } from '../types';
import {
  upsertFoodEntry, removeFoodEntry,
  upsertWorkoutEntry, removeWorkoutEntry,
  upsertWeightEntry, upsertProfile,
} from './db';

export const STORAGE_KEYS = {
  food: 'fit_food_entries',
  workout: 'fit_workout_entries',
  weight: 'fit_weight_entries',
  profile: 'fit_user_profile',
} as const;

// Current authenticated user — set by App on login/logout
let _uid: string | null = null;
export function setSyncUser(uid: string | null) { _uid = uid; }

function load<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; }
}
function save<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }
function loadOne<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

// ─── Food ─────────────────────────────────────────────────────────────────────
export const getFoodEntries = (): FoodEntry[] => load<FoodEntry>(STORAGE_KEYS.food);

export const saveFoodEntry = (entry: FoodEntry): void => {
  const entries = getFoodEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry; else entries.push(entry);
  save(STORAGE_KEYS.food, entries);
  if (_uid) upsertFoodEntry(_uid, entry);
};

export const deleteFoodEntry = (id: string): void => {
  save(STORAGE_KEYS.food, getFoodEntries().filter(e => e.id !== id));
  if (_uid) removeFoodEntry(_uid, id);
};

// ─── Workout ──────────────────────────────────────────────────────────────────
export const getWorkoutEntries = (): WorkoutEntry[] => load<WorkoutEntry>(STORAGE_KEYS.workout);

export const saveWorkoutEntry = (entry: WorkoutEntry): void => {
  const entries = getWorkoutEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry; else entries.push(entry);
  save(STORAGE_KEYS.workout, entries);
  if (_uid) upsertWorkoutEntry(_uid, entry);
};

export const deleteWorkoutEntry = (id: string): void => {
  save(STORAGE_KEYS.workout, getWorkoutEntries().filter(e => e.id !== id));
  if (_uid) removeWorkoutEntry(_uid, id);
};

// ─── Weight ───────────────────────────────────────────────────────────────────
export const getWeightEntries = (): WeightEntry[] => load<WeightEntry>(STORAGE_KEYS.weight);

export const saveWeightEntry = (entry: WeightEntry): void => {
  const entries = getWeightEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry; else entries.push(entry);
  save(STORAGE_KEYS.weight, entries);
  if (_uid) upsertWeightEntry(_uid, entry);
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getProfile = (): UserProfile | null => loadOne<UserProfile>(STORAGE_KEYS.profile);

export const saveProfile = (profile: UserProfile): void => {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  if (_uid) upsertProfile(_uid, profile);
};

// ─── API Key (local only, never synced) ───────────────────────────────────────
export const getApiKey = (): string => localStorage.getItem('fit_anthropic_key') ?? '';
export const saveApiKey = (key: string): void => localStorage.setItem('fit_anthropic_key', key);

// ─── Clear all local data on logout ──────────────────────────────────────────
export const clearLocalData = (): void => {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
};

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
