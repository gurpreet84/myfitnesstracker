import { supabase } from './supabase';
import type { FoodEntry, WorkoutEntry, WeightEntry, UserProfile } from '../types';

// ─── Food ─────────────────────────────────────────────────────────────────────

export async function fetchFoodEntries(userId: string): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('food_entries')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map(r => ({
    id: r.id, date: r.date, time: r.time, name: r.name,
    calories: r.calories, glycemicIndex: r.glycemic_index,
    glycemicLoad: r.glycemic_load, carbs: r.carbs,
    protein: r.protein, fat: r.fat,
    servingSize: r.serving_size, mealType: r.meal_type,
  }));
}

export async function upsertFoodEntry(userId: string, e: FoodEntry): Promise<void> {
  const { error } = await supabase.from('food_entries').upsert({
    id: e.id, user_id: userId, date: e.date, time: e.time, name: e.name,
    calories: e.calories, glycemic_index: e.glycemicIndex,
    glycemic_load: e.glycemicLoad, carbs: e.carbs, protein: e.protein,
    fat: e.fat, serving_size: e.servingSize, meal_type: e.mealType,
  });
  if (error) console.error('upsertFoodEntry:', error.message);
}

export async function removeFoodEntry(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('food_entries')
    .delete().eq('id', id).eq('user_id', userId);
  if (error) console.error('removeFoodEntry:', error.message);
}

// ─── Workout ──────────────────────────────────────────────────────────────────

export async function fetchWorkoutEntries(userId: string): Promise<WorkoutEntry[]> {
  const { data, error } = await supabase
    .from('workout_entries')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map(r => ({
    id: r.id, date: r.date, time: r.time, type: r.type, name: r.name,
    duration: r.duration, caloriesBurned: r.calories_burned,
    distance: r.distance, steps: r.steps,
    intensity: r.intensity, notes: r.notes,
  }));
}

export async function upsertWorkoutEntry(userId: string, e: WorkoutEntry): Promise<void> {
  const { error } = await supabase.from('workout_entries').upsert({
    id: e.id, user_id: userId, date: e.date, time: e.time, type: e.type,
    name: e.name, duration: e.duration, calories_burned: e.caloriesBurned,
    distance: e.distance ?? null, steps: e.steps ?? null,
    intensity: e.intensity, notes: e.notes ?? null,
  });
  if (error) console.error('upsertWorkoutEntry:', error.message);
}

export async function removeWorkoutEntry(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('workout_entries')
    .delete().eq('id', id).eq('user_id', userId);
  if (error) console.error('removeWorkoutEntry:', error.message);
}

// ─── Weight ───────────────────────────────────────────────────────────────────

export async function fetchWeightEntries(userId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, date: r.date, weight: r.weight, bmi: r.bmi }));
}

export async function upsertWeightEntry(userId: string, e: WeightEntry): Promise<void> {
  const { error } = await supabase.from('weight_entries').upsert({
    id: e.id, user_id: userId, date: e.date, weight: e.weight, bmi: e.bmi ?? null,
  });
  if (error) console.error('upsertWeightEntry:', error.message);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return {
    name: data.name, age: data.age, gender: data.gender, height: data.height,
    currentWeight: data.current_weight, targetWeight: data.target_weight,
    activityLevel: data.activity_level, dailyCalorieGoal: data.daily_calorie_goal,
    dailyCalorieDeficitGoal: data.daily_calorie_deficit_goal,
  };
}

export async function upsertProfile(userId: string, p: UserProfile): Promise<void> {
  const { error } = await supabase.from('user_profiles').upsert({
    user_id: userId, name: p.name, age: p.age, gender: p.gender, height: p.height,
    current_weight: p.currentWeight, target_weight: p.targetWeight,
    activity_level: p.activityLevel, daily_calorie_goal: p.dailyCalorieGoal,
    daily_calorie_deficit_goal: p.dailyCalorieDeficitGoal,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('upsertProfile:', error.message);
}
