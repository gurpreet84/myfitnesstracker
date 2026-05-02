import type { FoodEntry, WorkoutEntry, WeightEntry, UserProfile } from '../types';

const KEYS = {
  food: 'fit_food_entries',
  workout: 'fit_workout_entries',
  weight: 'fit_weight_entries',
  profile: 'fit_user_profile',
} as const;

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadOne<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Food
export const getFoodEntries = (): FoodEntry[] => load<FoodEntry>(KEYS.food);
export const saveFoodEntry = (entry: FoodEntry): void => {
  const entries = getFoodEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  save(KEYS.food, entries);
};
export const deleteFoodEntry = (id: string): void => {
  save(KEYS.food, getFoodEntries().filter(e => e.id !== id));
};

// Workout
export const getWorkoutEntries = (): WorkoutEntry[] => load<WorkoutEntry>(KEYS.workout);
export const saveWorkoutEntry = (entry: WorkoutEntry): void => {
  const entries = getWorkoutEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  save(KEYS.workout, entries);
};
export const deleteWorkoutEntry = (id: string): void => {
  save(KEYS.workout, getWorkoutEntries().filter(e => e.id !== id));
};

// Weight
export const getWeightEntries = (): WeightEntry[] => load<WeightEntry>(KEYS.weight);
export const saveWeightEntry = (entry: WeightEntry): void => {
  const entries = getWeightEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  save(KEYS.weight, entries);
};

// Profile
export const getProfile = (): UserProfile | null => loadOne<UserProfile>(KEYS.profile);
export const saveProfile = (profile: UserProfile): void => {
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
};

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
