import type { FoodEntry, WorkoutEntry, WeightEntry, UserProfile, DailySummary } from '../types';
import { format, subDays, eachDayOfInterval, endOfWeek, endOfMonth, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

export function calculateBMR(profile: UserProfile): number {
  // Mifflin-St Jeor Equation
  const { gender, currentWeight, height, age } = profile;
  if (gender === 'male') {
    return 10 * currentWeight + 6.25 * height - 5 * age + 5;
  }
  return 10 * currentWeight + 6.25 * height - 5 * age - 161;
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export function calculateTDEE(profile: UserProfile): number {
  return Math.round(calculateBMR(profile) * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
}

export function calculateBMI(weight: number, height: number): number {
  return parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
}

export function getDailySummary(
  date: string,
  foodEntries: FoodEntry[],
  workoutEntries: WorkoutEntry[],
  weightEntries: WeightEntry[],
  profile: UserProfile | null
): DailySummary {
  const dayFood = foodEntries.filter(e => e.date === date);
  const dayWorkout = workoutEntries.filter(e => e.date === date);
  const dayWeight = weightEntries.find(e => e.date === date);

  const totalCaloriesConsumed = dayFood.reduce((s, e) => s + e.calories, 0);
  const totalCaloriesBurned = dayWorkout.reduce((s, e) => s + e.caloriesBurned, 0);
  const tdee = profile ? calculateTDEE(profile) : 2000;
  const netCalories = totalCaloriesConsumed - totalCaloriesBurned;
  const calorieDeficit = tdee - netCalories;

  const totalCarbs = dayFood.reduce((s, e) => s + e.carbs, 0);
  const totalProtein = dayFood.reduce((s, e) => s + e.protein, 0);
  const totalFat = dayFood.reduce((s, e) => s + e.fat, 0);

  const giEntries = dayFood.filter(e => e.glycemicIndex > 0);
  const avgGI = giEntries.length
    ? giEntries.reduce((s, e) => s + e.glycemicIndex, 0) / giEntries.length
    : 0;

  const workoutMinutes = dayWorkout.reduce((s, e) => s + e.duration, 0);
  const steps = dayWorkout.reduce((s, e) => s + (e.steps || 0), 0);

  return {
    date,
    totalCaloriesConsumed,
    totalCaloriesBurned,
    netCalories,
    calorieDeficit,
    avgGlycemicIndex: parseFloat(avgGI.toFixed(1)),
    totalCarbs: parseFloat(totalCarbs.toFixed(1)),
    totalProtein: parseFloat(totalProtein.toFixed(1)),
    totalFat: parseFloat(totalFat.toFixed(1)),
    workoutMinutes,
    steps,
    weight: dayWeight?.weight,
  };
}

export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
  );
}

export function getWeeklyData(
  foodEntries: FoodEntry[],
  workoutEntries: WorkoutEntry[],
  weightEntries: WeightEntry[],
  profile: UserProfile | null,
  weeksBack = 12
) {
  const end = new Date();
  const start = subDays(end, weeksBack * 7);
  const weeks = eachWeekOfInterval({ start, end });

  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const label = format(weekStart, 'MMM dd');

    let totalDeficit = 0;
    let totalWorkoutMins = 0;
    let totalCalories = 0;
    let totalBurned = 0;
    const weights: number[] = [];

    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const summary = getDailySummary(dateStr, foodEntries, workoutEntries, weightEntries, profile);
      totalDeficit += summary.calorieDeficit;
      totalWorkoutMins += summary.workoutMinutes;
      totalCalories += summary.totalCaloriesConsumed;
      totalBurned += summary.totalCaloriesBurned;
      if (summary.weight) weights.push(summary.weight);
    });

    return {
      label,
      avgDeficit: Math.round(totalDeficit / 7),
      totalWorkoutMins,
      avgCalories: Math.round(totalCalories / 7),
      totalBurned,
      avgWeight: weights.length ? parseFloat((weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1)) : null,
    };
  });
}

export function getMonthlyData(
  foodEntries: FoodEntry[],
  workoutEntries: WorkoutEntry[],
  weightEntries: WeightEntry[],
  profile: UserProfile | null,
  monthsBack = 12
) {
  const end = new Date();
  const months = eachMonthOfInterval({
    start: subDays(end, monthsBack * 30),
    end,
  });

  return months.map(monthStart => {
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const label = format(monthStart, 'MMM yyyy');

    let totalDeficit = 0;
    let totalWorkoutMins = 0;
    let totalCalories = 0;
    let totalBurned = 0;
    const weights: number[] = [];

    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const summary = getDailySummary(dateStr, foodEntries, workoutEntries, weightEntries, profile);
      totalDeficit += summary.calorieDeficit;
      totalWorkoutMins += summary.workoutMinutes;
      totalCalories += summary.totalCaloriesConsumed;
      totalBurned += summary.totalCaloriesBurned;
      if (summary.weight) weights.push(summary.weight);
    });

    return {
      label,
      avgDeficit: Math.round(totalDeficit / days.length),
      totalWorkoutMins,
      avgCalories: Math.round(totalCalories / days.length),
      totalBurned,
      avgWeight: weights.length ? parseFloat((weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1)) : null,
    };
  });
}

// 7700 kcal ≈ 1 kg of fat
const KCAL_PER_KG = 7700;

export function predictWeightLoss(
  currentWeight: number,
  targetWeight: number,
  avgDailyDeficit: number,
  days = 365
): { date: string; predicted: number; optimistic: number; conservative: number }[] {
  const result = [];
  const deficitPerKg = KCAL_PER_KG;
  const today = new Date();

  for (let d = 0; d <= days; d += 7) {
    const date = format(new Date(today.getTime() + d * 86400000), 'yyyy-MM-dd');
    const totalDeficit = avgDailyDeficit * d;
    const kgLost = totalDeficit / deficitPerKg;
    const predicted = Math.max(targetWeight, parseFloat((currentWeight - kgLost).toFixed(1)));
    const optimistic = Math.max(targetWeight, parseFloat((currentWeight - kgLost * 1.15).toFixed(1)));
    const conservative = Math.max(targetWeight, parseFloat((currentWeight - kgLost * 0.85).toFixed(1)));
    result.push({ date, predicted, optimistic, conservative });
    if (predicted <= targetWeight) break;
  }
  return result;
}

export function getGlycemicCategory(gi: number): { label: string; color: string } {
  if (gi === 0) return { label: 'N/A', color: '#64748b' };
  if (gi < 55) return { label: 'Low', color: '#22c55e' };
  if (gi < 70) return { label: 'Medium', color: '#f59e0b' };
  return { label: 'High', color: '#ef4444' };
}

export function estimateCaloriesBurned(
  type: string,
  duration: number,
  weight: number,
  intensity: 'low' | 'moderate' | 'high'
): number {
  // MET values
  const metMap: Record<string, Record<string, number>> = {
    running: { low: 7, moderate: 9.8, high: 12.5 },
    walking: { low: 2.8, moderate: 3.5, high: 4.5 },
    cycling: { low: 5, moderate: 7, high: 10 },
    swimming: { low: 5.5, moderate: 7, high: 10 },
    weight_training: { low: 3, moderate: 4, high: 6 },
    yoga: { low: 2, moderate: 2.5, high: 3 },
    hiit: { low: 7, moderate: 10, high: 14 },
    other: { low: 3, moderate: 5, high: 7 },
  };
  const met = metMap[type]?.[intensity] ?? 5;
  return Math.round((met * weight * duration) / 60);
}
