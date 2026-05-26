export interface FoodEntry {
  id: string;
  date: string;
  time: string;
  name: string;
  calories: number;
  glycemicIndex: number;
  glycemicLoad: number;
  carbs: number;
  protein: number;
  fat: number;
  servingSize: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface WorkoutEntry {
  id: string;
  date: string;
  time: string;
  type: WorkoutType;
  name: string;
  duration: number;
  caloriesBurned: number;
  distance?: number;
  steps?: number;
  intensity: 'low' | 'moderate' | 'high';
  notes?: string;
}

export type WorkoutType = 'running' | 'walking' | 'cycling' | 'swimming' | 'weight_training' | 'yoga' | 'hiit' | 'other';

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  bmi?: number;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number;
  currentWeight: number;
  targetWeight: number;
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  dailyCalorieGoal: number;
  dailyCalorieDeficitGoal: number;
}

export interface DailySummary {
  date: string;
  totalCaloriesConsumed: number;
  totalCaloriesBurned: number;
  netCalories: number;
  calorieDeficit: number;
  avgGlycemicIndex: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  workoutMinutes: number;
  steps: number;
  weight?: number;
}

export interface GlucoseEntry {
  id: string;
  date: string;
  time: string;
  value: number;
  context: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'random';
  notes?: string;
}

export interface MoodEntry {
  id: string;
  date: string;
  time: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export type ViewType =
  | 'dashboard' | 'food' | 'workout' | 'glucose'
  | 'trends' | 'prediction' | 'profile'
  | 'coach' | 'challenges' | 'mood';
