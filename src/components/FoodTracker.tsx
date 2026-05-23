import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Apple, Search, Sparkles, Loader2 } from 'lucide-react';
import type { FoodEntry } from '../types';
import { saveFoodEntry, deleteFoodEntry, generateId } from '../utils/storage';
import { getGlycemicCategory } from '../utils/calculations';
import { lookupFoodNutrition } from '../utils/aiFood';

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
  // --- Global ---
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

  // --- Indian Breads ---
  { name: 'Chapati / Roti (1 medium)', calories: 104, glycemicIndex: 62, glycemicLoad: 9, carbs: 18, protein: 3.1, fat: 2.2, servingSize: '1 medium (40g)' },
  { name: 'Paratha (plain, 1 medium)', calories: 260, glycemicIndex: 62, glycemicLoad: 15, carbs: 30, protein: 5, fat: 13, servingSize: '1 medium (80g)' },
  { name: 'Aloo Paratha (1 medium)', calories: 310, glycemicIndex: 65, glycemicLoad: 18, carbs: 36, protein: 6, fat: 14, servingSize: '1 medium (120g)' },
  { name: 'Puri (1 piece)', calories: 152, glycemicIndex: 70, glycemicLoad: 12, carbs: 18, protein: 2.5, fat: 7.5, servingSize: '1 piece (45g)' },
  { name: 'Naan (1 piece)', calories: 262, glycemicIndex: 71, glycemicLoad: 23, carbs: 45, protein: 9, fat: 5, servingSize: '1 piece (90g)' },
  { name: 'Bhatura (1 piece)', calories: 300, glycemicIndex: 70, glycemicLoad: 22, carbs: 38, protein: 7, fat: 12, servingSize: '1 piece (100g)' },
  { name: 'Missi Roti (1 piece)', calories: 130, glycemicIndex: 50, glycemicLoad: 9, carbs: 20, protein: 5, fat: 3.5, servingSize: '1 piece (50g)' },

  // --- Indian Breakfast ---
  { name: 'Idli (1 piece)', calories: 39, glycemicIndex: 35, glycemicLoad: 4, carbs: 8, protein: 2, fat: 0.1, servingSize: '1 piece (40g)' },
  { name: 'Dosa (plain, 1 medium)', calories: 133, glycemicIndex: 50, glycemicLoad: 11, carbs: 22, protein: 3, fat: 3.7, servingSize: '1 medium (86g)' },
  { name: 'Masala Dosa (1 piece)', calories: 230, glycemicIndex: 55, glycemicLoad: 16, carbs: 33, protein: 5, fat: 8, servingSize: '1 piece (140g)' },
  { name: 'Upma (1 cup)', calories: 200, glycemicIndex: 55, glycemicLoad: 12, carbs: 28, protein: 5, fat: 7, servingSize: '1 cup (200g)' },
  { name: 'Poha (1 cup)', calories: 250, glycemicIndex: 55, glycemicLoad: 15, carbs: 45, protein: 4, fat: 6, servingSize: '1 cup (180g)' },
  { name: 'Medu Vada (1 piece)', calories: 100, glycemicIndex: 42, glycemicLoad: 8, carbs: 15, protein: 3, fat: 4, servingSize: '1 piece (45g)' },
  { name: 'Uttapam (1 medium)', calories: 160, glycemicIndex: 48, glycemicLoad: 10, carbs: 25, protein: 4.5, fat: 4, servingSize: '1 medium (100g)' },
  { name: 'Besan Chilla (1 piece)', calories: 140, glycemicIndex: 35, glycemicLoad: 7, carbs: 17, protein: 7, fat: 5, servingSize: '1 piece (80g)' },
  { name: 'Pesarattu (1 piece)', calories: 120, glycemicIndex: 38, glycemicLoad: 7, carbs: 18, protein: 6, fat: 2.5, servingSize: '1 piece (75g)' },

  // --- Indian Rice Dishes ---
  { name: 'Basmati Rice (1 cup cooked)', calories: 210, glycemicIndex: 57, glycemicLoad: 25, carbs: 46, protein: 4.4, fat: 0.5, servingSize: '1 cup (180g)' },
  { name: 'Chicken Biryani (1 cup)', calories: 290, glycemicIndex: 60, glycemicLoad: 22, carbs: 40, protein: 15, fat: 8, servingSize: '1 cup (200g)' },
  { name: 'Veg Biryani (1 cup)', calories: 240, glycemicIndex: 57, glycemicLoad: 19, carbs: 42, protein: 6, fat: 6, servingSize: '1 cup (200g)' },
  { name: 'Pulao / Pilaf (1 cup)', calories: 250, glycemicIndex: 57, glycemicLoad: 20, carbs: 42, protein: 6, fat: 6, servingSize: '1 cup (185g)' },
  { name: 'Khichdi (1 cup)', calories: 210, glycemicIndex: 45, glycemicLoad: 14, carbs: 35, protein: 9, fat: 4, servingSize: '1 cup (200g)' },
  { name: 'Curd Rice (1 cup)', calories: 195, glycemicIndex: 55, glycemicLoad: 14, carbs: 32, protein: 7, fat: 4.5, servingSize: '1 cup (200g)' },
  { name: 'Lemon Rice (1 cup)', calories: 230, glycemicIndex: 68, glycemicLoad: 20, carbs: 38, protein: 4, fat: 7, servingSize: '1 cup (185g)' },

  // --- Indian Curries & Dals ---
  { name: 'Dal Tadka (1 cup)', calories: 180, glycemicIndex: 32, glycemicLoad: 7, carbs: 28, protein: 12, fat: 4, servingSize: '1 cup (200g)' },
  { name: 'Dal Makhani (1 cup)', calories: 230, glycemicIndex: 30, glycemicLoad: 7, carbs: 25, protein: 14, fat: 8, servingSize: '1 cup (200g)' },
  { name: 'Sambar (1 cup)', calories: 100, glycemicIndex: 30, glycemicLoad: 5, carbs: 15, protein: 5, fat: 2, servingSize: '1 cup (200g)' },
  { name: 'Chana Masala (1 cup)', calories: 270, glycemicIndex: 28, glycemicLoad: 11, carbs: 40, protein: 14, fat: 6, servingSize: '1 cup (200g)' },
  { name: 'Rajma (1 cup)', calories: 225, glycemicIndex: 29, glycemicLoad: 10, carbs: 40, protein: 15, fat: 1, servingSize: '1 cup (200g)' },
  { name: 'Chole Bhature (1 serving)', calories: 550, glycemicIndex: 60, glycemicLoad: 28, carbs: 70, protein: 16, fat: 22, servingSize: '1 serving (300g)' },
  { name: 'Paneer Butter Masala (1 cup)', calories: 300, glycemicIndex: 20, glycemicLoad: 4, carbs: 12, protein: 14, fat: 22, servingSize: '1 cup (200g)' },
  { name: 'Palak Paneer (1 cup)', calories: 240, glycemicIndex: 15, glycemicLoad: 2, carbs: 8, protein: 14, fat: 18, servingSize: '1 cup (200g)' },
  { name: 'Shahi Paneer (1 cup)', calories: 320, glycemicIndex: 20, glycemicLoad: 4, carbs: 14, protein: 13, fat: 24, servingSize: '1 cup (200g)' },
  { name: 'Matar Paneer (1 cup)', calories: 260, glycemicIndex: 35, glycemicLoad: 7, carbs: 16, protein: 13, fat: 17, servingSize: '1 cup (200g)' },
  { name: 'Aloo Gobi (1 cup)', calories: 180, glycemicIndex: 55, glycemicLoad: 10, carbs: 22, protein: 4, fat: 8, servingSize: '1 cup (200g)' },
  { name: 'Aloo Sabzi (1 cup)', calories: 200, glycemicIndex: 65, glycemicLoad: 16, carbs: 28, protein: 3, fat: 8, servingSize: '1 cup (200g)' },
  { name: 'Baingan Bharta (1 cup)', calories: 130, glycemicIndex: 15, glycemicLoad: 2, carbs: 12, protein: 3, fat: 7, servingSize: '1 cup (200g)' },
  { name: 'Bhindi Masala (1 cup)', calories: 150, glycemicIndex: 20, glycemicLoad: 3, carbs: 14, protein: 3.5, fat: 8, servingSize: '1 cup (200g)' },
  { name: 'Kadhi Pakora (1 cup)', calories: 185, glycemicIndex: 35, glycemicLoad: 8, carbs: 20, protein: 7, fat: 8, servingSize: '1 cup (200g)' },
  { name: 'Pav Bhaji (1 serving)', calories: 380, glycemicIndex: 65, glycemicLoad: 24, carbs: 56, protein: 9, fat: 14, servingSize: '1 serving (250g)' },

  // --- Indian Chicken / Meat ---
  { name: 'Butter Chicken (1 cup)', calories: 350, glycemicIndex: 20, glycemicLoad: 4, carbs: 14, protein: 30, fat: 20, servingSize: '1 cup (200g)' },
  { name: 'Chicken Tikka Masala (1 cup)', calories: 320, glycemicIndex: 20, glycemicLoad: 4, carbs: 14, protein: 28, fat: 18, servingSize: '1 cup (200g)' },
  { name: 'Chicken Tikka (3 pieces)', calories: 190, glycemicIndex: 0, glycemicLoad: 0, carbs: 2, protein: 28, fat: 8, servingSize: '3 pieces (120g)' },
  { name: 'Tandoori Chicken (1 leg)', calories: 165, glycemicIndex: 0, glycemicLoad: 0, carbs: 3, protein: 25, fat: 6, servingSize: '1 leg (120g)' },
  { name: 'Mutton Curry (1 cup)', calories: 320, glycemicIndex: 0, glycemicLoad: 0, carbs: 8, protein: 30, fat: 19, servingSize: '1 cup (200g)' },
  { name: 'Fish Curry (1 cup)', calories: 210, glycemicIndex: 5, glycemicLoad: 1, carbs: 6, protein: 25, fat: 9, servingSize: '1 cup (200g)' },
  { name: 'Egg Curry (1 cup, 2 eggs)', calories: 260, glycemicIndex: 10, glycemicLoad: 1, carbs: 8, protein: 16, fat: 18, servingSize: '1 cup (200g)' },
  { name: 'Keema (minced meat, 1 cup)', calories: 300, glycemicIndex: 0, glycemicLoad: 0, carbs: 10, protein: 28, fat: 17, servingSize: '1 cup (180g)' },

  // --- Indian Snacks ---
  { name: 'Samosa (1 piece)', calories: 252, glycemicIndex: 65, glycemicLoad: 25, carbs: 25, protein: 4, fat: 14, servingSize: '1 piece (100g)' },
  { name: 'Dhokla (2 pieces)', calories: 160, glycemicIndex: 35, glycemicLoad: 10, carbs: 26, protein: 7, fat: 3, servingSize: '2 pieces (100g)' },
  { name: 'Pakora / Bhajiya (1 piece)', calories: 75, glycemicIndex: 50, glycemicLoad: 6, carbs: 9, protein: 2, fat: 3.5, servingSize: '1 piece (30g)' },
  { name: 'Kachori (1 piece)', calories: 180, glycemicIndex: 65, glycemicLoad: 15, carbs: 22, protein: 4, fat: 8, servingSize: '1 piece (70g)' },
  { name: 'Pani Puri / Golgappa (6 pieces)', calories: 150, glycemicIndex: 55, glycemicLoad: 13, carbs: 26, protein: 3, fat: 4, servingSize: '6 pieces (100g)' },
  { name: 'Bhel Puri (1 cup)', calories: 180, glycemicIndex: 55, glycemicLoad: 14, carbs: 30, protein: 4, fat: 5, servingSize: '1 cup (150g)' },
  { name: 'Sev Puri (4 pieces)', calories: 200, glycemicIndex: 58, glycemicLoad: 15, carbs: 28, protein: 4, fat: 8, servingSize: '4 pieces (120g)' },
  { name: 'Vada Pav (1 piece)', calories: 300, glycemicIndex: 65, glycemicLoad: 22, carbs: 38, protein: 7, fat: 12, servingSize: '1 piece (150g)' },
  { name: 'Papdi Chaat (1 serving)', calories: 250, glycemicIndex: 58, glycemicLoad: 18, carbs: 35, protein: 8, fat: 9, servingSize: '1 serving (150g)' },
  { name: 'Dahi Puri (6 pieces)', calories: 220, glycemicIndex: 50, glycemicLoad: 14, carbs: 32, protein: 7, fat: 7, servingSize: '6 pieces (160g)' },
  { name: 'Mathri (2 pieces)', calories: 160, glycemicIndex: 60, glycemicLoad: 12, carbs: 20, protein: 3, fat: 8, servingSize: '2 pieces (50g)' },
  { name: 'Chakli (2 pieces)', calories: 140, glycemicIndex: 55, glycemicLoad: 10, carbs: 18, protein: 2.5, fat: 7, servingSize: '2 pieces (45g)' },
  { name: 'Murukku (2 pieces)', calories: 130, glycemicIndex: 52, glycemicLoad: 9, carbs: 17, protein: 2, fat: 6.5, servingSize: '2 pieces (40g)' },
  { name: 'Roasted Chana (1/4 cup)', calories: 100, glycemicIndex: 28, glycemicLoad: 6, carbs: 18, protein: 6, fat: 1.5, servingSize: '1/4 cup (40g)' },

  // --- Indian Dairy & Beverages ---
  { name: 'Paneer (100g)', calories: 265, glycemicIndex: 0, glycemicLoad: 0, carbs: 1.2, protein: 18, fat: 21, servingSize: '100g' },
  { name: 'Dahi / Curd (100g)', calories: 98, glycemicIndex: 36, glycemicLoad: 3, carbs: 7, protein: 11, fat: 4, servingSize: '100g' },
  { name: 'Sweet Lassi (1 glass)', calories: 180, glycemicIndex: 50, glycemicLoad: 12, carbs: 28, protein: 7, fat: 4, servingSize: '1 glass (250ml)' },
  { name: 'Salted Lassi (1 glass)', calories: 110, glycemicIndex: 36, glycemicLoad: 5, carbs: 12, protein: 7, fat: 3.5, servingSize: '1 glass (250ml)' },
  { name: 'Masala Chai (1 cup)', calories: 60, glycemicIndex: 50, glycemicLoad: 5, carbs: 8, protein: 3, fat: 2, servingSize: '1 cup (200ml)' },
  { name: 'Mango Lassi (1 glass)', calories: 220, glycemicIndex: 55, glycemicLoad: 16, carbs: 38, protein: 6, fat: 4, servingSize: '1 glass (250ml)' },
  { name: 'Buttermilk / Chaas (1 glass)', calories: 45, glycemicIndex: 30, glycemicLoad: 2, carbs: 5, protein: 3.5, fat: 1, servingSize: '1 glass (250ml)' },
  { name: 'Raita (1/2 cup)', calories: 75, glycemicIndex: 30, glycemicLoad: 3, carbs: 7, protein: 4, fat: 3, servingSize: '1/2 cup (100g)' },

  // --- Indian Sweets / Desserts ---
  { name: 'Gulab Jamun (1 piece)', calories: 175, glycemicIndex: 75, glycemicLoad: 20, carbs: 28, protein: 3, fat: 6, servingSize: '1 piece (60g)' },
  { name: 'Rasgulla (1 piece)', calories: 106, glycemicIndex: 60, glycemicLoad: 16, carbs: 22, protein: 4, fat: 0.5, servingSize: '1 piece (50g)' },
  { name: 'Kheer / Rice Pudding (1 cup)', calories: 220, glycemicIndex: 65, glycemicLoad: 20, carbs: 35, protein: 7, fat: 6, servingSize: '1 cup (200g)' },
  { name: 'Gajar Halwa (1 cup)', calories: 280, glycemicIndex: 65, glycemicLoad: 22, carbs: 38, protein: 5, fat: 12, servingSize: '1 cup (150g)' },
  { name: 'Sooji Halwa (1 cup)', calories: 310, glycemicIndex: 70, glycemicLoad: 25, carbs: 40, protein: 5, fat: 14, servingSize: '1 cup (150g)' },
  { name: 'Jalebi (2 pieces)', calories: 150, glycemicIndex: 75, glycemicLoad: 18, carbs: 30, protein: 1.5, fat: 4, servingSize: '2 pieces (60g)' },
  { name: 'Ladoo (besan, 1 piece)', calories: 190, glycemicIndex: 55, glycemicLoad: 14, carbs: 25, protein: 4.5, fat: 9, servingSize: '1 piece (50g)' },
  { name: 'Barfi (kaju, 1 piece)', calories: 175, glycemicIndex: 40, glycemicLoad: 11, carbs: 22, protein: 4, fat: 8, servingSize: '1 piece (40g)' },
  { name: 'Mysore Pak (1 piece)', calories: 200, glycemicIndex: 55, glycemicLoad: 15, carbs: 22, protein: 4.5, fat: 11, servingSize: '1 piece (50g)' },
  { name: 'Peda (1 piece)', calories: 120, glycemicIndex: 55, glycemicLoad: 10, carbs: 18, protein: 3, fat: 4.5, servingSize: '1 piece (35g)' },

  // --- Indian Fruits ---
  { name: 'Mango (1 cup sliced)', calories: 99, glycemicIndex: 51, glycemicLoad: 8, carbs: 25, protein: 1.4, fat: 0.6, servingSize: '1 cup (165g)' },
  { name: 'Guava (1 medium)', calories: 68, glycemicIndex: 12, glycemicLoad: 1, carbs: 14, protein: 2.6, fat: 1, servingSize: '1 medium (100g)' },
  { name: 'Papaya (1 cup)', calories: 55, glycemicIndex: 59, glycemicLoad: 5, carbs: 14, protein: 0.9, fat: 0.2, servingSize: '1 cup (145g)' },
  { name: 'Chikoo / Sapodilla (1 medium)', calories: 83, glycemicIndex: 55, glycemicLoad: 9, carbs: 20, protein: 0.4, fat: 1.1, servingSize: '1 medium (75g)' },
  { name: 'Jamun / Java Plum (1 cup)', calories: 62, glycemicIndex: 25, glycemicLoad: 3, carbs: 16, protein: 0.7, fat: 0.2, servingSize: '1 cup (130g)' },
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

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

  async function lookupWithAI() {
    const query = search.trim() || form.name.trim();
    if (!query) return;
    setAiLoading(true);
    setAiError('');
    try {
      const result = await lookupFoodNutrition(query);
      setForm(f => ({
        ...f,
        name: result.name,
        calories: String(result.calories),
        glycemicIndex: String(result.glycemicIndex),
        glycemicLoad: String(result.glycemicLoad),
        carbs: String(result.carbs),
        protein: String(result.protein),
        fat: String(result.fat),
        servingSize: result.servingSize,
      }));
      setSearch(result.name);
      setShowSuggestions(false);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI lookup failed. Check your API key.');
    } finally {
      setAiLoading(false);
    }
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
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: '#0f172a' }}>
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder-slate-500"
                  placeholder="Search foods or type any food name..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowSuggestions(true); setAiError(''); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (filtered.length === 0 && search) lookupWithAI(); } }}
                />
              </div>
              <button
                type="button"
                onClick={lookupWithAI}
                disabled={aiLoading || !search.trim()}
                title="Ask AI for nutritional values"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: '#7c3aed', color: '#fff' }}
              >
                {aiLoading
                  ? <><Loader2 size={14} className="animate-spin" /> Looking up…</>
                  : <><Sparkles size={14} /> Ask AI</>
                }
              </button>
            </div>
            {aiError && (
              <p className="text-xs text-red-400 mt-1 px-1">{aiError}</p>
            )}
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
                {filtered.length === 0 && (
                  <div className="px-4 py-3 text-xs text-slate-500 text-center">
                    Not in database — click <span className="text-purple-400 font-medium">Ask AI</span> to look up nutritional values
                  </div>
                )}
              </div>
            )}
            {showSuggestions && search && filtered.length === 0 && !aiLoading && (
              <div className="mt-1 px-3 py-2 rounded-lg text-xs text-slate-400" style={{ background: '#0f172a', border: '1px solid #334155' }}>
                "<span className="text-slate-200">{search}</span>" not found in database —
                click <span className="text-purple-400 font-medium">Ask AI</span> to auto-fill nutritional values
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
