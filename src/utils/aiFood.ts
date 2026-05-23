export interface AiFoodResult {
  name: string;
  calories: number;
  glycemicIndex: number;
  glycemicLoad: number;
  carbs: number;
  protein: number;
  fat: number;
  servingSize: string;
}

export async function lookupFoodNutrition(foodName: string): Promise<AiFoodResult> {
  const res = await fetch('/api/food-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foodName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Server error ${res.status}`);
  }

  const data = await res.json() as AiFoodResult;

  const required: (keyof AiFoodResult)[] = ['calories', 'glycemicIndex', 'glycemicLoad', 'carbs', 'protein', 'fat'];
  for (const field of required) {
    if (typeof data[field] !== 'number' || isNaN(data[field] as number)) {
      data[field] = 0 as never;
    }
  }

  return data;
}
