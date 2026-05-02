export interface FoodEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM
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
  duration: number; // minutes
  caloriesBurned: number;
  distance?: number; // km
  steps?: number;
  intensity: 'low' | 'moderate' | 'high';
  notes?: string;
}

export type WorkoutType = 'running' | 'walking' | 'cycling' | 'swimming' | 'weight_training' | 'yoga' | 'hiit' | 'other';

export interface WeightEntry {
  id: string;
  date: string;
  weight: number; // kg
  bmi?: number;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number; // cm
  currentWeight: number; // kg
  targetWeight: number; // kg
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  dailyCalorieGoal: number;
  dailyCalorieDeficitGoal: number; // target deficit per day
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

export type ViewType = 'dashboard' | 'food' | 'workout' | 'trends' | 'prediction' | 'profile';
