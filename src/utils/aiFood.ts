import Anthropic from '@anthropic-ai/sdk';

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

export async function lookupFoodNutrition(foodName: string, apiKey: string): Promise<AiFoodResult> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a nutritionist database. Return ONLY a valid JSON object (no markdown, no explanation) with nutritional info for: "${foodName}".

Use this exact structure:
{
  "name": "Full descriptive name with serving size",
  "calories": <number>,
  "glycemicIndex": <number 0-100>,
  "glycemicLoad": <number>,
  "carbs": <number in grams>,
  "protein": <number in grams>,
  "fat": <number in grams>,
  "servingSize": "standard serving description"
}

Use standard serving size (e.g. 1 cup, 100g, 1 piece). If glycemic index is not applicable (pure protein/fat), use 0.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse nutritional data from AI response');

  const data = JSON.parse(jsonMatch[0]) as AiFoodResult;

  // Validate required numeric fields
  const required: (keyof AiFoodResult)[] = ['calories', 'glycemicIndex', 'glycemicLoad', 'carbs', 'protein', 'fat'];
  for (const field of required) {
    if (typeof data[field] !== 'number' || isNaN(data[field] as number)) {
      data[field] = 0 as never;
    }
  }

  return data;
}
